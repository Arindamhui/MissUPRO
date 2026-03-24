const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const res = await pool.query(
    "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_status' ORDER BY e.enumsortorder"
  );
  console.log("agency_status enum values:");
  res.rows.forEach((r) => console.log("  ", r.enumlabel));
  pool.end();
})().catch((e) => { console.error(e.message); pool.end(); });
