const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_d0H7KZjwvucp@ep-winter-recipe-a1jc736z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const apps = await pool.query('SELECT id, agency_name, applicant_user_id, status, created_at FROM agency_applications ORDER BY created_at DESC LIMIT 10');
    console.log('=== AGENCY_APPLICATIONS ===');
    console.log(JSON.stringify(apps.rows, null, 2));

    const users = await pool.query("SELECT id, email, display_name, auth_role, platform_role, created_at FROM users WHERE auth_role = 'agency' OR platform_role = 'AGENCY' ORDER BY created_at DESC LIMIT 10");
    console.log('\n=== AGENCY USERS ===');
    console.log(JSON.stringify(users.rows, null, 2));

    const recent = await pool.query("SELECT id, email, display_name, auth_role, platform_role, created_at FROM users ORDER BY created_at DESC LIMIT 5");
    console.log('\n=== MOST RECENT USERS ===');
    console.log(JSON.stringify(recent.rows, null, 2));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
main();
