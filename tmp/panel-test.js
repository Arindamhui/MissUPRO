// Comprehensive panel-wise API testing
const BASE = "http://localhost:4000";

async function trpc(procedure, input, token) {
  const url = `${BASE}/trpc/${procedure}`;
  const opts = { headers: {} };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  
  if (input !== undefined) {
    // mutation
    opts.method = "POST";
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(input);
  }
  
  try {
    const r = await fetch(url + (input === undefined ? "?input={}" : ""), opts);
    const d = await r.json();
    return { status: r.status, data: d?.result?.data, error: d?.error?.message || d?.error?.json?.message };
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
  const d = await r.json();
  return { token: d.token, refreshToken: d.refreshToken, userId: d.user?.id, email, sessionId: d.sessionId };
}

async function run() {
  const results = { passed: 0, failed: 0, issues: [] };
  
  function check(name, cond, detail) {
    if (cond) {
      console.log(`  [PASS] ${name}`);
      results.passed++;
    } else {
      console.log(`  [FAIL] ${name} — ${detail || "unexpected"}`);
      results.failed++;
      results.issues.push(`${name}: ${detail}`);
    }
  }
  
  // ═══════════════════════════════════════
  // USER PANEL
  // ═══════════════════════════════════════
  console.log("\n=== USER PANEL TESTING ===\n");
  
  const user = await createUser("user");
  check("User signup", !!user.token, "No token returned");

  // Profile
  let res = await trpc("users.getProfile", undefined, user.token);
  check("Get profile", res.status === 200, `Status ${res.status}: ${res.error}`);
  
  // Health
  let hr = await fetch(`${BASE}/health`);
  let hd = await hr.json();
  check("Health check", hd.status === "ok", hd.status);

  // Readiness
  hr = await fetch(`${BASE}/health/ready`);
  hd = await hr.json();
  check("Readiness check", hr.status === 200, `Status ${hr.status}`);

  // tRPC wallet
  res = await trpc("wallet.getBalance", undefined, user.token);
  check("Get wallet balance", res.status === 200, `Status ${res.status}: ${res.error}`);

  // tRPC coin packages
  res = await trpc("wallet.listCoinPackages", undefined, user.token);
  check("List coin packages", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Notifications
  res = await trpc("notifications.list", undefined, user.token);
  check("List notifications", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Discover models
  res = await trpc("discovery.getHomeFeed", undefined, user.token);
  check("Discovery home feed", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Social - followers
  res = await trpc("social.getFollowers", undefined, user.token);
  check("Get followers", res.status === 200, `Status ${res.status}: ${res.error}`);

  // VIP tiers
  res = await trpc("vip.listTiers", undefined, user.token);
  check("List VIP tiers", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Levels
  res = await trpc("levels.getCurrentLevel", undefined, user.token);
  check("Get current level", res.status === 200, `Status ${res.status}: ${res.error}`);

  // ═══════════════════════════════════════
  // ADMIN PANEL
  // ═══════════════════════════════════════
  console.log("\n=== ADMIN PANEL TESTING ===\n");

  // Login as admin (need existing admin account)
  let adminRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "huiarindam6@gmail.com", password: "TestPass123!" }),
  });
  let adminData = await adminRes.json();
  const adminToken = adminData.token;
  check("Admin login", !!adminToken, `Status ${adminRes.status}: ${JSON.stringify(adminData).substring(0, 100)}`);

  if (adminToken) {
    // Admin tRPC calls
    res = await trpc("admin.listUsers", undefined, adminToken);
    check("Admin list users", res.status === 200, `Status ${res.status}: ${res.error}`);

    res = await trpc("admin.getDashboardStats", undefined, adminToken);
    check("Admin dashboard stats", res.status === 200, `Status ${res.status}: ${res.error}`);

    res = await trpc("admin.listWithdrawals", undefined, adminToken);
    check("Admin list withdrawals", res.status === 200, `Status ${res.status}: ${res.error}`);

    res = await trpc("admin.listTransactions", undefined, adminToken);
    check("Admin list transactions", res.status === 200, `Status ${res.status}: ${res.error}`);

    res = await trpc("admin.listAgencies", undefined, adminToken);
    check("Admin list agencies", res.status === 200, `Status ${res.status}: ${res.error}`);

    res = await trpc("admin.listHosts", undefined, adminToken);
    check("Admin list hosts", res.status === 200, `Status ${res.status}: ${res.error}`);
  } else {
    console.log("  [SKIP] Admin tests — no admin account");
  }

  // ═══════════════════════════════════════
  // AGENCY PANEL
  // ═══════════════════════════════════════
  console.log("\n=== AGENCY PANEL TESTING ===\n");
  
  // Agency signup flow (tRPC)
  const agencyUser = await createUser("agency");
  check("Agency user signup", !!agencyUser.token, "No token");

  res = await trpc("auth.completeAgencySignup", {
    agencyName: "Test Agency " + Date.now(),
    contactName: "Test Contact",
    contactEmail: "agency_contact@test.com",
    country: "IN",
  }, agencyUser.token);
  check("Complete agency signup", res.status === 200 || res.error?.includes("already"), `Status ${res.status}: ${res.error}`);

  // ═══════════════════════════════════════
  // HOST PANEL (Model)
  // ═══════════════════════════════════════
  console.log("\n=== HOST PANEL TESTING ===\n");
  
  const hostUser = await createUser("host");
  check("Host user signup", !!hostUser.token, "No token");
  
  // Check call rates
  res = await trpc("calls.getRates", undefined, hostUser.token);
  check("Get call rates", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Check live stream config
  res = await trpc("live.getStreamConfig", undefined, hostUser.token);
  check("Get stream config", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Gifts catalog
  res = await trpc("gifts.getCatalog", undefined, hostUser.token);
  check("Get gift catalog", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Game types
  res = await trpc("games.listGameTypes", undefined, hostUser.token);
  check("List game types", res.status === 200, `Status ${res.status}: ${res.error}`);

  // ═══════════════════════════════════════
  // MONETIZATION
  // ═══════════════════════════════════════
  console.log("\n=== MONETIZATION TESTING ===\n");
  
  // Check coin packages exist
  res = await trpc("wallet.listCoinPackages", undefined, user.token);
  check("Coin packages available", res.status === 200, `Status ${res.status}: ${res.error}`);

  // Check earnings (host)
  res = await trpc("wallet.getEarnings", undefined, hostUser.token);
  check("Get earnings", res.status === 200, `Status ${res.status}: ${res.error}`);

  // ═══════════════════════════════════════
  // METRICS & OBSERVABILITY
  // ═══════════════════════════════════════
  console.log("\n=== METRICS & OBSERVABILITY ===\n");
  
  let mr = await fetch(`${BASE}/metrics`);
  check("Metrics endpoint", mr.status === 200, `Status ${mr.status}`);

  // ═══════════════════════════════════════
  // SECURITY TESTS
  // ═══════════════════════════════════════
  console.log("\n=== SECURITY TESTS ===\n");
  
  // Unauthenticated access to protected route
  res = await trpc("users.getProfile", undefined, null);
  check("Protected route rejects no auth", res.status !== 200, `Got ${res.status} — should be 401`);

  // Invalid token
  res = await trpc("users.getProfile", undefined, "invalid.token.here");
  check("Protected route rejects bad token", res.status !== 200, `Got ${res.status}`);

  // Security headers
  let secR = await fetch(`${BASE}/health`);
  check("X-Content-Type-Options header", secR.headers.get("x-content-type-options") === "nosniff", secR.headers.get("x-content-type-options"));
  check("X-Frame-Options header", secR.headers.get("x-frame-options") === "DENY", secR.headers.get("x-frame-options"));

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log("\n" + "=".repeat(50));
  console.log(`RESULTS: ${results.passed} PASSED | ${results.failed} FAILED`);
  if (results.issues.length > 0) {
    console.log("\nISSUES FOUND:");
    results.issues.forEach(i => console.log("  - " + i));
  }
  console.log("=".repeat(50));
}

run().catch(e => console.error("FATAL:", e));
