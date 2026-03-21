const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const bcrypt = require("bcryptjs");

async function main() {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(dbUrl);

  // Set a password for the admin user so they can use email/password login too
  const hash = await bcrypt.hash("Admin@1234", 12);

  const rows = await sql`UPDATE public.users SET password_hash = ${hash}, auth_provider = 'GOOGLE' WHERE email = 'huiarindam6@gmail.com' RETURNING id, email, platform_role`;
  console.log("Updated user:", JSON.stringify(rows, null, 2));

  // Now test login via the API
  const loginRes = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "huiarindam6@gmail.com", password: "Admin@1234" }),
  });
  const loginData = await loginRes.json();
  console.log("\nLogin response status:", loginRes.status);
  console.log("Login data:", JSON.stringify(loginData, null, 2));

  if (loginData.token) {
    // Test the session endpoint (this triggers admin provisioning)
    const sessionRes = await fetch(`http://localhost:4000/auth/session?intent=login`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    const sessionData = await sessionRes.json();
    console.log("\nSession response status:", sessionRes.status);
    console.log("Session data:", JSON.stringify(sessionData, null, 2));
  }
}

main().catch(e => console.error("ERROR:", e.message));
