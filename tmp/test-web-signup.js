async function main() {
  try {
    const res = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Web Test User',
        email: `web_${Date.now()}@test.com`,
        password: 'TestPass123!',
      }),
    });
    const text = await res.text();
    require('fs').writeFileSync('tmp/web-test.txt', `STATUS: ${res.status}\n${text}`);
    console.log(`Done: ${res.status}`);
  } catch (err) {
    require('fs').writeFileSync('tmp/web-test.txt', `ERROR: ${err.message}`);
    console.log('Error:', err.message);
  }
}
main();
