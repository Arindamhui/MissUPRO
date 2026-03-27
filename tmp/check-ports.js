const net = require('net');
const http = require('http');

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
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 200) }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function main() {
  console.log('=== PORT CHECK ===');
  for (const port of [3001, 3002, 4000, 8081]) {
    const open = await checkPort(port);
    console.log(`Port ${port}: ${open ? 'OPEN' : 'CLOSED'}`);
  }

  console.log('\n=== API HEALTH ===');
  const health = await httpGet('http://localhost:4000/health');
  console.log('API /health:', JSON.stringify(health));

  console.log('\n=== WEB APP ===');
  const web = await httpGet('http://localhost:3001');
  console.log('Web /:',  JSON.stringify({ status: web.status, error: web.error }));

  console.log('\n=== DONE ===');
}

main();
