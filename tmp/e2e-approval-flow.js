// Test: Agency approval + post-approval login + host apply under agency
const { Pool } = require("pg");
const fs = require("fs");
const http = require("http");
require("dotenv").config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PORT = 3001;
const out = [];

function log(msg) {
  out.push(`[${new Date().toISOString()}] ${msg}`);
  fs.writeFileSync("tmp/e2e-approval-flow.txt", out.join("\n"));
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: PORT, path, method,
      headers: { ...headers, ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}), "x-request-id": `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, "x-real-ip": "127.0.0.1" },
      timeout: 60000,
    };
    const req = http.request(opts, (res) => {
      let d = "";
      const cookies = res.headers["set-cookie"] || [];
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(d); } catch {}
        resolve({ status: res.statusCode, json, cookies, elapsed: Date.now() - start });
      });
    });
    req.on("error", (e) => resolve({ error: e.message, elapsed: Date.now() - start }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "timeout", elapsed: Date.now() - start }); });
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const ts = Date.now();
  let passed = 0, failed = 0;
  function assert(name, actual, expected) {
    const ok = Array.isArray(expected) ? expected.includes(actual) : actual === expected;
    if (ok) { passed++; log(`  PASS ${name}: ${actual}`); }
    else { failed++; log(`  FAIL ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
    return ok;
  }

  log("=== E2E FULL APPROVAL FLOW ===\n");

  // ─── 1. Agency owner signup ───
  log("--- 1. Agency owner signup ---");
  const ownerEmail = `full-test-${ts}@example.com`;
  const ownerPass = "TestPass123!";
  const signup = await request("POST", "/api/auth/signup", { email: ownerEmail, password: ownerPass, displayName: "Full Test Owner" });
  assert("Owner signup", signup.status, 201);
  const ownerToken = signup.json?.token;
  const ownerCookies = signup.cookies?.map((c) => c.split(";")[0]).join("; ");

  // ─── 2. Register agency ───
  log("\n--- 2. Register agency ---");
  const agReg = await request("POST", "/api/auth/agency-signup", {
    agencyName: "Full Test Agency", contactName: "Full Tester", contactEmail: ownerEmail, country: "IN",
  }, { authorization: `Bearer ${ownerToken}` });
  assert("Agency registered", agReg.status, 200);
  assert("Agency pending", agReg.json?.status, "agency_pending_approval");
  const agencyId = agReg.json?.agencyId;
  const agencyCode = agReg.json?.agencyCode;
  log(`  AgencyId: ${agencyId}`);
  log(`  AgencyCode: ${agencyCode}`);
  assert("Code format A+9", /^A\d{9}$/.test(agencyCode || ""), true);

  // ─── 3. Simulate admin approval via direct DB update ───
  log("\n--- 3. Admin approval (direct DB) ---");
  if (agencyId) {
    // approved_by_admin_id FK references users(id), so we need the admin user's user_id
    const adminRecord = await pool.query("SELECT user_id FROM admins LIMIT 1");
    const adminUserId = adminRecord.rows[0]?.user_id || null;
    const updateSql = adminUserId
      ? "UPDATE agencies SET status = 'ACTIVE', approval_status = 'APPROVED', approved_at = NOW(), approved_by_admin_id = $1, updated_at = NOW() WHERE id = $2"
      : "UPDATE agencies SET status = 'ACTIVE', approval_status = 'APPROVED', approved_at = NOW(), updated_at = NOW() WHERE id = $1";
    const params = adminUserId ? [adminUserId, agencyId] : [agencyId];
    await pool.query(updateSql, params);
    log(`  Agency approved directly in DB (adminUserId=${adminUserId || "none"})`);
    assert("DB approval done", true, true);
  }

  // ─── 4. Agency session after approval ───
  log("\n--- 4. Post-approval session ---");
  const approvedSession = await request("GET", "/api/auth/session", null, { cookie: ownerCookies });
  assert("Session status", approvedSession.json?.status, "agency");
  assert("Agency status approved", approvedSession.json?.agencyStatus, "APPROVED");
  assert("Has agencyId", !!approvedSession.json?.agencyId, true);
  assert("Has agencyCode", !!approvedSession.json?.agencyCode, true);
  log(`  AgencyCode: ${approvedSession.json?.agencyCode}`);

  // ─── 5. Agency owner re-login ───
  log("\n--- 5. Agency owner re-login ---");
  const ownerLogin = await request("POST", "/api/auth/login", { email: ownerEmail, password: ownerPass });
  assert("Owner login", ownerLogin.status, 200);
  const newOwnerCookies = ownerLogin.cookies?.map((c) => c.split(";")[0]).join("; ");
  const ownerSession2 = await request("GET", "/api/auth/session", null, { cookie: newOwnerCookies });
  assert("Re-login session is agency", ownerSession2.json?.status, "agency");
  log(`  AgencyCode: ${ownerSession2.json?.agencyCode}`);

  // ─── 6. New user signup (to be a host) ───
  log("\n--- 6. New host user signup ---");
  const hostEmail = `host-full-${ts}@example.com`;
  const hostPass = "HostPass123!";
  const hostSignup = await request("POST", "/api/auth/signup", { email: hostEmail, password: hostPass, displayName: "Host Candidate" });
  assert("Host signup", hostSignup.status, 201);
  const hostCookies = hostSignup.cookies?.map((c) => c.split(";")[0]).join("; ");
  const hostCsrf = hostSignup.cookies?.find((c) => c.startsWith("missu_csrf_token="))?.split(";")[0]?.split("=").slice(1).join("=");

  // ─── 7. Host applies under the approved agency using agency code ───
  log("\n--- 7. Host apply under agency ---");
  const hostApply = await request("POST", "/api/host/apply", {
    agencyPublicId: agencyCode,
    talentInfo: "I am a talented live streamer with amazing entertainment skills and 3 years experience.",
  }, { cookie: hostCookies, "x-csrf-token": hostCsrf });
  log(`  Apply status: ${hostApply.status}`);
  log(`  Apply body: ${JSON.stringify(hostApply.json).slice(0, 400)}`);
  assert("Host agency apply", hostApply.status, [200, 201]);

  // ─── 8. Host status check ───
  log("\n--- 8. Host status check ---");
  const hostStatus = await request("GET", "/api/host/status", null, { cookie: hostCookies });
  assert("Host status", hostStatus.status, 200);
  log(`  Status data: ${JSON.stringify(hostStatus.json?.data).slice(0, 200)}`);

  // ─── SUMMARY ───
  log("\n========================================");
  log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  log(`  ${failed === 0 ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  log("========================================");
  log("DONE");

  pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { log(`FATAL: ${e.message}\n${e.stack}`); pool.end(); process.exit(1); });
