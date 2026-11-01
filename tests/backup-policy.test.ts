import assert from 'node:assert/strict';
import test from 'node:test';
import { backupArtifactName, validateAgeRecipient, validateArtifactBudget, MAX_ENCRYPTED_BACKUP_BYTES, MAX_REPOSITORY_ARTIFACT_BYTES, AGE_RELEASES } from '../scripts/backup-policy.ts';

const date = new Date('2026-11-01T02:17:00Z');
const recipient = 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';

test('backup policy accepts only a standard public age recipient', () => {
  assert.equal(validateAgeRecipient(recipient), recipient);
  assert.throws(() => validateAgeRecipient('AGE-SECRET-KEY-1-do-not-log'), /public recipient/);
  assert.throws(() => validateAgeRecipient('age1bad\n--identity=secret'), /public recipient/);
  assert.throws(() => validateAgeRecipient(undefined), /public recipient/);
});

test('backup policy caps individual artifacts and total repository storage', () => {
  assert.equal(backupArtifactName(date), 'evg-db-backup-2026-11-01');
  assert.throws(() => validateArtifactBudget([], MAX_ENCRYPTED_BACKUP_BYTES + 1, date), /10 MiB/);
  assert.throws(() => validateArtifactBudget([{ name: 'other-workflow', size_in_bytes: MAX_REPOSITORY_ARTIFACT_BYTES, expired: false }], 1, date), /200 MiB/);
  assert.equal(validateArtifactBudget([{ name: 'expired', size_in_bytes: MAX_REPOSITORY_ARTIFACT_BYTES, expired: true }], 1, date).existing_bytes, 0);
  assert.throws(() => validateArtifactBudget([{ name: 'bad', size_in_bytes: -1, expired: false }], 1, date), /invalid artifact/);
});

test('backup policy keeps the first successful daily backup and refuses a second', () => {
  assert.throws(() => validateArtifactBudget([{ name: 'evg-db-backup-2026-11-01', size_in_bytes: 100, expired: false }], 100, date), /already exists/);
  assert.equal(validateArtifactBudget([{ name: 'evg-db-backup-2026-10-31', size_in_bytes: 100, expired: false }], 100, date).artifact_name, 'evg-db-backup-2026-11-01');
});

test('official age release pins are fixed SHA-256 values for supported runner platforms', () => {
  assert.equal(AGE_RELEASES['linux-x64'].asset, 'linux-amd64');
  assert.equal(AGE_RELEASES['darwin-arm64'].asset, 'darwin-arm64');
  for (const release of Object.values(AGE_RELEASES)) assert.match(release.sha256, /^[a-f0-9]{64}$/);
});
