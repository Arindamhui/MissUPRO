// Final signup test with proper valid data
const fs = require('fs');
const http = require('http');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/signup-real.txt', out.join('\n')); 
}

const email = `real-${Date.now()}@example.com`;
const data = JSON.stringify({
  email,
  password: 'TestPassword123!',
  displayName: 'Real Test User',
});

log(`POST /api/auth/signup for ${email}`);
const start = Date.now();

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'x-request-id': 'real-' + Date.now(),
    'x-real-ip': '127.0.0.1',
  },
  timeout: 300000,
}, (res) => {
  log(`Response: ${res.statusCode} (${Date.now() - start}ms)`);
  log(`Set-Cookie count: ${(res.headers['set-cookie'] || []).length}`);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    log(`Body: ${body.slice(0, 2000)}`);
    log('DONE');
    clearInterval(interval);
    process.exit(0);
  });
});

req.on('error', e => {
  log(`Error: ${e.message} code=${e.code} (${Date.now() - start}ms)`);
  clearInterval(interval);
});

req.on('timeout', () => {
  log(`Timeout after ${Date.now() - start}ms`);
  req.destroy();
  clearInterval(interval);
});

req.write(data);
req.end();
log('Request sent');

const interval = setInterval(() => {
  log(`Waiting... ${Math.round((Date.now() - start) / 1000)}s`);
}, 15000);
