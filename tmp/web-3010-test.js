const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\web-3010-result.txt';

function httpGet(url, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, bodyLen: data.length, head: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout_' + timeoutMs }); });
  });
}

async function main() {
  const lines = [];
  lines.push(`Web App Test on 3010 - ${new Date().toISOString()}`);
  
  // Test homepage
  lines.push('\n--- GET / ---');
  const r1 = await httpGet('http://localhost:3010/', 120000);
  lines.push(`status=${r1.status} len=${r1.bodyLen} err=${r1.error||'none'}`);
  
  // Test login
  lines.push('\n--- GET /login ---');
  const r2 = await httpGet('http://localhost:3010/login', 120000);
  lines.push(`status=${r2.status} len=${r2.bodyLen} err=${r2.error||'none'}`);
  
  // Test admin 
  lines.push('\n--- GET /admin ---');
  const r3 = await httpGet('http://localhost:3010/admin', 120000);
  lines.push(`status=${r3.status} len=${r3.bodyLen} err=${r3.error||'none'}`);

  // Test signup
  lines.push('\n--- GET /signup ---');
  const r4 = await httpGet('http://localhost:3010/signup', 120000);
  lines.push(`status=${r4.status} len=${r4.bodyLen} err=${r4.error||'none'}`);

  // Test API health
  lines.push('\n--- GET /api/health ---');
  const r5 = await httpGet('http://localhost:3010/api/health', 30000);
  lines.push(`status=${r5.status} len=${r5.bodyLen} err=${r5.error||'none'}`);
  if (r5.head) lines.push(`body: ${r5.head.substring(0, 200)}`);

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  console.log(result);
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
