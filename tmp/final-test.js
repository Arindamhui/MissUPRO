const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\final-test-result.txt';
const WEB_PORT = 3010;
const API_PORT = 4000;
const METRO_PORT = 8081;

function httpGet(url, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, bodyLen: data.length, location: res.headers.location }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

function httpPost(url, body, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 300) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

async function main() {
  const lines = [];
  let pass = 0, fail = 0;

  function check(name, result, expectedStatus) {
    const ok = result.status === expectedStatus;
    if (ok) pass++; else fail++;
    lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}: status=${result.status || 'N/A'} expected=${expectedStatus} ${result.error ? 'err=' + result.error : ''} ${result.location ? '-> ' + result.location : ''}`);
  }

  lines.push(`=== FINAL COMPREHENSIVE TEST - ${new Date().toISOString()} ===`);
  lines.push('');

  // 1. API Health
  lines.push('--- API Server (port 4000) ---');
  check('API /health', await httpGet(`http://localhost:${API_PORT}/health`), 200);

  // 2. Web App Routes
  lines.push('');
  lines.push('--- Web App (port 3010) ---');
  check('Web /', await httpGet(`http://localhost:${WEB_PORT}/`), 200);
  check('Web /admin-login', await httpGet(`http://localhost:${WEB_PORT}/admin-login`), 200);
  check('Web /agency-login', await httpGet(`http://localhost:${WEB_PORT}/agency-login`), 200);
  check('Web /agency-signup', await httpGet(`http://localhost:${WEB_PORT}/agency-signup`), 200);
  check('Web /discover', await httpGet(`http://localhost:${WEB_PORT}/discover`), 200);
  check('Web /auth/pending-approval', await httpGet(`http://localhost:${WEB_PORT}/auth/pending-approval`), 200);
  
  // Protected routes should redirect
  check('Web /admin (redirect)', await httpGet(`http://localhost:${WEB_PORT}/admin`), 307);
  check('Web /admin/dashboard (redirect)', await httpGet(`http://localhost:${WEB_PORT}/admin/dashboard`), 307);
  check('Web /agency/dashboard (redirect)', await httpGet(`http://localhost:${WEB_PORT}/agency/dashboard`), 307);
  
  // API routes through web
  check('Web /api/health', await httpGet(`http://localhost:${WEB_PORT}/api/health`), 200);
  check('Web /api/auth/session (unauth)', await httpGet(`http://localhost:${WEB_PORT}/api/auth/session`), 401);
  
  // 3. Test auth endpoints
  lines.push('');
  lines.push('--- Auth API Tests ---');
  const loginResult = await httpPost(`http://localhost:${WEB_PORT}/api/auth/login`, { email: 'test@test.com', password: 'wrong' });
  check('Login (invalid creds)', loginResult, 401);
  
  const signupBadResult = await httpPost(`http://localhost:${WEB_PORT}/api/auth/signup`, { email: '', password: '' });
  check('Signup (bad input)', signupBadResult, 400);

  // 4. Metro/Expo
  lines.push('');
  lines.push('--- Metro/Expo (port 8081) ---');
  check('Metro /status', await httpGet(`http://localhost:${METRO_PORT}/status`, 10000), 200);

  // Summary
  lines.push('');
  lines.push('=== SUMMARY ===');
  lines.push(`Total: ${pass + fail} | Pass: ${pass} | Fail: ${fail}`);
  lines.push(fail === 0 ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!');

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  console.log(result);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
