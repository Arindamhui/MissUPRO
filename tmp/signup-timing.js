// Full signup test with detailed timing per step, hitting port 3001
const fs = require('fs');
const http = require('http');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/signup-timing.txt', out.join('\n')); 
}

const email = `test-timing-${Date.now()}@example.com`;
const data = JSON.stringify({ email, password: 'TestPassword123!', displayName: 'Timing Tester' });

log(`START - posting to port 3001, email=${email}`);
log(`Payload: ${data.length} bytes`);

const startMs = Date.now();

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'x-request-id': 'timing-test-' + Date.now(),
    'x-real-ip': '127.0.0.1',
  },
  timeout: 60000, // 60 second timeout
}, (res) => {
  const elapsed = Date.now() - startMs;
  log(`RESPONSE: status=${res.statusCode} elapsed=${elapsed}ms`);
  log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    log(`Body length: ${body.length}`);
    try {
      const j = JSON.parse(body);
      log(`Parsed JSON keys: ${Object.keys(j).join(', ')}`);
      if (j.token) log(`TOKEN: present`);
      if (j.sessionId) log(`SESSION_ID: ${j.sessionId}`);
      if (j.user) log(`USER: ${JSON.stringify(j.user)}`);
      if (j.error) log(`ERROR: ${JSON.stringify(j.error)}`);
      if (j.message) log(`MESSAGE: ${j.message}`);
    } catch (e) {
      log(`RAW BODY: ${body.slice(0, 500)}`);
    }
    log('DONE');
  });
});

req.on('error', (e) => {
  const elapsed = Date.now() - startMs;
  log(`REQUEST_ERROR: ${e.message} elapsed=${elapsed}ms code=${e.code || 'none'}`);
  log('DONE_WITH_ERROR');
});

req.on('timeout', () => {
  const elapsed = Date.now() - startMs;
  log(`REQUEST_TIMEOUT: after ${elapsed}ms`);
  req.destroy();
});

req.write(data);
req.end();
log('REQUEST_SENT');
