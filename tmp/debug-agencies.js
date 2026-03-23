const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_d0H7KZjwvucp@ep-winter-recipe-a1jc736z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const agencies = await pool.query('SELECT id, agency_name, status, approval_status, created_at FROM agencies ORDER BY created_at DESC LIMIT 10');
  console.log('=== ALL AGENCIES (status + approval_status) ===');
  for (const r of agencies.rows) {
    console.log(`  ${r.agency_name} | status=${r.status} | approval_status=${r.approval_status} | ${r.created_at}`);
  }

  const apps = await pool.query('SELECT id, agency_name, status, created_at FROM agency_applications ORDER BY created_at DESC LIMIT 10');
  console.log('\n=== AGENCY_APPLICATIONS TABLE ===');
  console.log(apps.rows.length ? apps.rows : '  (empty)');

  const recentUsers = await pool.query("SELECT id, email, auth_role, platform_role, created_at FROM users ORDER BY created_at DESC LIMIT 5");
  console.log('\n=== RECENT USERS ===');
  for (const r of recentUsers.rows) {
    console.log(`  ${r.email} | auth_role=${r.auth_role} | platform_role=${r.platform_role} | ${r.created_at}`);
  }

  await pool.end();
}
main();
