const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\web-check.txt';

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, bodyLen: data.length, head: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

async function main() {
  const lines = [];
  
  // Test web on port 3002 (our new one)
  lines.push('=== Testing Web on 3002 ===');
  const r1 = await httpGet('http://localhost:3002');
  lines.push(`GET /: status=${r1.status} bodyLen=${r1.bodyLen} error=${r1.error || 'none'}`);
  if (r1.head) lines.push(`HEAD: ${r1.head.substring(0, 200)}`);
  
  // Test login page
  lines.push('');
  lines.push('=== Testing /login ===');
  const r2 = await httpGet('http://localhost:3002/login');
  lines.push(`GET /login: status=${r2.status} bodyLen=${r2.bodyLen} error=${r2.error || 'none'}`);
  
  // Test admin
  lines.push('');
  lines.push('=== Testing /admin ===');
  const r3 = await httpGet('http://localhost:3002/admin');
  lines.push(`GET /admin: status=${r3.status} bodyLen=${r3.bodyLen} error=${r3.error || 'none'}`);

  // Test API proxy
  lines.push('');
  lines.push('=== Testing /api/health ===');
  const r4 = await httpGet('http://localhost:3002/api/health');
  lines.push(`GET /api/health: status=${r4.status} bodyLen=${r4.bodyLen} error=${r4.error || 'none'}`);
  if (r4.head) lines.push(`BODY: ${r4.head.substring(0, 200)}`);

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'ERROR: ' + e.message);
  process.exit(1);
});
