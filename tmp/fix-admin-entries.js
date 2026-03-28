const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  // Insert admins records for users with ADMIN role that don't have one
  await db.execute(sql`
    INSERT INTO admins (id, user_id, admin_name, admin_level, is_active, created_at, updated_at, email)
    SELECT gen_random_uuid(), u.id, u.display_name, 'SUPER_ADMIN', true, now(), now(), u.email
    FROM users u
    WHERE u.role = 'ADMIN'
      AND u.id NOT IN (SELECT user_id FROM admins WHERE user_id IS NOT NULL)
  `);

  // Also promote existing admins to SUPER_ADMIN
  await db.execute(sql`UPDATE admins SET admin_level = 'SUPER_ADMIN' WHERE admin_level = 'MODERATOR'`);

  const r = await db.execute(sql`SELECT user_id, admin_name, admin_level, email, is_active FROM admins ORDER BY created_at`);
  console.log("All admins:");
  r.rows.forEach(x => console.log(`  ${x.email} - ${x.admin_level} (active=${x.is_active})`));

  // Now test admin login with the new admin
  const email = r.rows[r.rows.length - 1]?.email;
  if (email?.includes("@missu.app")) {
    const loginR = await fetch("http://localhost:4000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "AdminPass123!" })
    });
    const loginD = await loginR.json();
    console.log("\nAdmin login:", loginR.status, loginD.token ? "TOKEN OK" : JSON.stringify(loginD).substring(0, 100));

    if (loginD.token) {
      const r = await fetch("http://localhost:4000/trpc/admin.getDashboardStats", {
        headers: { "Authorization": `Bearer ${loginD.token}` }
      });
      const text = await r.text();
      console.log("Admin dashboard:", r.status, text.substring(0, 300));
    }
  }

  process.exit(0);
}
main();
