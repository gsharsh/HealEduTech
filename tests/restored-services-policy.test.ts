import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SERVICE_IMAGES, assertOfflineDatabase, localRestoreAdminJwt, restoredServiceCurlConfig, validateServiceRestoreReport } from '../scripts/verify-restored-services.ts';

const owner = '86000000-0000-4000-8000-000000000001';
const report = {
  format: 1, status: 'database_verified_services_pending', source_writes: false, image: SERVICE_IMAGES.database,
  container: 'evg-restore-synthetic-test', volume: 'evg-restore-synthetic-test-data', strict_restore_passed: true,
  resources_retained_for_service_checks: true, cleanup_pending: true, archive_data_comparison: { passed: true }, source_metadata_comparison: { passed: true },
  cleanup_ownership_label: `org.healedutech.restore-owner=${owner}`,
};

test('service rehearsal accepts only a fully verified retained restore with explicit ownership', () => {
  assert.deepEqual(validateServiceRestoreReport(report), { name: report.container, volume: report.volume, owner });
  for (const changed of [
    { format: 2 }, { status: 'failed' }, { source_writes: true }, { image: 'supabase/postgres:latest' }, { strict_restore_passed: false },
    { resources_retained_for_service_checks: false }, { cleanup_pending: false }, { archive_data_comparison: { passed: false } }, { source_metadata_comparison: { passed: false } },
    { container: 'unrelated-database' }, { volume: 'another-volume' }, { cleanup_ownership_label: 'org.healedutech.restore-owner=unknown' },
  ]) assert.throws(() => validateServiceRestoreReport({ ...report, ...changed }));
});

test('service rehearsal rejects a database with a different image, ownership or network boundary', () => {
  const id = 'a'.repeat(64), imageId = `sha256:${'b'.repeat(64)}`;
  const container = { Id: id, Image: imageId, State: { Running: true }, Config: { Image: SERVICE_IMAGES.database, Labels: { 'org.healedutech.restore-owner': owner } },
    HostConfig: { NetworkMode: 'none', Privileged: false, Binds: [], PortBindings: {} }, NetworkSettings: { Ports: {} },
    Mounts: [{ Type: 'volume', Name: report.volume, Destination: '/restore' }] };
  const target = validateServiceRestoreReport(report);
  assert.equal(assertOfflineDatabase(container, target, imageId), id);
  assert.throws(() => assertOfflineDatabase(undefined, target, imageId));
  for (const changed of [
    { Image: 'sha256:another' }, { State: { Running: false } }, { Config: { Image: SERVICE_IMAGES.database, Labels: {} } },
    { HostConfig: { ...container.HostConfig, NetworkMode: 'bridge' } }, { HostConfig: { ...container.HostConfig, Privileged: true } },
    { HostConfig: { ...container.HostConfig, Binds: ['/host:/restore'] } }, { HostConfig: { ...container.HostConfig, PortBindings: { '5432/tcp': [] } } },
    { NetworkSettings: { Ports: { '5432/tcp': null } } }, { Mounts: [{ Type: 'bind', Name: report.volume, Destination: '/restore' }] },
  ]) assert.throws(() => assertOfflineDatabase({ ...container, ...changed }, target, imageId));
});

test('local bootstrap JWT is short-lived HS256 with only the disposable Auth administrator role', () => {
  const secret = '1'.repeat(64), now = 1700000000;
  const [header, payload, signature] = localRestoreAdminJwt(secret, now).split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url').toString()), { aud: 'authenticated', role: 'service_role', iss: 'http://127.0.0.1:19999', iat: now, exp: now + 1800 });
  assert.equal(signature, createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'));
  assert.throws(() => localRestoreAdminJwt('source-secret-is-not-accepted'));
});

test('service HTTP config is constrained to fixed loopback ports and escapes stdin-only headers and JSON', () => {
  const config = restoredServiceCurlConfig(19999, '/token?grant_type=password', 'POST', undefined, { email: 'synthetic@example.invalid', password: 'quote" and slash\\ and newline\n' });
  assert.match(config, /url = "http:\/\/127\.0\.0\.1:19999\/token\?grant_type=password"/);
  assert.match(config, /noproxy = "\*"/);
  assert.match(config, /data-binary = "\{\\"email\\"/);
  assert.match(config, /write-out = "\\n%\{http_code\}"/);
  assert.match(restoredServiceCurlConfig(13000, '/books', 'GET', 'synthetic.jwt.signature'), /Authorization: Bearer synthetic\.jwt\.signature/);
  for (const path of ['https://project.supabase.co/rest/v1/books', '//remote/books', '/books#fragment']) assert.throws(() => restoredServiceCurlConfig(13000, path));
  assert.throws(() => restoredServiceCurlConfig(5432, '/books'));
  assert.throws(() => restoredServiceCurlConfig(13000, '/books', 'PUT'));
  assert.throws(() => restoredServiceCurlConfig(13000, '/books', 'GET', 'bad\r\nheader'));
});

test('default service plan neither reads its nonexistent report nor contacts a Docker daemon', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-restored-services.ts', '--restore-report', '/nonexistent-evg-report/report.json', '--output', '/nonexistent-evg-output/new'], {
    encoding: 'utf8', env: { ...process.env, DOCKER_HOST: 'unix:///nonexistent-evg-docker.sock' },
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.mode, 'plan');
  assert.equal(plan.report_contents_read, false);
  assert.equal(plan.source_writes, false);
  assert.deepEqual(plan.ports, []);
  assert.deepEqual(plan.service_mounts, []);
});
