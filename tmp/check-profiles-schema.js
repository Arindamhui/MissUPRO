const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query(
    `SELECT column_name, is_nullable, column_default 
     FROM information_schema.columns 
     WHERE table_name = 'profiles' 
     ORDER BY ordinal_position`
  );
  
  console.log("Profiles table columns:");
  for (const row of res.rows) {
    console.log(`  ${row.column_name} | nullable=${row.is_nullable} | default=${row.column_default}`);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
