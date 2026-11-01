import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicEnvironment } from '../src/lib/environmentValidation.ts';

const live = { VITE_SUPABASE_URL: 'https://release-check.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_release_fixture_not_real' };

test('production cannot silently fall back to demo when backend configuration is missing', () => {
  assert.throws(() => resolvePublicEnvironment({}, true), /Live builds require/);
  assert.throws(() => resolvePublicEnvironment({ VITE_SUPABASE_URL: live.VITE_SUPABASE_URL }, true), /Live builds require/);
  assert.equal(resolvePublicEnvironment({}, false), null);
  assert.throws(() => resolvePublicEnvironment({ VITE_APP_MODE: 'live' }, false), /Live builds require/);
});
test('an intentional demo ignores configured live credentials and an invalid mode fails', () => {
  assert.equal(resolvePublicEnvironment({ ...live, VITE_APP_MODE: 'demo' }, true), null);
  assert.throws(() => resolvePublicEnvironment({ ...live, VITE_APP_MODE: 'demoo' }, true), /VITE_APP_MODE/);
  assert.deepEqual(resolvePublicEnvironment(live, true), { supabaseUrl: live.VITE_SUPABASE_URL, supabaseAnonKey: live.VITE_SUPABASE_PUBLISHABLE_KEY });
});
test('public configuration rejects privileged keys and unsafe URLs', () => {
  for (const key of ['sb_secret_this_must_stay_private', 'your-publishable-key', 'not-a-public-key']) assert.throws(() => resolvePublicEnvironment({ ...live, VITE_SUPABASE_PUBLISHABLE_KEY: key }, true), /publishable key/);
  for (const url of ['http://release-check.supabase.co', 'https://user:password@example.com', 'https://example.com?token=secret', 'https://example.com/path', 'not-a-url']) assert.throws(() => resolvePublicEnvironment({ ...live, VITE_SUPABASE_URL: url }, true), /URL/);
  assert.equal(resolvePublicEnvironment({ ...live, VITE_SUPABASE_URL: 'http://127.0.0.1:54321/' }, false)?.supabaseUrl, 'http://127.0.0.1:54321');
});
test('legacy anon keys remain supported while service-role JWTs are rejected', () => {
  const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.signature`;
  assert.ok(resolvePublicEnvironment({ VITE_SUPABASE_URL: live.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: jwt('anon') }, true));
  assert.throws(() => resolvePublicEnvironment({ VITE_SUPABASE_URL: live.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: jwt('service_role') }, true), /publishable key/);
});
