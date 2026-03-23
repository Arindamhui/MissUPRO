// Test the signup flow directly without a dev server, simulating what the route does
const fs = require('fs');
const out = [];
function log(msg) { out.push(`[${new Date().toISOString()}] ${msg}`); fs.writeFileSync('tmp/signup-direct-result.txt', out.join('\n')); }

async function main() {
  log('START');
  
  // Test 1: Check that cache module has the timeout fix
  try {
    const cachePath = require.resolve('@missu/cache');
    const cacheContent = fs.readFileSync(cachePath, 'utf8');
    const hasTimeout = cacheContent.includes('Redis connect timeout');
    log(`Cache module: ${cachePath}`);
    log(`Has timeout fix: ${hasTimeout}`);
  } catch (e) {
    log(`Cache resolve error: ${e.message}`);
  }
  
  // Test 2: Try checkRateLimit with no Redis
  try {
    const { checkRateLimit } = require('@missu/cache');
    log('Calling checkRateLimit...');
    const result = await checkRateLimit('test:signup:127.0.0.1', 10, 60);
    log(`Rate limit result: allowed=${result.allowed}, remaining=${result.remaining}`);
  } catch (e) {
    log(`Rate limit error: ${e.message}`);
  }
  
  log('DONE');
}

main().catch(e => log(`FATAL: ${e.message}`));
