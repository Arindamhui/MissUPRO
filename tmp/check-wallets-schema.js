const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'wallets' ORDER BY ordinal_position`
  );
  
  console.log("Wallets table columns:");
  for (const row of res.rows) {
    console.log(`  ${row.column_name}`);
  }
  
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
