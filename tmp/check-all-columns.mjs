import pg from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const c = await pool.connect();
  try {
    const tables = [
      "users", "hosts", "host_applications", "agencies", "vip_subscriptions",
      "live_rooms", "payments", "coin_transactions", "gift_transactions",
      "diamond_transactions", "withdraw_requests", "agency_commission_records",
      "auth_sessions", "admins",
    ];

    for (const table of tables) {
      const { rows: cols } = await c.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      if (cols.length === 0) {
        console.log(`\n${table}: TABLE NOT FOUND`);
      } else {
        console.log(`\n${table}: ${cols.map(r => r.column_name).join(", ")}`);
      }
    }
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
