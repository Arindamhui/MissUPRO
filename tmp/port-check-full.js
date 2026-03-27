const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'port-status.txt');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, timeout: 3000 });
    socket.on('connect', () => { socket.end(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 300) }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function main() {
  const lines = [];
  lines.push('=== PORT CHECK ===');
  for (const port of [3001, 3002, 4000, 8081]) {
    const open = await checkPort(port);
    lines.push(`Port ${port}: ${open ? 'OPEN' : 'CLOSED'}`);
  }

  lines.push('');
  lines.push('=== API HEALTH CHECK ===');
  const health = await httpGet('http://localhost:4000/health');
  lines.push(`API /health: ${JSON.stringify(health)}`);

  lines.push('');
  lines.push('=== WEB APP CHECK ===');
  const web = await httpGet('http://localhost:3001');
  lines.push(`Web (3001): status=${web.status || 'N/A'} error=${web.error || 'none'}`);

  const web2 = await httpGet('http://localhost:3002');
  lines.push(`Web (3002): status=${web2.status || 'N/A'} error=${web2.error || 'none'}`);

  lines.push('');
  lines.push('=== METRO CHECK ===');
  const metro = await httpGet('http://localhost:8081');
  lines.push(`Metro (8081): status=${metro.status || 'N/A'} error=${metro.error || 'none'}`);

  const output = lines.join('\n');
  fs.writeFileSync(outputFile, output);
  console.log(output);
}

main();
