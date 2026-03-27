const { execSync } = require('child_process');
const fs = require('fs');

// Kill all node processes via WMIC
try {
  execSync('wmic process where "name=\'node.exe\'" delete', { stdio: 'pipe', encoding: 'utf8' });
  console.log('Killed all node processes via WMIC');
} catch (e) {
  console.log('WMIC fallback - trying tasklist');
  try {
    const list = execSync('tasklist /fi "imagename eq node.exe" /fo csv /nh', { encoding: 'utf8' });
    const pids = [];
    for (const line of list.split('\n')) {
      const match = line.match(/"node\.exe","(\d+)"/);
      if (match) pids.push(match[1]);
    }
    console.log(`Found ${pids.length} node PIDs`);
    // This script IS a node process, so we'll kill others using process.kill
    for (const pid of pids) {
      const p = parseInt(pid);
      if (p !== process.pid) {
        try { process.kill(p, 9); } catch {}
      }
    }
    console.log('Done killing');
  } catch (e2) {
    console.log('Error:', e2.message);
  }
}

// Write marker for next step
fs.writeFileSync('tmp/killed.txt', 'done ' + new Date().toISOString());
console.log('Marker written');
