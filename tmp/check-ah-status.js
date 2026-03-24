const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const r = await pool.query(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='agency_hosts' AND column_name='status'"
  );
  console.log("agency_hosts.status:", JSON.stringify(r.rows[0]));
  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });
