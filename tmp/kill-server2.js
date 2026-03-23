const { execSync } = require('child_process');
const fs = require('fs');
const out = [];

try {
  // Get all node processes
  const tasks = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
  out.push('Node processes:');
  out.push(tasks.trim());
  
  // Get process tree for port 3001
  const netstat = execSync('netstat -aon', { encoding: 'utf8' });
  const lines = netstat.split('\n').filter(l => l.includes(':3001') && l.includes('LISTENING'));
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    out.push(`\nPort 3001 PID: ${pid}`);
    
    // Try to get process tree
    try {
      const wmic = execSync(`wmic process where "ProcessId=${pid}" get ParentProcessId,CommandLine /format:list`, { encoding: 'utf8' });
      out.push(`Process info: ${wmic.trim()}`);
    } catch (e) {
      out.push(`wmic failed: ${e.message.split('\n')[0]}`);
    }
    
    // Try taskkill with /T (tree)  
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { encoding: 'utf8' });
      out.push(`Killed tree for PID ${pid}`);
    } catch (e) {
      out.push(`Tree kill failed: ${e.stderr?.toString().split('\n')[0] || e.message.split('\n')[0]}`);
      
      // Try killing all node.exe processes
      try {
        execSync(`taskkill /IM node.exe /F`, { encoding: 'utf8' });
        out.push('Killed all node.exe processes');
      } catch (e2) {
        out.push(`Kill all node failed: ${e2.message.split('\n')[0]}`);
      }
    }
  }
  
  if (lines.length === 0) {
    out.push('No processes on port 3001');
  }
} catch (e) {
  out.push(`Error: ${e.message}`);
}

fs.writeFileSync('tmp/kill-result2.txt', out.join('\n'));
