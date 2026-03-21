require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check ALL users columns for NOT NULL without defaults that could block inserts
  const result = await client.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND column_name != 'id'
    ORDER BY ordinal_position
  `);
  console.log('NOT NULL columns without defaults (potential insert blockers):');
  for (const row of result.rows) {
    console.log(`  ${row.column_name} (${row.data_type})`);
  }

  // Also check admins table
  const adminsResult = await client.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admins'
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND column_name != 'id'
    ORDER BY ordinal_position
  `);
  console.log('\nAdmins NOT NULL columns without defaults:');
  for (const row of adminsResult.rows) {
    console.log(`  ${row.column_name} (${row.data_type})`);
  }

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
