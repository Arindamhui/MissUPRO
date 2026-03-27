const { execSync } = require('child_process');
// Use PowerShell to get node PIDs
const output = execSync('powershell -Command "Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }"').toString();
const pids = output.trim().split(/\r?\n/).filter(Boolean).map(Number);
let killed = 0;
pids.forEach(p => {
  if (p !== process.pid) {
    try { process.kill(p, 'SIGTERM'); killed++; } catch(e) {}
  }
});
console.log('Killed', killed, 'of', pids.length, 'node processes');
