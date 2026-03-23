// Signup test with 5-minute timeout and progress tracking
const fs = require('fs');
const http = require('http');

const email = `signup5-${Date.now()}@example.com`;
const data = JSON.stringify({
  email,
  password: 'TestPassword123!',
  displayName: 'Signup Five User',
});

const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/signup5.txt', out.join('\n')); 
}

log(`Sending signup for ${email}`);
const start = Date.now();

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'x-request-id': 'signup5-' + Date.now(),
    'x-real-ip': '127.0.0.1',
  },
  timeout: 300000, // 5 minutes
}, (res) => {
  log(`Response received: ${res.statusCode} (${Date.now() - start}ms)`);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    log(`Body: ${body.slice(0, 1500)}`);
    log('DONE');
  });
});

req.on('error', e => {
  log(`Error: ${e.message} code=${e.code} (${Date.now() - start}ms)`);
  log('DONE_ERROR');
});

req.on('timeout', () => {
  log(`Timeout after ${Date.now() - start}ms`);
  req.destroy();
  log('DONE_TIMEOUT');
});

req.write(data);
req.end();
log('Request sent');

// Progress timer
const interval = setInterval(() => {
  const elapsed = Math.round((Date.now() - start) / 1000);
  log(`Still waiting... ${elapsed}s`);
  if (elapsed > 300) {
    clearInterval(interval);
    log('Gave up waiting');
    process.exit(1);
  }
}, 15000);
