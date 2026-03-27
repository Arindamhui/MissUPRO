const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootNm = 'F:\\Arindam\\Works\\MissUPRO\\node_modules';
const emptyDir = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\empty';

if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });

// Recursively find ALL android/build dirs in root node_modules
function findAndroidBuilds(dir, depth = 0) {
  if (depth > 4) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (e.name === 'build' && path.basename(dir) === 'android') {
        results.push(full);
      } else if (e.name === 'android') {
        const buildDir = path.join(full, 'build');
        if (fs.existsSync(buildDir)) results.push(buildDir);
      } else if (e.name.startsWith('@') || e.name === 'expo' || e.name.startsWith('react-native') || e.name.startsWith('expo-')) {
        results.push(...findAndroidBuilds(full, depth + 1));
      }
    }
  } catch(e) {}
  return results;
}

const dirs = findAndroidBuilds(rootNm);
console.log(`Found ${dirs.length} android build dirs:`);
let cleaned = 0;
for (const d of dirs) {
  const rel = path.relative(rootNm, d);
  try {
    execSync(`cmd /c "robocopy "${emptyDir}" "${d}" /MIR /NFL /NDL /NJH /NJS /nc /ns /np"`, { stdio: 'ignore' });
  } catch(e) {} // robocopy returns non-zero
  cleaned++;
  console.log(`  ${rel}`);
}
console.log(`Cleaned ${cleaned} dirs.`);
