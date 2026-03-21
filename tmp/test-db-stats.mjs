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
    const [users, blocked, hosts, agencies, vip] = await Promise.all([
      c.query("SELECT count(*) FROM users"),
      c.query("SELECT count(*) FROM users WHERE status = 'BANNED'"),
      c.query("SELECT count(*) FROM hosts WHERE status = 'APPROVED'"),
      c.query("SELECT count(*) FROM agencies WHERE approval_status = 'APPROVED'"),
      c.query("SELECT count(*) FROM vip_subscriptions WHERE status = 'ACTIVE'"),
    ]);

    console.log("Total users:", users.rows[0].count);
    console.log("Blocked users:", blocked.rows[0].count);
    console.log("Hosts:", hosts.rows[0].count);
    console.log("Agencies:", agencies.rows[0].count);
    console.log("VIP:", vip.rows[0].count);

    // Test SELECT * from users (what Drizzle does)
    const test = await c.query("SELECT * FROM users LIMIT 1");
    console.log("\nUser columns working:", test.fields.map(f => f.name).join(", "));
    console.log("Users found:", test.rows.length);
    if (test.rows[0]) {
      console.log("First user email:", test.rows[0].email);
      console.log("First user platformRole:", test.rows[0].platform_role);
      console.log("First user authRole:", test.rows[0].auth_role);
    }
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
