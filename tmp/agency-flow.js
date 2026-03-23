// Agency signup flow test
const fs = require('fs');
const http = require('http');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/agency-flow.txt', out.join('\n')); 
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
        'x-request-id': `agency-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        resolve({ status: res.statusCode, body: d, json, cookies, elapsed: Date.now() - start });
      });
    });
    req.on('error', e => resolve({ error: e.message, elapsed: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', elapsed: Date.now() - start }); });
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const agencyEmail = `agency-${Date.now()}@example.com`;
  
  log('=== AGENCY FLOW TEST ===');
  
  // Step 1: Regular signup first (agency owner needs an account)
  log('\n--- STEP 1: SIGNUP ---');
  const signup = await request('POST', '/api/auth/signup', {
    email: agencyEmail,
    password: 'AgencyPassword123!',
    displayName: 'Agency Owner Test',
  });
  
  if (signup.error || signup.status !== 201) {
    log(`Signup failed: ${signup.error || signup.status} ${signup.json?.error?.message || ''}`);
    log('DONE_FAIL');
    return;
  }
  
  log(`Signup OK: ${signup.status} (${signup.elapsed}ms)`);
  const token = signup.json.token;
  const cookieHeader = signup.cookies.map(c => c.split(';')[0]).join('; ');
  const csrfCookie = signup.cookies.find(c => c.startsWith('csrf_token='))?.split(';')[0]?.split('=')[1];
  log(`Token: ${token ? token.length + ' chars' : 'MISSING'}`);
  log(`CSRF: ${csrfCookie ? 'present' : 'MISSING'}`);
  
  // Step 2: Agency signup (create an agency)
  log('\n--- STEP 2: AGENCY SIGNUP ---');
  const agencySignup = await request('POST', '/api/auth/agency-signup', {
    email: agencyEmail,
    password: 'AgencyPassword123!',
    agencyName: 'Test Agency Corp',
    contactName: 'Agency Owner Test',
    contactPhone: '+1234567890',
    businessType: 'TALENT_MANAGEMENT',
  });
  
  log(`Status: ${agencySignup.status} (${agencySignup.elapsed}ms)`);
  if (agencySignup.json) {
    log(`Response: ${JSON.stringify(agencySignup.json).slice(0, 500)}`);
  }
  
  // Step 3: Check host apply endpoint
  log('\n--- STEP 3: HOST APPLICATION ---');
  const hostApply = await request('POST', '/api/host/apply', {
    requestType: 'PLATFORM',
    fullName: 'Agency Owner Test',
    dateOfBirth: '1995-01-15',
    gender: 'FEMALE',
    city: 'Mumbai',
    country: 'IN',
    experience: 'I have 3 years of streaming experience.',
    socialMediaLinks: ['https://instagram.com/test'],
  }, {
    'cookie': cookieHeader,
    'x-csrf-token': csrfCookie || '',
  });
  
  log(`Status: ${hostApply.status} (${hostApply.elapsed}ms)`);
  if (hostApply.json) {
    log(`Response: ${JSON.stringify(hostApply.json).slice(0, 500)}`);
  }
  
  // Step 4: Check host status
  log('\n--- STEP 4: HOST STATUS ---');
  const hostStatus = await request('GET', '/api/host/status', null, {
    'cookie': cookieHeader,
  });
  
  log(`Status: ${hostStatus.status} (${hostStatus.elapsed}ms)`);
  if (hostStatus.json) {
    log(`Response: ${JSON.stringify(hostStatus.json).slice(0, 500)}`);
  }
  
  // Summary
  log('\n=== SUMMARY ===');
  log(`Signup: ${signup.status === 201 ? 'PASS' : 'FAIL'} (${signup.status})`);
  log(`Agency Signup: ${[200, 201, 409].includes(agencySignup.status) ? 'PASS' : 'CHECK'} (${agencySignup.status})`);
  log(`Host Apply: ${[200, 201, 409].includes(hostApply.status) ? 'PASS' : 'CHECK'} (${hostApply.status})`);
  log(`Host Status: ${hostStatus.status === 200 ? 'PASS' : 'CHECK'} (${hostStatus.status})`);
  log('DONE');
}

main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); });
