// Create working admin account and test admin login
const { db } = require("@missu/db");
const { sql } = require("drizzle-orm");
const crypto = require("crypto");

async function hashPassword(password) {
  // Check what hash the auth service uses - it uses bcrypt via jose or argon2
  // Let's check what the existing user passwords look like
  const sample = await db.execute(sql`
    SELECT id, email, password_hash FROM users LIMIT 3
  `);
  console.log("Sample password hashes:");
  sample.rows.forEach(r => console.log(`  ${r.email}: ${String(r.password_hash).substring(0, 20)}...`));
  return null;
}

async function main() {
  // Check what admin emails are configured
  const adminEmails = process.env.ADMIN_EMAILS;
  console.log("ADMIN_EMAILS env:", adminEmails);

  // Check if there's an admin user
  const admins = await db.execute(sql`
    SELECT id, email, role FROM users WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN' LIMIT 5
  `);
  console.log("\nExisting admin users:", admins.rows.length);
  admins.rows.forEach(r => console.log(`  ${r.email} (${r.role})`));

  // Check admins table
  const adminTable = await db.execute(sql`
    SELECT id, user_id, admin_level, is_active FROM admins LIMIT 5
  `);
  console.log("\nAdmins table entries:", adminTable.rows.length);
  adminTable.rows.forEach(r => console.log(`  user_id=${r.user_id}, level=${r.admin_level}, active=${r.is_active}`));

  // Let's look at a recently created test user's password hash format
  await hashPassword("TestPass123!");

  // Strategy: Create a new user via signup, then promote to admin
  const signupR = await fetch("http://localhost:4000/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin_test_" + Date.now() + "@missu.app",
      password: "AdminPass123!",
      displayName: "Test Admin"
    })
  });
  const signupData = await signupR.json();
  console.log("\nSignup response:", signupR.status, signupData.user?.id ? "OK" : "FAIL");

  if (!signupData.user?.id) {
    console.log("Failed to create user:", JSON.stringify(signupData).substring(0, 200));
    process.exit(1);
  }

  const userId = signupData.user.id;
  console.log("User ID:", userId);

  // Promote to ADMIN role
  await db.execute(sql`UPDATE users SET role = 'ADMIN' WHERE id = ${userId}::uuid`);
  console.log("Promoted to ADMIN role");

  // Create admin record if admins table has user_id column
  try {
    await db.execute(sql`
      INSERT INTO admins (id, user_id, admin_level, is_active, created_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, 'SUPER_ADMIN', true, now())
      ON CONFLICT DO NOTHING
    `);
    console.log("Created admins table entry");
  } catch (e) {
    console.log("Admins table insert:", e.message);
  }

  // Now test admin login
  const loginR = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: signupData.user.email || "admin_test_" + Date.now() + "@missu.app",
      password: "AdminPass123!"
    })
  });
  const loginData = await loginR.json();
  console.log("\nAdmin login:", loginR.status);

  if (loginData.token) {
    console.log("Admin token obtained!");

    // Test admin tRPC route
    const adminR = await fetch("http://localhost:4000/trpc/admin.getDashboardStats", {
      headers: { "Authorization": `Bearer ${loginData.token}` }
    });
    const adminText = await adminR.text();
    console.log("Admin dashboard stats:", adminR.status, adminText.substring(0, 200));
  } else {
    console.log("Login failed:", JSON.stringify(loginData).substring(0, 200));
  }

  process.exit(0);
}
main();
