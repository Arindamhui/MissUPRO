// Standalone test: exercise the signup code path directly without a dev server
// This imports the exact same modules the dev server uses
const fs = require('fs');
const out = [];
function log(msg) { 
  out.push(`[${new Date().toISOString()}] ${msg}`); 
  fs.writeFileSync('tmp/standalone-signup.txt', out.join('\n')); 
}

process.env.NODE_ENV = 'development';

async function main() {
  log('START');
  
  // Load the DB module
  log('Loading @missu/db...');
  const { db } = require('@missu/db');
  log('DB loaded');
  
  // Test a simple DB query
  log('Testing DB connection...');
  const start = Date.now();
  try {
    const result = await db.execute(require('drizzle-orm').sql`SELECT 1 as test`);
    log(`DB query OK in ${Date.now() - start}ms`);
  } catch (e) {
    log(`DB query failed in ${Date.now() - start}ms: ${e.message}`);
  }
  
  // Load and test cache
  log('Testing checkRateLimit...');
  const start2 = Date.now();
  try {
    const { checkRateLimit } = require('@missu/cache');
    const result = await checkRateLimit('standalone-test:127.0.0.1', 10, 60);
    log(`Rate limit OK in ${Date.now() - start2}ms: allowed=${result.allowed}`);
  } catch (e) {
    log(`Rate limit failed in ${Date.now() - start2}ms: ${e.message}`);
  }
  
  // Test bcrypt
  log('Testing bcrypt...');
  const start3 = Date.now();
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('TestPassword123!', 12);
    log(`bcrypt hash OK in ${Date.now() - start3}ms: ${hash.slice(0, 20)}...`);
  } catch (e) {
    log(`bcrypt failed in ${Date.now() - start3}ms: ${e.message}`);
  }
  
  log('DONE');
  process.exit(0);
}

main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); process.exit(1); });
