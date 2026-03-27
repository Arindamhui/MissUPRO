const http = require('http');
const fs = require('fs');
const net = require('net');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\web-3002-result.txt';

function tcpCheck(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, timeout: 3000 });
    s.on('connect', () => { s.end(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

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
  lines.push(`=== Web 3002 Test - ${new Date().toISOString()} ===`);
  
  const tcpOk = await tcpCheck(3002);
  lines.push(`TCP 3002: ${tcpOk ? 'OPEN' : 'CLOSED'}`);
  
  if (tcpOk) {
    lines.push('Fetching /login (may trigger compilation)...');
    fs.writeFileSync(OUTPUT, lines.join('\n'));
    
    const r = await httpGet('http://localhost:3002/login', 120000);
    lines.push(`/login: status=${r.status} len=${r.bodyLen} err=${r.error||'none'}`);
    if (r.head) lines.push(`HEAD: ${r.head.substring(0, 300)}`);
  }

  fs.writeFileSync(OUTPUT, lines.join('\n'));
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
