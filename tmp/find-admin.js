const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Check for admin users
  const admins = await pool.query(
    "SELECT u.id, u.email, u.display_name, u.platform_role, u.auth_role, u.password_hash IS NOT NULL as has_password, a.id as admin_id FROM users u LEFT JOIN admins a ON a.user_id = u.id WHERE u.platform_role = 'ADMIN' OR u.auth_role = 'admin' OR a.id IS NOT NULL ORDER BY u.created_at LIMIT 5"
  );
  console.log("=== ADMIN USERS ===");
  admins.rows.forEach((r) => console.log(`  ${r.email} | platformRole=${r.platform_role} | authRole=${r.auth_role} | hasPassword=${r.has_password} | adminId=${r.admin_id}`));

  if (admins.rows.length === 0) {
    console.log("  No admin found.");
  }

  pool.end();
})().catch((e) => { console.error(e.message); pool.end(); });
