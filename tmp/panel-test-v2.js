// Comprehensive panel-wise API test v2 — correct procedure names
const BASE = "http://localhost:4000";

async function trpcQuery(procedure, input, token) {
  const params = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
  const url = `${BASE}/trpc/${procedure}${params}`;
  const opts = { headers: {} };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  try {
    const r = await fetch(url, opts);
    const text = await r.text();
    try { const d = JSON.parse(text); return { status: r.status, data: d?.result?.data, error: d?.error?.message || d?.error?.json?.message }; }
    catch { return { status: r.status, error: `Non-JSON: ${text.substring(0, 80)}` }; }
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

async function trpcMutation(procedure, input, token) {
  const url = `${BASE}/trpc/${procedure}`;
  const opts = { method: "POST", headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  opts.body = JSON.stringify(input ?? {});
  try {
    const r = await fetch(url, opts);
    const text = await r.text();
    try { const d = JSON.parse(text); return { status: r.status, data: d?.result?.data, error: d?.error?.message || d?.error?.json?.message }; }
    catch { return { status: r.status, error: `Non-JSON: ${text.substring(0, 80)}` }; }
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

async function createUser(prefix) {
  const ts = Date.now();
  const email = `${prefix}_${ts}@test.com`;
  const r = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "TestPass123!", displayName: `${prefix} User` }),
  });
  const text = await r.text();
  try {
    const d = JSON.parse(text);
    return { token: d.token, refreshToken: d.refreshToken, userId: d.user?.id, email };
  } catch {
    console.error("createUser parse error:", text.substring(0, 200));
    return { token: null, userId: null, email };
  }
}

let passed = 0, failed = 0;
const issues = [];

function check(name, cond, detail) {
  if (cond) { console.log(`  [PASS] ${name}`); passed++; }
  else { console.log(`  [FAIL] ${name} — ${detail || "unexpected"}`); failed++; issues.push(`${name}: ${detail}`); }
}

async function run() {
  // ═══ USER PANEL ═══
  console.log("\n=== USER PANEL ===\n");
  const user = await createUser("user");
  check("User signup", !!user.token, "No token");

  let r = await trpcQuery("user.getMe", undefined, user.token);
  check("user.getMe", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("user.getMyProfile", undefined, user.token);
  check("user.getMyProfile", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("wallet.getBalance", undefined, user.token);
  check("wallet.getBalance", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("wallet.getCoinPackages", undefined, user.token);
  check("wallet.getCoinPackages", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("notification.getNotificationCenter", {}, user.token);
  check("notification.getNotificationCenter", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("discovery.getHomeFeed", undefined, user.token);
  check("discovery.getHomeFeed", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("user.listFollowers", undefined, user.token);
  check("user.listFollowers", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("vip.getAvailableTiers", undefined, user.token);
  check("vip.getAvailableTiers", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("level.myLevel", undefined, user.token);
  check("level.myLevel", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("level.listAllBadges", undefined, user.token);
  check("level.listAllBadges", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("gift.getActiveCatalog", undefined, user.token);
  check("gift.getActiveCatalog", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("social.listConversations", {}, user.token);
  check("social.listConversations", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("referral.getMyReferrals", undefined, user.token);
  check("referral.getMyReferrals", r.status === 200 || r.status === 404, `${r.status}: ${r.error}`);

  // ═══ ADMIN PANEL ═══
  console.log("\n=== ADMIN PANEL ===\n");
  // Find admin user — use tRPC to check admin routes with a regular user first
  r = await trpcQuery("admin.getDashboardStats", undefined, user.token);
  check("Admin rejects non-admin user", r.status !== 200, `Got ${r.status} — should reject`);

  // ═══ AGENCY PANEL ═══
  console.log("\n=== AGENCY PANEL ===\n");
  const agUser = await createUser("agency");
  check("Agency user signup", !!agUser.token, "No token");

  r = await trpcMutation("auth.completeAgencySignup", {
    agencyName: "Test Agency " + Date.now(),
    contactName: "Agency Contact",
    contactEmail: "agency@test.com",
    country: "IN",
  }, agUser.token);
  check("auth.completeAgencySignup", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("agency.getMySquadOverview", undefined, agUser.token);
  check("agency.getMySquadOverview", r.status === 200 || r.error?.includes("not"), `${r.status}: ${r.error}`);

  // ═══ HOST PANEL ═══
  console.log("\n=== HOST PANEL ===\n");
  const hostUser = await createUser("host");
  check("Host user signup", !!hostUser.token, "No token");

  r = await trpcQuery("calls.myCallHistory", undefined, hostUser.token);
  check("calls.myCallHistory", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("calls.getCallPricingPreview", { callType: "VIDEO", modelUserId: hostUser.userId }, hostUser.token);
  check("calls.getCallPricingPreview", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("live.getDiscoveryFeed", {}, hostUser.token);
  check("live.getDiscoveryFeed", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("game.getGameState", { sessionId: "00000000-0000-0000-0000-000000000000" }, hostUser.token);
  check("game.getGameState (not found)", r.status === 200 || r.error?.includes("not found"), `${r.status}: ${r.error}`);

  // ═══ MONETIZATION ═══
  console.log("\n=== MONETIZATION ===\n");

  r = await trpcQuery("wallet.getTopUpHistory", undefined, user.token);
  check("wallet.getTopUpHistory", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcQuery("wallet.listTransactions", undefined, user.token);
  check("wallet.listTransactions", r.status === 200, `${r.status}: ${r.error}`);

  r = await trpcMutation("wallet.requestWithdrawal", { amountDiamonds: 100, payoutMethod: "BANK_TRANSFER", payoutDetails: { accountNumber: "1234", bankName: "Test" } }, hostUser.token);
  check("withdrawal test (no balance)", r.status === 200 || r.error?.includes("balance") || r.error?.includes("model") || r.error?.includes("Insufficient") || r.error?.includes("host") || r.error?.includes("withdrawal") || r.error?.includes("eligible") || r.error?.includes("diamonds") || r.error?.includes("minimum"), `${r.status}: ${r.error}`);

  // ═══ SECURITY ═══
  console.log("\n=== SECURITY ===\n");

  r = await trpcQuery("user.getMe", undefined, null);
  check("Rejects no auth", r.status !== 200, `Got ${r.status}`);

  r = await trpcQuery("user.getMe", undefined, "bad.token.value");
  check("Rejects bad token", r.status !== 200, `Got ${r.status}`);

  r = await trpcQuery("admin.getDashboardStats", undefined, user.token);
  check("Admin RBAC - rejects regular user", r.status !== 200, `Got ${r.status}`);

  let secR = await fetch(`${BASE}/health`);
  let secT = await secR.text();
  check("X-Content-Type-Options: nosniff", secR.headers.get("x-content-type-options") === "nosniff", secR.headers.get("x-content-type-options"));
  check("X-Frame-Options: DENY", secR.headers.get("x-frame-options") === "DENY", secR.headers.get("x-frame-options"));
  check("HSTS header present", !!secR.headers.get("strict-transport-security"), "missing");

  // ═══ METRICS ═══
  console.log("\n=== OBSERVABILITY ===\n");
  let mr = await fetch(`${BASE}/metrics`);
  check("Metrics endpoint", mr.status === 200, `${mr.status}`);
  let mrText = await mr.text();
  try { let mrd = JSON.parse(mrText); check("Metrics has data", mrd.uptime > 0, `uptime=${mrd.uptime}`); }
  catch { check("Metrics returns data", mrText.length > 0, "empty response"); }

  // ═══ SUMMARY ═══
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  if (issues.length) {
    console.log("\nISSUES:");
    issues.forEach(i => console.log("  - " + i));
  }
  console.log("=".repeat(60));
}

run().catch(e => console.error("FATAL:", e));
