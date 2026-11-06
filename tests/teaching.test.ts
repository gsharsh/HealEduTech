import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordedReadingDays } from '../src/features/admin/teachingCopy.ts';

test('recorded reading intervals do not invent durations for missing, malformed or reversed dates', () => {
  assert.equal(recordedReadingDays(null, '2026-11-07T00:00:00Z'), null);
  assert.equal(recordedReadingDays('invalid', '2026-11-07T00:00:00Z'), null);
  assert.equal(recordedReadingDays('2026-11-07T00:00:00Z', '2026-11-01T00:00:00Z'), null);
  assert.equal(recordedReadingDays('2026-11-01T00:00:00Z', '2026-11-07T23:00:00Z'), 6);
  assert.equal(recordedReadingDays('2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z'), 0);
});
