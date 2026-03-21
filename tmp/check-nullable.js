require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check users table: which columns are NOT NULL that the Drizzle schema says should be nullable
  const result = await client.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('password_hash', 'public_user_id', 'clerk_id', 'phone', 'avatar_url',
                          'city', 'gender', 'date_of_birth', 'referred_by_user_id',
                          'last_active_at', 'deleted_at', 'auth_role', 'auth_metadata_json',
                          'profile_data_json')
    ORDER BY column_name
  `);
  console.log('Nullable check for users columns:');
  console.log(JSON.stringify(result.rows, null, 2));

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
