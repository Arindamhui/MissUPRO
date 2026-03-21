// Detect and add missing columns to the Neon database
import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  const client = await pool.connect();
  try {
    // Get actual columns in the users table
    const { rows: dbCols } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
    );
    const existingColumns = new Set(dbCols.map(r => r.column_name));
    console.log("Existing columns in users table:", [...existingColumns].join(", "));

    // Schema-defined columns (from packages/db/schema/users.ts)
    const schemaColumns = {
      id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
      public_user_id: "text",
      public_id: "text",
      clerk_id: "text",
      email: "text NOT NULL",
      email_verified: "boolean NOT NULL DEFAULT false",
      phone: "text",
      phone_verified: "boolean NOT NULL DEFAULT false",
      password_hash: "text",
      display_name: "text NOT NULL DEFAULT ''",
      username: "text NOT NULL DEFAULT ''",
      avatar_url: "text",
      role: "text NOT NULL DEFAULT 'USER'",
      platform_role: "text NOT NULL DEFAULT 'USER'",
      auth_role: "text",
      auth_provider: "text NOT NULL DEFAULT 'UNKNOWN'",
      auth_metadata_json: "jsonb",
      profile_data_json: "jsonb",
      status: "text NOT NULL DEFAULT 'ACTIVE'",
      country: "text NOT NULL DEFAULT ''",
      city: "text",
      preferred_locale: "text NOT NULL DEFAULT 'en'",
      preferred_timezone: "text NOT NULL DEFAULT 'UTC'",
      gender: "text",
      date_of_birth: "date",
      is_verified: "boolean NOT NULL DEFAULT false",
      vip_type: "text",
      vip_expiry: "timestamp",
      referral_code: "text NOT NULL DEFAULT ''",
      referred_by_user_id: "uuid",
      last_active_at: "timestamp",
      deleted_at: "timestamp",
      created_at: "timestamp NOT NULL DEFAULT now()",
      updated_at: "timestamp NOT NULL DEFAULT now()",
    };

    const missing = [];
    for (const [col, def] of Object.entries(schemaColumns)) {
      if (!existingColumns.has(col)) {
        missing.push({ col, def });
      }
    }

    if (missing.length === 0) {
      console.log("\n✓ All schema columns exist in the users table!");
    } else {
      console.log(`\n⚠ Missing columns (${missing.length}):`, missing.map(m => m.col).join(", "));

      for (const { col, def } of missing) {
        // For NOT NULL columns, remove NOT NULL on ALTER TABLE ADD to avoid erroring on existing rows
        const safeDef = def.replace(/NOT NULL/g, "").replace(/DEFAULT ''/, "").trim();
        const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col}" ${safeDef}`;
        console.log(`  Running: ${sql}`);
        await client.query(sql);
        console.log(`  ✓ Added ${col}`);
      }
    }

    // Also check some other commonly referenced tables
    const tablesToCheck = ["hosts", "host_applications", "agencies", "vip_subscriptions",
      "live_rooms", "payments", "coin_transactions", "gift_transactions",
      "diamond_transactions", "withdraw_requests", "agency_commission_records",
      "admins", "auth_sessions"];

    for (const table of tablesToCheck) {
      const { rows } = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
        [table]
      );
      console.log(`  Table ${table}: ${rows[0].exists ? "✓ exists" : "✗ MISSING"}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
