import { config } from "dotenv";
import { resolve } from "path";
import { SignJWT } from "jose";

config({ path: resolve(process.cwd(), ".env") });

async function run() {
  const issuer = process.env.JWT_ISSUER || "missu-pro";
  const audience = process.env.JWT_AUDIENCE || "missu-pro-clients";
  const userId = "f2f16360-ef76-4f81-a09d-39907415ea51";
  const sessionId = "e14d9174-d938-4a83-844a-f5a9daf5f31e";

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({
    role: "USER",
    email: "huiarindam6@gmail.com",
    sid: sessionId,
    deviceId: "test-device",
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setExpirationTime("1h")
    .sign(secret);

  console.log("Testing /api/admin/dashboard-stats on port 3004...");
  const res = await fetch("http://localhost:3004/api/admin/dashboard-stats", {
    headers: { "Authorization": "Bearer " + token },
  });
  console.log("Status:", res.status);
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });
