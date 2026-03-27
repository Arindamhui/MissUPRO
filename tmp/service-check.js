const net = require('net');
const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\service-status.txt';

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
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

async function main() {
  const lines = [];
  lines.push(`Service Status Check - ${new Date().toISOString()}`);
  lines.push('');

  // Port checks
  lines.push('=== PORT STATUS ===');
  for (const port of [3001, 3002, 4000, 4001, 8081]) {
    const open = await checkPort(port);
    lines.push(`Port ${port}: ${open ? 'OPEN' : 'CLOSED'}`);
  }

  // API health
  lines.push('');
  lines.push('=== API SERVER (4000) ===');
  const health = await httpGet('http://localhost:4000/health');
  lines.push(`/health: ${JSON.stringify(health)}`);

  // Web app check
  lines.push('');
  lines.push('=== WEB APP ===');
  for (const port of [3001, 3002]) {
    const open = await checkPort(port);
    if (open) {
      const res = await httpGet(`http://localhost:${port}`);
      lines.push(`Port ${port}: status=${res.status}, bodyLength=${(res.body || '').length}`);
    } else {
      lines.push(`Port ${port}: NOT RUNNING`);
    }
  }

  // Metro/Expo check
  lines.push('');
  lines.push('=== METRO/EXPO (8081) ===');
  const metroOpen = await checkPort(8081);
  if (metroOpen) {
    const metro = await httpGet('http://localhost:8081/status');
    lines.push(`/status: ${JSON.stringify(metro)}`);
  } else {
    lines.push('NOT RUNNING');
  }

  const result = lines.join('\n');
  fs.writeFileSync(OUTPUT, result);
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'ERROR: ' + e.message);
  process.exit(1);
});
