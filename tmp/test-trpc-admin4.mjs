import { config } from "dotenv";
import { resolve } from "path";
import { SignJWT } from "jose";

config({ path: resolve(process.cwd(), ".env") });

async function run() {
  const userId = "f2f16360-ef76-4f81-a09d-39907415ea51";
  const sessionId = "e14d9174-d938-4a83-844a-f5a9daf5f31e"; // ACTIVE session from DB

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({
    role: "admin",
    email: "huiarindam6@gmail.com",
    sid: sessionId,
    deviceId: "test-device",
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER || "missu-pro")
    .setAudience(process.env.JWT_AUDIENCE || "missu-app")
    .setSubject(userId)
    .setExpirationTime("1h")
    .sign(secret);

  console.log("Testing tRPC with valid session...");

  const res = await fetch("http://localhost:4000/trpc/admin.getDashboardStatsFull", {
    headers: { "Authorization": "Bearer " + token },
  });
  console.log("Status:", res.status);
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });
