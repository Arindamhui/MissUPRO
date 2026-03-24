const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    // 1. Check agencies table columns
    const cols = await client.query(
      "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='agencies' ORDER BY ordinal_position"
    );
    console.log("=== AGENCIES TABLE COLUMNS ===");
    cols.rows.forEach((r) => console.log("  ", r.column_name, r.data_type, r.udt_name));

    // 2. Check agency_applications table columns
    const appCols = await client.query(
      "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='agency_applications' ORDER BY ordinal_position"
    );
    console.log("\n=== AGENCY_APPLICATIONS TABLE COLUMNS ===");
    appCols.rows.forEach((r) => console.log("  ", r.column_name, r.data_type, r.udt_name));

    // 3. Check agency_hosts table columns
    const hostCols = await client.query(
      "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='agency_hosts' ORDER BY ordinal_position"
    );
    console.log("\n=== AGENCY_HOSTS TABLE COLUMNS ===");
    hostCols.rows.forEach((r) => console.log("  ", r.column_name, r.data_type, r.udt_name));

    // 4. Check if agency_application_status enum type exists
    const enumVals = await client.query(
      "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_application_status' ORDER BY e.enumsortorder"
    );
    console.log("\n=== agency_application_status ENUM ===");
    enumVals.rows.forEach((r) => console.log("  ", r.enumlabel));

    // 5. Check agency_host_status enum type
    const hostEnum = await client.query(
      "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='agency_host_status' ORDER BY e.enumsortorder"
    );
    console.log("\n=== agency_host_status ENUM ===");
    hostEnum.rows.forEach((r) => console.log("  ", r.enumlabel));

  } finally {
    client.release();
    pool.end();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  pool.end();
});
