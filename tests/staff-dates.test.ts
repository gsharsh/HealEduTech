import test from 'node:test';
import assert from 'node:assert/strict';
import { staffDate } from '../src/features/admin/staffOversightCopy.ts';

test('calendar-only staff dates keep their day across centre timezones', () => {
  assert.equal(staffDate('2026-10-26', 'en', false, 'Pacific/Kiritimati'), '26 Oct 2026');
  assert.equal(staffDate('2026-10-26', 'en', false, 'America/Los_Angeles'), '26 Oct 2026');
  assert.equal(staffDate(null, 'en'), '—');
});

test('staff timestamp dates use the configured centre timezone', () => {
  assert.equal(staffDate('2026-10-26T00:30:00Z', 'en', false, 'America/Los_Angeles'), '25 Oct 2026');
  assert.equal(staffDate('2026-10-26T00:30:00Z', 'en', false, 'Asia/Ho_Chi_Minh'), '26 Oct 2026');
});
