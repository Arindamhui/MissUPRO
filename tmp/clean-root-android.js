const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootNm = 'F:\\Arindam\\Works\\MissUPRO\\node_modules';
const emptyDir = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\empty';

// Ensure empty dir exists
if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });

// Specific dirs from the error
const targets = [
  'expo-constants\\android\\build',
  '@expo\\log-box\\android\\build',
  'expo\\android\\build',
  'expo-modules-core\\android\\build',
];

// Also find ALL android/build dirs at root node_modules level
function findAll(base, depth = 0) {
  if (depth > 2) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name === '.cache') continue;
      const full = path.join(base, e.name);
      if (e.name === 'android') {
        const buildDir = path.join(full, 'build');
        if (fs.existsSync(buildDir)) {
          results.push(path.relative(rootNm, buildDir));
        }
      } else if (e.name.startsWith('@')) {
        // scoped packages
        results.push(...findAll(full, depth + 1));
      }
    }
  } catch(e) {}
  return results;
}

const discovered = findAll(rootNm);
const allTargets = [...new Set([...targets, ...discovered])];

console.log(`Found ${allTargets.length} android build dirs to clean:`);
let cleaned = 0;
for (const rel of allTargets) {
  const full = path.join(rootNm, rel);
  if (!fs.existsSync(full)) {
    console.log(`  SKIP (not found): ${rel}`);
    continue;
  }
  try {
    execSync(`cmd /c "robocopy "${emptyDir}" "${full}" /MIR /NFL /NDL /NJH /NJS /nc /ns /np"`, { stdio: 'ignore' });
  } catch(e) {
    // robocopy returns non-zero on success
  }
  cleaned++;
  console.log(`  Cleaned: ${rel}`);
}
console.log(`Done. Cleaned ${cleaned} dirs.`);
