const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const queries = [
    ["agency_status", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_status' ORDER BY e.enumsortorder"],
    ["agency_application_status", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_application_status' ORDER BY e.enumsortorder"],
    ["host_application_status", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='host_application_status' ORDER BY e.enumsortorder"],
    ["host_lifecycle_status", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='host_lifecycle_status' ORDER BY e.enumsortorder"],
    ["host_type", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='host_type' ORDER BY e.enumsortorder"],
    ["agency_host_status", "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_host_status' ORDER BY e.enumsortorder"],
  ];

  for (const [name, query] of queries) {
    const res = await pool.query(query);
    console.log(name + ":", res.rows.map(r => r.enumlabel).join(", ") || "(empty or missing)");
  }

  // Check the agencies.status column DDL
  const colInfo = await pool.query(
    "SELECT column_name, data_type, udt_name, column_default, is_nullable FROM information_schema.columns WHERE table_name='agencies' AND column_name='status'"
  );
  console.log("\nagencies.status column:", JSON.stringify(colInfo.rows[0]));

  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });
