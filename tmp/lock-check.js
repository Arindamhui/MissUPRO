const fs = require('fs');
const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\lock-check.txt';
const lockPath = 'F:\\Arindam\\Works\\MissUPRO\\apps\\web\\.next\\dev\\lock';
const exists = fs.existsSync(lockPath);
fs.writeFileSync(OUTPUT, `Lock exists: ${exists}\n`);
if (exists) {
  try {
    const stat = fs.statSync(lockPath);
    fs.appendFileSync(OUTPUT, `Size: ${stat.size} Mode: ${stat.mode}\n`);
  } catch (e) {
    fs.appendFileSync(OUTPUT, `Stat error: ${e.message}\n`);
  }
}
console.log('Done');
