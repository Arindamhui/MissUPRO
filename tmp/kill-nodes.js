const { execSync } = require('child_process');
const lines = execSync('wmic process where name="node.exe" get ProcessId /format:csv').toString().split('\n');
const pids = [];
lines.forEach(l => {
  const m = l.trim().match(/,(\d+)$/);
  if (m) pids.push(+m[1]);
});
let killed = 0;
pids.forEach(p => {
  if (p !== process.pid) {
    try { process.kill(p, 'SIGTERM'); killed++; } catch(e) {}
  }
});
console.log('Killed', killed, 'of', pids.length, 'node processes');
