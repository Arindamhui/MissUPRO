const http = require('http');
const fs = require('fs');
const net = require('net');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\full-verification.txt';

function tcpCheck(port) {
  return new Promise(r => {
    const s = net.createConnection({ port, timeout: 3000 });
    s.on('connect', () => { s.end(); r(true); });
    s.on('error', () => r(false));
    s.on('timeout', () => { s.destroy(); r(false); });
  });
}

function httpGet(url, timeoutMs = 60000) {
  return new Promise(r => {
    const req = http.get(url, { timeout: timeoutMs }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r({ status: res.statusCode, len: d.length, loc: res.headers.location, body: d.substring(0, 300) }));
    });
    req.on('error', e => r({ error: e.message }));
    req.on('timeout', () => { req.destroy(); r({ error: 'timeout' }); });
  });
}

function httpPost(url, body, timeoutMs = 30000) {
  return new Promise(r => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r({ status: res.statusCode, body: d.substring(0, 300) }));
    });
    req.on('error', e => r({ error: e.message }));
    req.on('timeout', () => { req.destroy(); r({ error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

async function main() {
  const lines = [];
  let pass = 0, fail = 0;

  function check(name, result, okFn) {
    const ok = okFn(result);
    if (ok) pass++; else fail++;
    lines.push(`${ok ? '✅ PASS' : '❌ FAIL'} ${name}: ${result.status || result.error || 'N/A'}${result.loc ? ' -> ' + result.loc : ''}`);
  }

  lines.push(`╔══════════════════════════════════════════════╗`);
  lines.push(`║    MissUPRO Full System Verification Test    ║`);
  lines.push(`║    ${new Date().toISOString()}       ║`);
  lines.push(`╚══════════════════════════════════════════════╝`);
  lines.push('');

  // 1. Port connectivity
  lines.push('─── PORT CONNECTIVITY ───');
  for (const [port, name] of [[4000, 'API'], [3001, 'Web'], [8081, 'Metro']]) {
    const open = await tcpCheck(port);
    if (open) pass++; else fail++;
    lines.push(`${open ? '✅ PASS' : '❌ FAIL'} ${name} (port ${port}): ${open ? 'LISTENING' : 'DOWN'}`);
  }

  // 2. API Server
  lines.push('');
  lines.push('─── API SERVER (port 4000) ───');
  check('GET /health', await httpGet('http://localhost:4000/health'), r => r.status === 200);

  // 3. Web App - Public pages
  lines.push('');
  lines.push('─── WEB APP - PUBLIC PAGES ───');
  check('GET /', await httpGet('http://localhost:3001/'), r => r.status === 200);
  check('GET /admin-login', await httpGet('http://localhost:3001/admin-login'), r => r.status === 200);
  check('GET /agency-login', await httpGet('http://localhost:3001/agency-login'), r => r.status === 200);
  check('GET /agency-signup', await httpGet('http://localhost:3001/agency-signup'), r => r.status === 200);
  check('GET /discover', await httpGet('http://localhost:3001/discover'), r => r.status === 200);
  check('GET /auth/pending-approval', await httpGet('http://localhost:3001/auth/pending-approval'), r => r.status === 200);

  // 4. Web App - Auth protection
  lines.push('');
  lines.push('─── WEB APP - AUTH PROTECTION ───');
  check('GET /admin -> redirect', await httpGet('http://localhost:3001/admin'), r => r.status === 307);
  check('GET /admin/dashboard -> redirect', await httpGet('http://localhost:3001/admin/dashboard'), r => r.status === 307);
  check('GET /admin/users -> redirect', await httpGet('http://localhost:3001/admin/users'), r => r.status === 307);
  check('GET /admin/settings -> redirect', await httpGet('http://localhost:3001/admin/settings'), r => r.status === 307);
  check('GET /agency/dashboard -> redirect', await httpGet('http://localhost:3001/agency/dashboard'), r => r.status === 307);
  check('GET /agency/models -> redirect', await httpGet('http://localhost:3001/agency/models'), r => r.status === 307);

  // 5. Web App - API routes
  lines.push('');
  lines.push('─── WEB APP - API ROUTES ───');
  check('GET /api/health', await httpGet('http://localhost:3001/api/health'), r => r.status === 200);
  check('GET /api/auth/session (unauth)', await httpGet('http://localhost:3001/api/auth/session'), r => r.status === 401);

  // 6. Auth validation
  lines.push('');
  lines.push('─── AUTH VALIDATION ───');
  check('POST /api/auth/login (bad)', await httpPost('http://localhost:3001/api/auth/login', { email: '', password: '' }), r => r.status >= 400 && r.status < 500);
  check('POST /api/auth/signup (bad)', await httpPost('http://localhost:3001/api/auth/signup', { email: '', password: '' }), r => r.status >= 400 && r.status < 500);

  // 7. Google OAuth endpoint
  lines.push('');
  lines.push('─── GOOGLE OAUTH ───');
  check('POST /api/auth/google (no token)', await httpPost('http://localhost:3001/api/auth/google', { idToken: '' }), r => r.status >= 400 && r.status < 500);

  // 8. Metro/Expo
  lines.push('');
  lines.push('─── METRO/EXPO (port 8081) ───');
  check('GET /status', await httpGet('http://localhost:8081/status', 10000), r => r.status === 200);

  // Summary
  lines.push('');
  lines.push('═══════════════════════════════════════');
  lines.push(`TOTAL: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  lines.push(fail === 0 ? '🎉 ALL TESTS PASSED!' : `⚠️  ${fail} TEST(S) FAILED`);
  lines.push('═══════════════════════════════════════');

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  console.log(result);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  const msg = 'FATAL: ' + e.message;
  fs.writeFileSync(OUTPUT, msg);
  console.error(msg);
  process.exit(1);
});
