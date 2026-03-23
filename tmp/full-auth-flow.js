// Full auth flow test: signup → login → session → verify
const fs = require('fs');
const http = require('http');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/full-auth-flow.txt', out.join('\n')); 
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
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
      // Capture set-cookie headers
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => d += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(d); } catch {}
        resolve({ 
          status: res.statusCode, 
          body: d, 
          json, 
          cookies,
          elapsed: Date.now() - start 
        });
      });
    });
    req.on('error', e => resolve({ error: e.message, elapsed: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', elapsed: Date.now() - start }); });
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const testEmail = `test-flow-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  log(`=== FULL AUTH FLOW TEST ===`);
  log(`Email: ${testEmail}`);
  
  // Step 1: Signup
  log(`\n--- STEP 1: SIGNUP ---`);
  const signup = await request('POST', '/api/auth/signup', {
    email: testEmail,
    password: testPassword,
    displayName: 'Flow Test User',
  });
  
  if (signup.error) {
    log(`SIGNUP FAILED: ${signup.error} (${signup.elapsed}ms)`);
    return;
  }
  
  log(`Status: ${signup.status} (${signup.elapsed}ms)`);
  if (signup.json) {
    log(`Token: ${signup.json.token ? 'present (' + signup.json.token.length + ' chars)' : 'MISSING'}`);
    log(`SessionId: ${signup.json.sessionId || 'MISSING'}`);
    log(`User: ${JSON.stringify(signup.json.user || {})}`);
    if (signup.json.error) log(`Error: ${JSON.stringify(signup.json.error)}`);
    if (signup.json.message) log(`Message: ${signup.json.message}`);
  } else {
    log(`Raw body: ${signup.body?.slice(0, 500)}`);
  }
  log(`Cookies: ${signup.cookies.length} set`);
  
  if (signup.status !== 201) {
    log(`SIGNUP DID NOT RETURN 201 - stopping`);
    // Try to extract error info
    if (signup.json?.details) log(`Details: ${JSON.stringify(signup.json.details)}`);
    return;
  }
  
  const token = signup.json?.token;
  const sessionId = signup.json?.sessionId;
  const accessCookie = signup.cookies.find(c => c.includes('access_token'));
  
  // Step 2: Login with same credentials
  log(`\n--- STEP 2: LOGIN ---`);
  const login = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: testPassword,
  });
  
  log(`Status: ${login.status} (${login.elapsed}ms)`);
  if (login.json) {
    log(`Token: ${login.json.token ? 'present' : 'MISSING'}`);
    log(`SessionId: ${login.json.sessionId || 'MISSING'}`);
    if (login.json.error) log(`Error: ${JSON.stringify(login.json.error)}`);
  }
  
  // Step 3: Session check with token
  log(`\n--- STEP 3: SESSION CHECK ---`);
  const cookieHeader = signup.cookies.map(c => c.split(';')[0]).join('; ');
  const session = await request('GET', '/api/auth/session', null, {
    'cookie': cookieHeader,
  });
  
  log(`Status: ${session.status} (${session.elapsed}ms)`);
  if (session.json) {
    log(`User: ${JSON.stringify(session.json.user || {})}`);
    log(`Auth: ${JSON.stringify(session.json.auth || {})}`);
    if (session.json.error) log(`Error: ${JSON.stringify(session.json.error)}`);
  }
  
  // Step 4: User profile
  log(`\n--- STEP 4: USER PROFILE ---`);
  const profile = await request('GET', '/api/user/me', null, {
    'cookie': cookieHeader,
  });
  
  log(`Status: ${profile.status} (${profile.elapsed}ms)`);
  if (profile.json) {
    log(`Profile: ${JSON.stringify(profile.json).slice(0, 500)}`);
  }
  
  // Step 5: Duplicate signup should fail
  log(`\n--- STEP 5: DUPLICATE SIGNUP ---`);
  const dup = await request('POST', '/api/auth/signup', {
    email: testEmail,
    password: testPassword,
    displayName: 'Duplicate User',
  });
  
  log(`Status: ${dup.status} (${dup.elapsed}ms)`);
  if (dup.json) {
    log(`Error: ${dup.json.error || dup.json.message || 'none'}`);
  }
  
  // Summary
  log(`\n=== SUMMARY ===`);
  log(`Signup: ${signup.status === 201 ? 'PASS' : 'FAIL'} (${signup.status})`);
  log(`Login: ${login.status === 200 ? 'PASS' : 'FAIL'} (${login.status})`);
  log(`Session: ${session.status === 200 ? 'PASS' : 'FAIL'} (${session.status})`);
  log(`Profile: ${profile.status === 200 ? 'PASS' : 'FAIL'} (${profile.status})`);
  log(`Dup Check: ${dup.status === 409 ? 'PASS' : 'FAIL'} (${dup.status})`);
  
  const allPass = signup.status === 201 && login.status === 200 && 
                  session.status === 200 && profile.status === 200 && dup.status === 409;
  log(`\nOVERALL: ${allPass ? 'ALL PASS ✓' : 'SOME FAILURES'}`);
  log('DONE');
}

main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); });
