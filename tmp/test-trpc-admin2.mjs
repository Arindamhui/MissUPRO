import pg from "pg";
import { config } from "dotenv";
import { resolve } from "path";
import { SignJWT } from "jose";

config({ path: resolve(process.cwd(), ".env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const c = await pool.connect();
  try {
    // Check auth_sessions table
    const { rows: sessions } = await c.query("SELECT id, user_id, session_status, expires_at FROM auth_sessions ORDER BY created_at DESC LIMIT 5");
    console.log("Auth sessions:", sessions.length);
    for (const s of sessions) {
      console.log("  -", s.id, "user:", s.user_id, "status:", s.session_status, "expires:", s.expires_at);
    }

    // Get admin user
    const { rows } = await c.query("SELECT id, email FROM users WHERE email = 'huiarindam6@gmail.com' LIMIT 1");
    const user = rows[0];
    if (!user) { console.error("User not found"); return; }

    // Create a real session in the DB
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await c.query(
      "INSERT INTO auth_sessions (id, user_id, device_id, ip_address, user_agent, session_status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [sessionId, user.id, "test-device", "127.0.0.1", "test-script", "ACTIVE", expiresAt]
    );
    console.log("\nCreated session:", sessionId);

    // Sign token with real session
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({
      role: "admin",
      email: user.email,
      sid: sessionId,
      deviceId: "test-device",
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(process.env.JWT_ISSUER || "missu-pro")
      .setAudience(process.env.JWT_AUDIENCE || "missu-app")
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(secret);

    // Test getDashboardStatsFull
    const res = await fetch("http://localhost:4000/trpc/admin.getDashboardStatsFull", {
      headers: { "Authorization": "Bearer " + token },
    });
    console.log("\ntRPC Status:", res.status);
    const body = await res.json();
    console.log("Response:", JSON.stringify(body, null, 2));
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
