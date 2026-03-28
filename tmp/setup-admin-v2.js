const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");

async function main() {
  // Check user_role enum values
  const enumVals = await db.execute(sql`
    SELECT unnest(enum_range(null::user_role)) as val
  `);
  console.log("user_role enum values:", enumVals.rows.map(r => r.val));

  // Check existing admin users
  const admins = await db.execute(sql`
    SELECT id, email, role FROM users WHERE role = 'ADMIN' LIMIT 5
  `);
  console.log("Existing admin users:", admins.rows);

  // Check admins table
  const adminTable = await db.execute(sql`
    SELECT * FROM admins LIMIT 5
  `);
  console.log("Admins table:", adminTable.rows);

  // Check admin_level enum if exists
  try {
    const alEnum = await db.execute(sql`SELECT unnest(enum_range(null::admin_level)) as val`);
    console.log("admin_level enum values:", alEnum.rows.map(r => r.val));
  } catch (e) {
    console.log("admin_level enum:", e.message);
  }

  // Create admin account: signup + promote
  const ts = Date.now();
  const email = `admin_${ts}@missu.app`;
  const signupR = await fetch("http://localhost:4000/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "AdminPass123!", displayName: "Test Admin" })
  });
  const signupD = await signupR.json();
  console.log("\nSignup:", signupR.status, signupD.user?.id ? "OK" : JSON.stringify(signupD).substring(0, 100));
  if (!signupD.user?.id) { process.exit(1); }

  const userId = signupD.user.id;

  // Promote to ADMIN (which is a valid enum value)
  await db.execute(sql`UPDATE users SET role = 'ADMIN' WHERE id = ${userId}::uuid`);
  console.log("Promoted to ADMIN");

  // Create admins table entry
  try {
    await db.execute(sql`
      INSERT INTO admins (id, user_id, admin_level, is_active, created_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, 'SUPER_ADMIN', true, now())
      ON CONFLICT DO NOTHING
    `);
    console.log("Admins table entry created");
  } catch (e) {
    // Try without admin_level if it fails
    try {
      await db.execute(sql`
        INSERT INTO admins (id, user_id, is_active, created_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, true, now())
        ON CONFLICT DO NOTHING
      `);
      console.log("Admins table entry created (no level)");
    } catch (e2) {
      console.log("Could not create admins entry:", e2.message);
    }
  }

  // Test login
  const loginR = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "AdminPass123!" })
  });
  const loginD = await loginR.json();
  console.log("Login:", loginR.status, loginD.token ? "TOKEN OK" : JSON.stringify(loginD).substring(0, 100));

  if (loginD.token) {
    // Test admin endpoint
    const r = await fetch("http://localhost:4000/trpc/admin.getDashboardStats", {
      headers: { "Authorization": `Bearer ${loginD.token}` }
    });
    const t = await r.text();
    console.log("Admin dashboard:", r.status, t.substring(0, 300));

    console.log(`\n=== ADMIN CREDENTIALS ===`);
    console.log(`Email: ${email}`);
    console.log(`Password: AdminPass123!`);
    console.log(`Token: ${loginD.token.substring(0, 40)}...`);
  }

  process.exit(0);
}
main();
