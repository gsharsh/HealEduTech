import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHostedMigrationVersions } from '../scripts/release-migrations.ts';

test('migration parity reads the Remote column and rejects local-only versions', () => {
  const versions = parseHostedMigrationVersions(`
  Local          | Remote         | Time (UTC)
  ----------------|----------------|------------
  20260911082847 | 20260911082847 | 2026-09-11
  20261026090000 |                | 2026-10-26
  `);
  assert.equal(versions.has('20260911082847'), true);
  assert.equal(versions.has('20261026090000'), false);
});

test('migration parity supports remote query exports and strict version lists', () => {
  assert.deepEqual([...parseHostedMigrationVersions('[{"version":"20260911082847"}]')], ['20260911082847']);
  assert.deepEqual([...parseHostedMigrationVersions('20260911082847\n20261026090000')], ['20260911082847', '20261026090000']);
  assert.deepEqual([...parseHostedMigrationVersions('[]')], []);
  assert.throws(() => parseHostedMigrationVersions('Local version 20260911082847'), /Supply a JSON/);
  assert.throws(() => parseHostedMigrationVersions('[{"version":"incorrect"}]'), /fourteen-digit/);
});
