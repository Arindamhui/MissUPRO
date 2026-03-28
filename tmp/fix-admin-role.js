const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
async function main() {
  // Check what columns users table actually has for role
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name LIKE '%role%'
    ORDER BY ordinal_position
  `);
  console.log("Role columns:", cols.rows.map(r => r.column_name));

  // Check admin user's role columns
  const admin = await db.execute(sql`
    SELECT id, email, role, platform_role, auth_role FROM users WHERE role = 'ADMIN' LIMIT 3
  `);
  console.log("\nAdmin users role fields:");
  admin.rows.forEach(r => console.log(`  ${r.email}: role=${r.role}, platform_role=${r.platform_role}, auth_role=${r.auth_role}`));

  // Check enum values
  try {
    const pr = await db.execute(sql`SELECT unnest(enum_range(null::platform_role)) as val`);
    console.log("\nplatform_role enum:", pr.rows.map(r => r.val));
  } catch (e) { console.log("No platform_role enum:", e.message); }
  
  try {
    const ar = await db.execute(sql`SELECT unnest(enum_range(null::auth_role)) as val`);
    console.log("auth_role enum:", ar.rows.map(r => r.val));
  } catch (e) { console.log("No auth_role enum:", e.message); }

  // Fix: Set platform_role = 'ADMIN' and auth_role = 'admin' for admin users
  try {
    await db.execute(sql`
      UPDATE users SET platform_role = 'ADMIN', auth_role = 'admin' WHERE role = 'ADMIN' AND (platform_role IS NULL OR platform_role != 'ADMIN')
    `);
    console.log("\nUpdated platform_role/auth_role for admin users");
  } catch (e) {
    console.log("\nFailed to update:", e.message);
    // Maybe columns don't exist
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role text DEFAULT 'USER'`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_role text`);
      await db.execute(sql`UPDATE users SET platform_role = 'ADMIN', auth_role = 'admin' WHERE role = 'ADMIN'`);
      console.log("Added and updated role columns");
    } catch(e2) { console.log("Failed:", e2.message); }
  }

  // Verify
  const verify = await db.execute(sql`
    SELECT email, role, platform_role, auth_role FROM users WHERE role = 'ADMIN' LIMIT 5
  `);
  console.log("\nVerified admin users:");
  verify.rows.forEach(r => console.log(`  ${r.email}: role=${r.role}, platform_role=${r.platform_role}, auth_role=${r.auth_role}`));

  // Now test admin login
  const loginR = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: verify.rows[verify.rows.length - 1]?.email, password: "AdminPass123!" })
  });
  const loginD = await loginR.json();
  console.log("\nLogin:", loginR.status, loginD.token ? "TOKEN OK" : JSON.stringify(loginD).substring(0, 100));

  if (loginD.token) {
    const r = await fetch("http://localhost:4000/trpc/admin.getDashboardStats", {
      headers: { "Authorization": `Bearer ${loginD.token}` }
    });
    const t = await r.text();
    console.log("Admin dashboard:", r.status, t.substring(0, 300));
  }

  process.exit(0);
}
main();
