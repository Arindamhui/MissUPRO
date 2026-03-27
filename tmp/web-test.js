const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\web-test-result.txt';

function httpGet(url, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, bodyLen: data.length, head: data.substring(0, 300) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout after ' + timeoutMs + 'ms' }); });
  });
}

async function main() {
  const lines = [];
  lines.push(`Web App Test - ${new Date().toISOString()}`);
  
  // Test port 3001 (existing)
  lines.push('\n--- Port 3001 (existing) ---');
  const r1 = await httpGet('http://localhost:3001/login', 60000);
  lines.push(`/login: status=${r1.status} len=${r1.bodyLen} err=${r1.error||'none'}`);
  if (r1.head) lines.push(`HEAD: ${r1.head.substring(0, 150)}`);

  fs.writeFileSync(OUTPUT, lines.join('\n'));
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
