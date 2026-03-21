require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Fix: password_hash should be nullable (Google/OAuth users have no password)
  await client.query(`ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL`);
  console.log('Fixed: password_hash is now nullable');

  // Also change the column type from varchar to text to match the Drizzle schema
  await client.query(`ALTER TABLE public.users ALTER COLUMN password_hash TYPE text`);
  console.log('Fixed: password_hash type changed to text');

  // Verify
  const result = await client.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'password_hash'
  `);
  console.log('Verified:', JSON.stringify(result.rows[0]));

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
