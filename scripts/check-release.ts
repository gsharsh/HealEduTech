/** Read-only deployment checks. No account creation, emails, database writes or secrets. */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHostedMigrationVersions } from './release-migrations.ts';

const values = process.argv.slice(2);
const valueAfter = (flag: string) => values.includes(flag) ? values[values.indexOf(flag) + 1] : undefined;
const target = valueAfter('--url');
if (!target || values.includes('--help')) {
  console.log('Usage: node scripts/check-release.ts --url https://your-site.example [--hosted-migrations exported-migration-list.txt]');
  console.log('Reads public pages/headers and compares an optional exported migration list. Does not authenticate or change data.');
  process.exit(values.includes('--help') ? 0 : 2);
}
const origin = new URL(target);
if (origin.username || origin.password || origin.search || origin.hash || !['https:', 'http:'].includes(origin.protocol)) throw new Error('Supply a plain website URL without credentials, query or fragment.');
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('Use HTTPS except for a local preview.');

type Result = { check: string; status: 'pass' | 'fail' | 'unverified'; detail: string };
const results: Result[] = [];
const record = (check: string, okay: boolean, detail: string) => results.push({ check, status: okay ? 'pass' : 'fail', detail });
const publicRoutes = ['/', '/start', '/help', '/privacy', '/vi', '/vi/start', '/vi/help', '/vi/privacy'];
for (const path of publicRoutes) {
  try {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: 'error' });
    const body = await response.text();
    record(`${path}: response`, response.ok && /text\/html/.test(response.headers.get('content-type') ?? ''), `HTTP ${response.status}`);
    record(`${path}: initial content`, /<h1(?:\s|>)/.test(body), 'Public heading is present in delivered HTML');
    record(`${path}: metadata`, /rel=["']canonical["']/.test(body) && /property=["']og:title["']/.test(body), 'Canonical and social title exist before JavaScript');
    record(`${path}: language`, new RegExp(`<html[^>]+lang=["']${path.startsWith('/vi') ? 'vi' : 'en'}["']`).test(body), 'Correct document language');
    if (path === '/') {
      record('Security: MIME protection', response.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options');
      record('Security: framing denied', response.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options');
      record('Security: CSP', Boolean(response.headers.get('content-security-policy')), 'Content-Security-Policy');
      if (origin.protocol === 'https:') record('Security: HTTPS policy', Boolean(response.headers.get('strict-transport-security')), 'Strict-Transport-Security');
    }
  } catch (error) {
    results.push({ check: `${path}: response`, status: 'fail', detail: error instanceof Error ? error.name : 'Request failed' });
  }
}
for (const [path, expected] of [['/robots.txt', /User-agent:/i], ['/sitemap.xml', /<urlset(?:\s|>)/]] as const) {
  try {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: 'error' });
    record(path, response.ok && expected.test(await response.text()), `HTTP ${response.status}; expected machine-readable content`);
  } catch { record(path, false, 'Request failed'); }
}
// Static loopback previews do not run Vercel Functions; check the real hosted boundary.
if (origin.protocol === 'https:') {
  try {
    const endpoint = new URL('/api/client-error', origin);
    const get = await fetch(endpoint, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    record('Client diagnostics: method boundary', get.status === 405 && get.headers.get('allow') === 'POST', `HTTP ${get.status}; GET must be rejected by the running function`);
    const crossSite = await fetch(endpoint, { method: 'POST', headers: { origin: 'https://release-check.invalid', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000), redirect: 'error' });
    record('Client diagnostics: origin boundary', crossSite.status === 403, `HTTP ${crossSite.status}; cross-site requests must be rejected without logging an event`);
  } catch { record('Client diagnostics: hosted function', false, 'Request failed'); }
}
const requiredMigrations = (await readdir(resolve('supabase/migrations'))).filter(name => /^\d+.*\.sql$/.test(name)).sort();
try {
  const response = await fetch(new URL('/release.json', origin), { signal: AbortSignal.timeout(15000), redirect: 'error' });
  const deployed = await response.json() as { version?: string; commit?: string; app_mode?: string; required_migrations?: string[]; public_routes?: string[] };
  record('Release manifest', response.ok && typeof deployed.version === 'string' && Array.isArray(deployed.required_migrations), 'Version and required migration list exist');
  record('Released migration requirements', JSON.stringify([...(deployed.required_migrations ?? [])].sort()) === JSON.stringify(requiredMigrations), 'Deployed requirements match this checkout');
  if (origin.protocol === 'https:') record('Live application mode', deployed.app_mode === 'live', 'An HTTPS production deployment must not silently be a demo');
} catch { record('Release manifest', false, 'Missing or invalid release.json'); }
const migrationFile = valueAfter('--hosted-migrations');
if (migrationFile) {
  const exported = await readFile(resolve(migrationFile), 'utf8');
  const hosted = parseHostedMigrationVersions(exported);
  const missing = requiredMigrations.filter(name => !hosted.has(name.slice(0, 14)));
  record('Hosted migration parity', missing.length === 0, missing.length ? `Missing: ${missing.join(', ')}` : `All ${requiredMigrations.length} required versions are present in the supplied export`);
} else results.push({ check: 'Hosted migration parity', status: 'unverified', detail: 'Supply an actual exported migration list with --hosted-migrations. Public browsing does not prove parity.' });
for (const check of ['Received confirmation/recovery email', 'Real account persistence and cross-account isolation', 'Verified backup and isolated restore', 'Approved inventory, lending policy and operating owners']) {
  results.push({ check, status: 'unverified', detail: 'Requires recorded hosted/operator evidence; not inferred from HTTP checks.' });
}
console.log(JSON.stringify({ target: origin.origin, checked_at: new Date().toISOString(), mutations: false, technical_checks_passed: !results.some(result => result.status === 'fail'), launch_acceptance: 'Requires separate recorded account, email, recovery and operator evidence', results }, null, 2));
process.exitCode = results.some(result => result.status === 'fail') ? 1 : 0;
