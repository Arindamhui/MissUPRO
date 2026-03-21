require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get ALL columns for every table the auth flow touches
  const tables = ['users', 'profiles', 'admins', 'agencies', 'agency_hosts', 'auth_sessions', 'security_events', 'email_verifications', 'audit_logs', 'models'];
  
  for (const table of tables) {
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    if (result.rows.length === 0) {
      console.log(`\n${table}: TABLE DOES NOT EXIST`);
    } else {
      console.log(`\n${table}: ${result.rows.map(r => r.column_name).join(', ')}`);
    }
  }

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
