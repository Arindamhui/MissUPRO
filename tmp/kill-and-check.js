// Kill all node processes except self, wait, then verify ports are free
const cp = require('child_process');
const net = require('net');

const PORTS = [3001, 4000, 4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 8081];

function killAllNode() {
  try {
    const out = cp.execSync(
      'Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id',
      { shell: 'powershell', encoding: 'utf8' }
    );
    const pids = out.trim().split(/\r?\n/).map(Number).filter(p => p !== process.pid && !isNaN(p));
    console.log(`Found ${pids.length} node processes to kill`);
    let killed = 0;
    for (const pid of pids) {
      try { process.kill(pid, 'SIGKILL'); killed++; } catch {}
    }
    console.log(`Killed ${killed} processes`);
  } catch (e) {
    console.log('No node processes found');
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  // Kill round 1
  killAllNode();
  await new Promise(r => setTimeout(r, 2000));
  
  // Kill round 2 (in case parent spawned children)
  killAllNode();
  await new Promise(r => setTimeout(r, 2000));
  
  // Check ports
  console.log('\nPort status:');
  for (const port of PORTS) {
    const free = await checkPort(port);
    console.log(`  ${port}: ${free ? 'FREE' : 'OCCUPIED'}`);
  }
}

main();
