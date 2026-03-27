const http = require('http');
const fs = require('fs');

const OUTPUT = 'F:\\Arindam\\Works\\MissUPRO\\tmp\\web-deep-test.txt';
const BASE = 'http://localhost:3010';

function httpGet(url, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const hasError = data.includes('Error') || data.includes('error') || data.includes('500') || data.includes('Internal Server Error');
        const hasNextError = data.includes('digest') || data.includes('NEXT_NOT_FOUND');
        resolve({
          status: res.statusCode, 
          bodyLen: data.length,
          hasError,
          hasNextError,
          head: data.substring(0, 300),
          location: res.headers.location || ''
        });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

const routes = [
  '/',
  '/login',
  '/signup',
  '/admin',
  '/admin-login',
  '/admin/dashboard',
  '/admin/users',
  '/admin/agencies',
  '/admin/gifts',
  '/admin/settings',
  '/admin/finance',
  '/admin/live',
  '/admin/moderation',
  '/admin/notifications',
  '/admin/levels',
  '/admin/leaderboards',
  '/admin/wallet',
  '/admin/vip',
  '/admin/party',
  '/admin/group-audio',
  '/admin/hosts',
  '/admin/models',
  '/admin/payouts',
  '/admin/referrals',
  '/admin/analytics',
  '/admin/fraud',
  '/admin/roles',
  '/admin/sessions',
  '/admin/coin-packages',
  '/admin/commission',
  '/admin/daily-checkin',
  '/admin/events',
  '/admin/feature-flags',
  '/admin/host-requests',
  '/admin/host-tags',
  '/admin/homepage',
  '/admin/campaigns',
  '/admin/promotions',
  '/admin/themes',
  '/admin/ui-layouts',
  '/admin/transactions',
  '/admin/missu-pro',
  '/admin/plan-history',
  '/agency-login',
  '/agency-signup',
  '/agency/dashboard',
  '/agency/models',
  '/agency/analytics',
  '/agency/payments',
  '/agency/settings',
  '/agency/missu-pro',
  '/discover',
  '/auth/pending-approval',
  '/api/health',
  '/api/auth/session',
];

async function main() {
  const lines = [];
  lines.push(`Deep Web Test - ${new Date().toISOString()}`);
  lines.push(`Base: ${BASE}`);
  lines.push('');

  const errors = [];
  const timeouts = [];
  const ok = [];

  for (const route of routes) {
    const r = await httpGet(`${BASE}${route}`, 60000);
    const status = r.status || 'N/A';
    const result = r.error 
      ? `ERR: ${r.error}` 
      : `${status} len=${r.bodyLen}${r.location ? ' -> ' + r.location : ''}`;
    
    lines.push(`${route}: ${result}`);
    
    if (r.error === 'timeout') {
      timeouts.push(route);
    } else if (r.error || (r.status && r.status >= 500)) {
      errors.push({ route, status: r.status, error: r.error, head: r.head?.substring(0, 200) });
    } else {
      ok.push(route);
    }
    
    // Write intermediate results
    fs.writeFileSync(OUTPUT, lines.join('\n') + '\n\n[PROGRESS: ' + lines.length + '/' + routes.length + ']');
  }

  lines.push('');
  lines.push('=== SUMMARY ===');
  lines.push(`OK routes: ${ok.length}`);
  lines.push(`Errors: ${errors.length}`);
  lines.push(`Timeouts: ${timeouts.length}`);
  
  if (errors.length > 0) {
    lines.push('\n=== ERRORS ===');
    errors.forEach(e => lines.push(`  ${e.route}: ${e.status} ${e.error || ''} ${e.head || ''}`));
  }
  if (timeouts.length > 0) {
    lines.push('\n=== TIMEOUTS ===');
    timeouts.forEach(t => lines.push(`  ${t}`));
  }

  lines.push('\n=== DONE ===');
  fs.writeFileSync(OUTPUT, lines.join('\n'));
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync(OUTPUT, 'FATAL: ' + e.message);
  process.exit(1);
});
