const fs = require('fs');
const http = require('http');
const out = [];

function check(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}/api/health`, { timeout: 3000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ port, status: res.statusCode, body: d.slice(0, 200) }));
    });
    req.on('error', e => resolve({ port, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ port, error: 'timeout' }); });
  });
}

Promise.all([3001, 3002, 3003, 3004, 3005].map(check)).then(results => {
  fs.writeFileSync('tmp/port-check-result.txt', JSON.stringify(results, null, 2));
});
