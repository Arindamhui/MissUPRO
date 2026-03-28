require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  // Check coin_transactions columns
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'coin_transactions' ORDER BY ordinal_position`;
  console.log("coin_transactions columns:", cols.map(c => c.column_name).join(", "));

  // Check diamond_transactions columns  
  const dcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'diamond_transactions' ORDER BY ordinal_position`;
  console.log("diamond_transactions columns:", dcols.map(c => c.column_name).join(", "));

  // Check discovery-related tables
  const hpcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'homepage_sections' ORDER BY ordinal_position`;
  console.log("homepage_sections columns:", hpcols.map(c => c.column_name).join(", "));

  const cpcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'component_positions' ORDER BY ordinal_position`;
  console.log("component_positions columns:", cpcols.map(c => c.column_name).join(", "));
}
run().catch(e => console.error("ERROR:", e));
