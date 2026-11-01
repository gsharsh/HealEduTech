/** Explicit integration test: EVG_AGE_BINARY points to the verified official age installation. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { encryptBackup, inspectEncryptedBackup } from '../scripts/encrypt-backup.ts';
import { MAX_BACKUP_SOURCE_BYTES, MAX_ENCRYPTED_BACKUP_BYTES } from '../scripts/backup-policy.ts';

const ageBinary = process.env.EVG_AGE_BINARY;
if (!ageBinary) throw new Error('Set EVG_AGE_BINARY to a checksum-verified official age binary before this explicit integration test.');
const age: string = ageBinary;
function run(tool: string, args: string[]) {
  const result = spawnSync(tool, args, { encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) throw new Error(`${tool.split('/').at(-1)} failed during the synthetic encryption test.`);
  return result.stdout;
}
const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');

test('official age preserves the export and rejects wrong keys, tampering and unsafe bundles', async () => {
  const temporary = mkdtempSync(join(tmpdir(), 'evg-encrypted-backup-test-'));
  chmodSync(temporary, 0o700);
  try {
    const keygen = join(dirname(age), 'age-keygen');
    const identity = join(temporary, 'synthetic-key.txt');
    const otherIdentity = join(temporary, 'different-synthetic-key.txt');
    run(keygen, ['--output', identity]);
    run(keygen, ['--output', otherIdentity]);
    const recipient = run(keygen, ['-y', identity]).trim();
    const source = join(temporary, 'plain');
    mkdirSync(source, { mode: 0o700 });
    const dump = Buffer.from('SYNTHETIC_DATABASE_CONTENT_DO_NOT_USE_REAL_RECORDS');
    const roles = Buffer.from('create role synthetic_reader;\n');
    writeFileSync(join(source, 'database.dump'), dump, { mode: 0o600 });
    writeFileSync(join(source, 'roles.sql'), roles, { mode: 0o600 });
    const manifest = { mode: 'backup', status: 'exported_not_yet_restore_verified', files: { 'database.dump': digest(dump), 'roles.sql': digest(roles) } };
    writeFileSync(join(source, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
    const encrypted = join(temporary, 'encrypted');
    const result = await encryptBackup({ source, output: encrypted, recipient, ageBinary: age });
    assert.ok(result.reserved_artifact_bytes <= MAX_ENCRYPTED_BACKUP_BYTES);
    assert.equal(statSync(result.cipher_file).mode & 0o777, 0o600);
    assert.equal(readFileSync(result.cipher_file).includes(dump), false);
    const archive = join(temporary, 'restored.tar');
    run(age, ['--decrypt', '--identity', identity, '--output', archive, result.cipher_file]);
    const restored = join(temporary, 'restored');
    mkdirSync(restored, { mode: 0o700 });
    run('tar', ['-xf', archive, '-C', restored]);
    assert.deepEqual(readFileSync(join(restored, 'database.dump')), dump);
    assert.deepEqual(readFileSync(join(restored, 'roles.sql')), roles);
    assert.deepEqual(JSON.parse(readFileSync(join(restored, 'manifest.json'), 'utf8')), manifest);
    const wrongKey = spawnSync(age, ['--decrypt', '--identity', otherIdentity, '--output', join(temporary, 'wrong-key.tar'), result.cipher_file], { encoding: 'utf8', timeout: 30000 });
    assert.notEqual(wrongKey.status, 0);
    const tampered = join(temporary, 'tampered.age');
    copyFileSync(result.cipher_file, tampered);
    const bytes = readFileSync(tampered); bytes[bytes.length - 1] ^= 1; writeFileSync(tampered, bytes, { mode: 0o600 });
    const corrupt = spawnSync(age, ['--decrypt', '--identity', identity, '--output', join(temporary, 'tampered.tar'), tampered], { encoding: 'utf8', timeout: 30000 });
    assert.notEqual(corrupt.status, 0);
    writeFileSync(join(encrypted, 'unexpected-plaintext.sql'), 'synthetic only', { mode: 0o600 });
    await assert.rejects(inspectEncryptedBackup(encrypted), /ciphertext and its checksum only/);
    writeFileSync(join(source, 'roles.sql'), 'synthetic changed role data', { mode: 0o600 });
    await assert.rejects(encryptBackup({ source, output: join(temporary, 'must-not-exist'), recipient, ageBinary: age }), /checksum mismatch/);
    truncateSync(join(source, 'database.dump'), MAX_BACKUP_SOURCE_BYTES + 1);
    await assert.rejects(encryptBackup({ source, output: join(temporary, 'must-not-exist-either'), recipient, ageBinary: age }), /9 MiB/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
