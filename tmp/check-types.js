require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check data types for key columns that should be text but might be varchar
  const result = await client.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('email', 'username', 'display_name', 'referral_code', 'country')
    ORDER BY column_name
  `);
  console.log('Column types:');
  for (const row of result.rows) {
    console.log(`  ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''} nullable=${row.is_nullable}`);
  }

  // Check if display_name has NOT NULL
  const dnResult = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('display_name', 'country', 'referral_code')
  `);
  console.log('\nNullable check for critical insert columns:');
  for (const row of dnResult.rows) {
    console.log(`  ${row.column_name}: nullable=${row.is_nullable} default=${row.column_default}`);
  }

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
