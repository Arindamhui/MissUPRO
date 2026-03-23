// Test health endpoint and signup WITHOUT rate limit header
const fs = require('fs');
const http = require('http');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/health-then-signup.txt', out.join('\n')); 
}

function request(opts, body) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, elapsed: Date.now() - start }));
    });
    req.on('error', e => resolve({ error: e.message, elapsed: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', elapsed: Date.now() - start }); });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Health check
  log('Checking health...');
  const health = await request({ hostname: 'localhost', port: 3001, path: '/api/health', timeout: 10000 });
  log(`Health: status=${health.status} elapsed=${health.elapsed}ms body=${health.body?.slice(0, 200)}`);
  
  if (health.error) {
    log(`Server not responding: ${health.error}`);
    return;
  }

  // Check if Redis says degraded
  try {
    const hj = JSON.parse(health.body);
    log(`Redis status: ${hj.components?.redis || 'unknown'}`);
    log(`DB status: ${hj.components?.database || 'unknown'}`);
  } catch {}

  // Step 2: Signup
  const email = `test-hs-${Date.now()}@example.com`;
  const data = JSON.stringify({ email, password: 'TestPassword123!', displayName: 'HS Tester' });
  log(`\nSending signup for ${email}...`);
  
  const signup = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(data),
      'x-request-id': 'hs-test-' + Date.now(),
      'x-real-ip': '127.0.0.1',
    },
    timeout: 120000,  // 2 minutes
  }, data);
  
  if (signup.error) {
    log(`Signup error: ${signup.error} elapsed=${signup.elapsed}ms`);
  } else {
    log(`Signup: status=${signup.status} elapsed=${signup.elapsed}ms`);
    log(`Body: ${signup.body?.slice(0, 500)}`);
  }
  
  log('\nDONE');
}

main().catch(e => log(`FATAL: ${e.message}\n${e.stack}`));
