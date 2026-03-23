const net = require('net');
const fs = require('fs');
const server = net.createServer();
server.listen(3001, () => { server.close(); fs.writeFileSync('tmp/pid-check.txt', 'Port 3001 was free'); });
server.on('error', (e) => { 
  if (e.code === 'EADDRINUSE') {
    fs.writeFileSync('tmp/pid-check.txt', 'Port 3001 is in use');
  } else {
    fs.writeFileSync('tmp/pid-check.txt', `Error: ${e.message}`);
  }
});
