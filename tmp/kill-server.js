const { execSync } = require('child_process');
const fs = require('fs');
const out = [];

try {
  const netstat = execSync('netstat -aon', { encoding: 'utf8' });
  const lines = netstat.split('\n').filter(l => l.includes(':3001') && l.includes('LISTENING'));
  out.push(`Listening on 3001: ${lines.length} entries`);
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    out.push(`Found PID: ${pid}`);
    
    try {
      execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8' });
      out.push(`Killed PID ${pid}`);
    } catch (e) {
      out.push(`Failed to kill PID ${pid}: ${e.message}`);
    }
  }
} catch (e) {
  out.push(`Error: ${e.message}`);
}

fs.writeFileSync('tmp/kill-result.txt', out.join('\n'));
