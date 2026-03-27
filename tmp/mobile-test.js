const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\mobile-test-result.txt';

function httpGet(url, timeoutMs = 30000) {
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
  lines.push(`Mobile (Expo/Metro) Test - ${new Date().toISOString()}`);
  
  // Test Metro status
  lines.push('\n--- Metro /status ---');
  const r1 = await httpGet('http://localhost:8081/status', 10000);
  lines.push(`status=${r1.status} body=${r1.head} err=${r1.error||'none'}`);

  // Test Metro debugger info
  lines.push('\n--- Metro /json ---');
  const r2 = await httpGet('http://localhost:8081/json', 10000);
  lines.push(`status=${r2.status} len=${r2.bodyLen} err=${r2.error||'none'}`);

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  console.log(result);
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
