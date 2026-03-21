// Test: sign a token for the admin user, then call NestJS tRPC endpoint
import pg from "pg";
import { config } from "dotenv";
import { resolve } from "path";
import { SignJWT } from "jose";

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || "missu-pro";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "missu-app";

if (!DATABASE_URL || !JWT_SECRET) {
  console.error("Missing DATABASE_URL or JWT_SECRET");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const c = await pool.connect();
  try {
    // Get admin user
    const { rows } = await c.query("SELECT id, email, platform_role, auth_role FROM users WHERE email = 'huiarindam6@gmail.com' LIMIT 1");
    if (!rows[0]) { console.error("User not found"); return; }
    const user = rows[0];
    console.log("User:", user.id, user.email, "role:", user.platform_role, "authRole:", user.auth_role);

    // Sign a test access token (same as @missu/auth signAccessToken)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({
      role: "admin",
      email: user.email,
      sid: "test-session",
      deviceId: "test-device",
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(secret);

    console.log("\nToken created, calling NestJS tRPC...");

    // Call getDashboardStatsFull
    const res = await fetch("http://localhost:4000/trpc/admin.getDashboardStatsFull", {
      headers: { "Authorization": "Bearer " + token },
    });
    console.log("HTTP status:", res.status);
    const body = await res.text();
    console.log("Response:", body.substring(0, 2000));
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
