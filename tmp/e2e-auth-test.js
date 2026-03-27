async function main() {
  const results = {};
  
  // Test 1: API Health
  try {
    const r = await fetch('http://localhost:4000/health');
    results.apiHealth = { status: r.status, body: await r.json() };
  } catch (e) { results.apiHealth = { error: e.message }; }
  
  // Test 2: Web Health
  try {
    const r = await fetch('http://localhost:3001/api/health');
    results.webHealth = { status: r.status, body: await r.json() };
  } catch (e) { results.webHealth = { error: e.message }; }
  
  // Test 3: NestJS Signup
  const email1 = `api_test_${Date.now()}@example.com`;
  try {
    const r = await fetch('http://localhost:4000/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'API Test', email: email1, password: 'TestPass123!' }),
    });
    results.apiSignup = { status: r.status, body: await r.json() };
  } catch (e) { results.apiSignup = { error: e.message }; }
  
  // Test 4: NestJS Login
  try {
    const r = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email1, password: 'TestPass123!' }),
    });
    results.apiLogin = { status: r.status, body: await r.json() };
  } catch (e) { results.apiLogin = { error: e.message }; }
  
  // Test 5: Web Signup
  const email2 = `web_test_${Date.now()}@example.com`;
  try {
    const r = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Web Test', email: email2, password: 'TestPass123!' }),
    });
    results.webSignup = { status: r.status, body: await r.json() };
  } catch (e) { results.webSignup = { error: e.message }; }
  
  // Test 6: Web Login
  try {
    const r = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email2, password: 'TestPass123!' }),
    });
    results.webLogin = { status: r.status, body: await r.json() };
  } catch (e) { results.webLogin = { error: e.message }; }
  
  require('fs').writeFileSync('tmp/test-results.json', JSON.stringify(results, null, 2));
  
  console.log('\n=== RESULTS ===');
  for (const [key, val] of Object.entries(results)) {
    const s = val.status ?? 'ERR';
    const ok = (s === 200 || s === 201) ? 'PASS' : 'FAIL';
    console.log(`${ok} ${key}: ${s}`);
  }
}

main().catch(e => console.error('Fatal:', e.message));
