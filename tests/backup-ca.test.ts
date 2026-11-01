import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SUPABASE_CA, verifiedSupabaseCA } from '../scripts/backup-ca.ts';

test('bundled provider CA is pinned to the verified official file and DER fingerprint', () => {
  const certificate = verifiedSupabaseCA(undefined, new Date('2026-11-01T00:00:00Z'));
  assert.equal(certificate.file_sha256, SUPABASE_CA.file_sha256);
  assert.equal(certificate.certificate_der_sha256, '807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA');
  assert.equal(Date.parse(certificate.valid_to), Date.parse('2031-04-26T10:56:53Z'));
});

test('changed public certificate bytes, private-key markers and expired trust fail closed', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'evg-public-ca-test-'));
  try {
    const original = verifiedSupabaseCA(undefined, new Date('2026-11-01T00:00:00Z'));
    const changed = join(temporary, 'changed.crt');
    writeFileSync(changed, Buffer.concat([readFileSync(original.path), Buffer.from('\n')]));
    assert.throws(() => verifiedSupabaseCA(changed), /checksum mismatch/);
    writeFileSync(changed, '-----BEGIN PRIVATE KEY-----\nSYNTHETIC_MARKER_ONLY\n-----END PRIVATE KEY-----');
    assert.throws(() => verifiedSupabaseCA(changed), /public CA certificate only/);
    assert.throws(() => verifiedSupabaseCA(undefined, new Date('2032-01-01T00:00:00Z')), /validity period/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
