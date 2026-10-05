import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateRecords, summarizeReadingRecords } from '../src/features/account/accountSummaryLogic.ts';

const record = (book_id: string, status: 'finished' | 'currently_reading', reflection: string | null, updated_at: string) => ({ book_id, status, reflection, updated_at });

test('account reading summary counts unique finished books and non-empty private reviews', () => {
  const summary = summarizeReadingRecords([
    record('finished-book', 'finished', 'A useful idea', '2026-01-03'),
    record('current-book', 'currently_reading', '  ', '2026-01-02'),
    record('reopened-book', 'currently_reading', 'Still thinking about this', '2026-01-01'),
    record('finished-book', 'finished', 'Older duplicate', '2025-12-01'),
  ]);
  assert.equal(summary.finishedCount, 1);
  assert.equal(summary.currentCount, 2);
  assert.equal(summary.reviewCount, 2);
  assert.deepEqual(summary.records.map(item => item.book_id), ['finished-book', 'current-book', 'reopened-book']);
});

test('deduplication preserves the latest per-book record and a non-empty reopened review', () => {
  const latest = record('book', 'currently_reading', 'Still thinking', '2026-02-01');
  const older = record('book', 'finished', 'Older note', '2026-01-01');
  assert.deepEqual(deduplicateRecords([older, latest]), [latest]);
  assert.equal(summarizeReadingRecords([latest]).reviewCount, 1);
});
