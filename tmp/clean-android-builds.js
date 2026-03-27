const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const mobileNm = 'F:\\Arindam\\Works\\MissUPRO\\apps\\mobile\\node_modules';

// Find all android/build dirs in mobile node_modules
function findAndroidBuilds(dir, depth = 0) {
  if (depth > 3) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (e.name === 'build') {
        // Check if parent is 'android'
        if (path.basename(dir) === 'android') {
          results.push(full);
        }
      } else if (e.name === 'android') {
        const buildDir = path.join(full, 'build');
        if (fs.existsSync(buildDir)) {
          results.push(buildDir);
        }
      } else if (e.name.startsWith('.')) {
        continue;
      } else {
        results.push(...findAndroidBuilds(full, depth + 1));
      }
    }
  } catch(e) {}
  return results;
}

const dirs = findAndroidBuilds(mobileNm);
console.log('Found', dirs.length, 'android build dirs');
let cleaned = 0;
for (const d of dirs) {
  try {
    execSync(`cmd /c "robocopy F:\\Arindam\\Works\\MissUPRO\\tmp\\empty "${d}" /MIR /NFL /NDL /NJH /NJS /nc /ns /np"`, { stdio: 'ignore' });
    cleaned++;
    console.log('Cleaned:', d.replace(mobileNm + '\\', ''));
  } catch(e) {
    // robocopy returns non-zero even on success
    cleaned++;
    console.log('Cleaned:', d.replace(mobileNm + '\\', ''));
  }
}
console.log('Cleaned', cleaned, 'dirs');
