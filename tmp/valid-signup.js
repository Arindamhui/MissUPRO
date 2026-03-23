// Send a single signup with valid data and extended timeout
const fs = require('fs');
const http = require('http');

const email = `valid-${Date.now()}@example.com`;
const data = JSON.stringify({
  email,
  password: 'TestPassword123!',
  displayName: 'Valid Test User',
});

const start = Date.now();
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'x-request-id': 'valid-test-' + Date.now(),
    'x-real-ip': '127.0.0.1',
  },
  timeout: 120000,
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const elapsed = Date.now() - start;
    fs.writeFileSync('tmp/valid-signup.txt', JSON.stringify({
      status: res.statusCode,
      elapsed,
      headers: res.headers,
      body: body.slice(0, 2000),
    }, null, 2));
  });
});

req.on('error', e => {
  const elapsed = Date.now() - start;
  fs.writeFileSync('tmp/valid-signup.txt', JSON.stringify({ error: e.message, code: e.code, elapsed }));
});

req.on('timeout', () => {
  req.destroy();
  fs.writeFileSync('tmp/valid-signup.txt', JSON.stringify({ error: 'timeout', elapsed: Date.now() - start }));
});

req.write(data);
req.end();
