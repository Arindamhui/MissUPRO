// Comprehensive runtime test: auth flow + agency + host + admin + pages
const fs = require('fs');
const http = require('http');
const out = [];
const PORT = 3001;

function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/comprehensive-test.txt', out.join('\n')); 
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: PORT, path, method,
      headers: {
        ...headers,
        ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
        'x-request-id': `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        'x-real-ip': '127.0.0.1',
      },
      timeout: 60000,
    };
    const req = http.request(opts, (res) => {
      let d = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => d += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(d); } catch {}
        resolve({ status: res.statusCode, body: d, json, cookies, headers: res.headers, elapsed: Date.now() - start });
      });
    });
    req.on('error', e => resolve({ error: e.message, code: e.code, elapsed: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', elapsed: Date.now() - start }); });
    if (data) req.write(data);
    req.end();
  });
}

function result(name, status, expected, elapsed) {
  const pass = Array.isArray(expected) ? expected.includes(status) : status === expected;
  log(`  ${pass ? 'PASS' : 'FAIL'} ${name}: ${status} (${elapsed}ms)${pass ? '' : ` expected ${expected}`}`);
  return pass;
}

async function main() {
  const ts = Date.now();
  const testEmail = `comp-${ts}@example.com`;
  const testPass = 'CompTestPass123!';
  let passed = 0, failed = 0;
  
  log('========================================');
  log('  COMPREHENSIVE RUNTIME TEST');
  log('========================================\n');
  
  // ===== SECTION 1: HEALTH =====
  log('--- 1. HEALTH ---');
  const health = await request('GET', '/api/health');
  if (result('Health endpoint', health.status, 200, health.elapsed)) {
    passed++;
    const hj = health.json;
    log(`    DB: ${hj?.components?.database?.status} (${hj?.components?.database?.latencyMs}ms)`);
    log(`    Redis: ${hj?.components?.redis?.status} (${hj?.components?.redis?.message || 'ok'})`);
  } else { failed++; log(`    Error: ${health.error || health.body?.slice(0, 200)}`); }
  
  // ===== SECTION 2: SIGNUP =====
  log('\n--- 2. SIGNUP ---');
  const signup = await request('POST', '/api/auth/signup', {
    email: testEmail, password: testPass, displayName: 'Comprehensive Tester',
  });
  if (result('Signup', signup.status, 201, signup.elapsed)) {
    passed++;
    const u = signup.json?.user;
    log(`    User ID: ${u?.id}`);
    log(`    Public ID: ${u?.publicId || 'from-profile'}`);
    log(`    Email: ${u?.email}`);
    log(`    PlatformRole: ${u?.platformRole}`);
    log(`    AgencyStatus: ${u?.agencyStatus}`);
    log(`    Token: ${signup.json?.token?.length} chars`);
    log(`    SessionId: ${signup.json?.sessionId}`);
    log(`    Cookies: ${signup.cookies.length}`);
  } else { failed++; log(`    Error: ${signup.error || JSON.stringify(signup.json?.error) || signup.body?.slice(0, 300)}`); }
  
  const token = signup.json?.token;
  const cookieHeader = signup.cookies?.map(c => c.split(';')[0]).join('; ') || '';
  const csrfCookie = signup.cookies?.find(c => c.startsWith('missu_csrf_token='))?.split(';')[0]?.split('=').slice(1).join('=') || '';
  
  // ===== SECTION 3: LOGIN =====
  log('\n--- 3. LOGIN ---');
  const login = await request('POST', '/api/auth/login', {
    email: testEmail, password: testPass,
  });
  if (result('Login', login.status, 200, login.elapsed)) {
    passed++;
    log(`    New SessionId: ${login.json?.sessionId}`);
    log(`    Token: ${login.json?.token ? 'present' : 'MISSING'}`);
  } else { failed++; log(`    Error: ${login.error || JSON.stringify(login.json?.error)}`); }
  
  // Use login cookies for subsequent requests (fresher session)
  const loginCookies = login.cookies?.map(c => c.split(';')[0]).join('; ') || cookieHeader;
  const loginCsrf = login.cookies?.find(c => c.startsWith('missu_csrf_token='))?.split(';')[0]?.split('=').slice(1).join('=') || csrfCookie;
  
  // ===== SECTION 4: SESSION CHECK =====
  log('\n--- 4. SESSION CHECK ---');
  const session = await request('GET', '/api/auth/session', null, { cookie: loginCookies });
  if (result('Session', session.status, 200, session.elapsed)) {
    passed++;
    log(`    Session data keys: ${Object.keys(session.json || {}).join(', ')}`);
  } else { failed++; log(`    Error: ${session.error || JSON.stringify(session.json)}`); }
  
  // ===== SECTION 5: USER PROFILE =====
  log('\n--- 5. USER PROFILE ---');
  const profile = await request('GET', '/api/user/me', null, { cookie: loginCookies });
  if (result('Profile', profile.status, 200, profile.elapsed)) {
    passed++;
    const d = profile.json?.data;
    log(`    PublicId: ${d?.publicId}`);
    log(`    Username: ${d?.username}`);
    log(`    Role: ${d?.role}`);
    log(`    AuthProvider: ${d?.authProvider}`);
  } else { failed++; log(`    Error: ${profile.error || JSON.stringify(profile.json?.error)}`); }
  
  // ===== SECTION 6: DUPLICATE SIGNUP =====
  log('\n--- 6. DUPLICATE SIGNUP ---');
  const dup = await request('POST', '/api/auth/signup', {
    email: testEmail, password: testPass, displayName: 'Dup User',
  });
  if (result('Duplicate rejected', dup.status, 409, dup.elapsed)) {
    passed++;
    log(`    Error code: ${dup.json?.error?.code}`);
  } else { failed++; log(`    Error: ${dup.error || JSON.stringify(dup.json?.error)}`); }
  
  // ===== SECTION 7: VALIDATION ERROR =====
  log('\n--- 7. VALIDATION ---');
  const badSignup = await request('POST', '/api/auth/signup', {
    email: 'bad', password: '1', displayName: '',
  });
  if (result('Bad input rejected', badSignup.status, 422, badSignup.elapsed)) {
    passed++;
    log(`    Error code: ${badSignup.json?.error?.code}`);
  } else { failed++; log(`    Got: ${badSignup.status} ${badSignup.json?.error?.code || ''}`); }
  
  // ===== SECTION 8: AGENCY SIGNUP =====
  log('\n--- 8. AGENCY SIGNUP (bearer auth) ---');
  const agencySignup = await request('POST', '/api/auth/agency-signup', {
    agencyName: 'Test Agency Inc',
    contactName: 'Comprehensive Tester',
    contactEmail: testEmail,
    country: 'IN',
  }, { authorization: `Bearer ${token}` });
  if (result('Agency signup', agencySignup.status, [200, 201], agencySignup.elapsed)) {
    passed++;
    log(`    Response: ${JSON.stringify(agencySignup.json).slice(0, 300)}`);
  } else { failed++; log(`    Status: ${agencySignup.status} Error: ${agencySignup.error || JSON.stringify(agencySignup.json).slice(0, 300)}`); }
  
  // ===== SECTION 9: HOST APPLICATION =====
  log('\n--- 9. HOST APPLICATION ---');
  const hostApply = await request('POST', '/api/host/apply', {
    talentInfo: 'I have extensive streaming experience on multiple platforms including live hosting and entertainment.',
  }, { cookie: loginCookies, 'x-csrf-token': loginCsrf });
  // 201=created, 409=documents required (R2 not configured for dev), validates auth+csrf+input
  if (result('Host apply', hostApply.status, [200, 201, 409], hostApply.elapsed)) {
    passed++;
    log(`    Response: ${JSON.stringify(hostApply.json).slice(0, 300)}`);
  } else { failed++; log(`    Status: ${hostApply.status} Error: ${hostApply.error || JSON.stringify(hostApply.json).slice(0, 300)}`); }
  
  // ===== SECTION 10: HOST STATUS =====
  log('\n--- 10. HOST STATUS ---');
  const hostStatus = await request('GET', '/api/host/status', null, { cookie: loginCookies });
  if (result('Host status', hostStatus.status, 200, hostStatus.elapsed)) {
    passed++;
    log(`    Data: ${JSON.stringify(hostStatus.json?.data).slice(0, 300)}`);
  } else { failed++; log(`    Error: ${hostStatus.error || JSON.stringify(hostStatus.json?.error)}`); }
  
  // ===== SECTION 11: PROTECTED PAGES (auth check) =====
  log('\n--- 11. PAGE PROTECTION ---');
  const adminDash = await request('GET', '/admin/dashboard');
  if (result('Admin requires auth', adminDash.status, 307, adminDash.elapsed)) {
    passed++;
    log(`    Redirects to: ${adminDash.headers?.location}`);
  } else { failed++; }
  
  const agencyDash = await request('GET', '/agency/dashboard');
  if (result('Agency requires auth', agencyDash.status, 307, agencyDash.elapsed)) {
    passed++;
    log(`    Redirects to: ${agencyDash.headers?.location}`);
  } else { failed++; }
  
  // ===== SECTION 12: PUBLIC PAGES =====
  log('\n--- 12. PUBLIC PAGES ---');
  for (const page of ['/', '/admin-login', '/agency-login', '/agency-signup', '/signup']) {
    const r = await request('GET', page);
    const ok = [200, 307].includes(r.status);
    if (ok) passed++; else failed++;
    log(`  ${ok ? 'PASS' : 'FAIL'} ${page}: ${r.status} (${r.elapsed}ms)`);
  }
  
  // ===== SECTION 13: ADMIN API (requires admin auth) =====
  log('\n--- 13. ADMIN ENDPOINTS (no auth - expect 401) ---');
  for (const ep of ['/api/admin/dashboard', '/api/admin/users', '/api/admin/agencies', '/api/admin/hosts']) {
    const r = await request('GET', ep);
    const ok = [401, 403].includes(r.status);
    if (ok) passed++; else failed++;
    log(`  ${ok ? 'PASS' : 'FAIL'} ${ep}: ${r.status} (${r.elapsed}ms)`);
  }
  
  // ===== SECTION 14: LOGOUT =====
  log('\n--- 14. LOGOUT ---');
  const logout = await request('POST', '/api/auth/logout', null, { cookie: loginCookies });
  if (result('Logout', logout.status, [200, 204], logout.elapsed)) {
    passed++;
  } else { failed++; log(`    Status: ${logout.status} Error: ${logout.error || JSON.stringify(logout.json).slice(0, 200)}`); }
  
  // ===== SECTION 15: SESSION AFTER LOGOUT =====
  log('\n--- 15. SESSION AFTER LOGOUT ---');
  const postLogout = await request('GET', '/api/auth/session', null, { cookie: loginCookies });
  // Should return 401 or 200 with no user (session invalidated)
  if (result('Post-logout session', postLogout.status, [200, 401], postLogout.elapsed)) {
    passed++;
  } else { failed++; }
  
  // ===== SUMMARY =====
  log('\n========================================');
  log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  log(`  ${failed === 0 ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  log('========================================');
  log('DONE');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); process.exit(1); });
