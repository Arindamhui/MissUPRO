// Audit current database state vs schema expectations
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  // Check users columns
  const userCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log("=== USERS columns ===");
  console.log(userCols.map(c => c.column_name).join(", "));

  // Check admins columns
  const adminCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'admins' ORDER BY ordinal_position`;
  console.log("\n=== ADMINS columns ===");
  console.log(adminCols.map(c => c.column_name).join(", "));

  // Check wallets columns
  const walletCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'wallets' ORDER BY ordinal_position`;
  console.log("\n=== WALLETS columns ===");
  console.log(walletCols.map(c => c.column_name).join(", "));

  // Check all tables
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log("\n=== ALL TABLES ===");
  console.log(tables.map(t => t.tablename).join(", "));

  // Check all custom enums
  const enums = await sql`SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname`;
  console.log("\n=== ALL ENUMS ===");
  console.log(enums.map(e => e.typname).join(", "));
}

run().catch(e => console.error("ERROR:", e));
