import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEmailReminder, needsStaffFollowUp, overdueDays, staffPageNumber } from '../src/features/circulation/followUpLogic.ts';
import { dateInTimeZone } from '../src/features/circulation/validation.ts';

const loan = { borrower_name: 'An', borrower_email: 'an+library@example.com', preferred_language: 'en' as 'en' | 'vi', title_en: 'Birds & Bees? #1', title_vi: 'Chim & ong', inventory_code: 'EVG/1', due_date: '2026-10-19', days_overdue: 7 };

test('follow-up starts at seven centre-local calendar days and stops on resolution', () => {
  assert.equal(overdueDays('2026-10-26', '2026-10-26'), 0);
  assert.equal(overdueDays('2026-10-25', '2026-10-26'), 1);
  assert.equal(needsStaffFollowUp('2026-10-20', '2026-10-26', null), false);
  assert.equal(needsStaffFollowUp('2026-10-19', '2026-10-26', null), true);
  assert.equal(needsStaffFollowUp('2026-10-19', '2026-10-26', '2026-10-26T00:00:00Z'), false);
  assert.equal(overdueDays('2026-10-27', '2026-10-26'), 0);
  const justBefore = dateInTimeZone(new Date('2026-10-25T16:59:59Z'), 'Asia/Ho_Chi_Minh');
  const justAfter = dateInTimeZone(new Date('2026-10-25T17:00:00Z'), 'Asia/Ho_Chi_Minh');
  assert.equal(needsStaffFollowUp('2026-10-19', justBefore, null), false);
  assert.equal(needsStaffFollowUp('2026-10-19', justAfter, null), true);
});

test('email drafts preserve special characters without introducing URI headers', () => {
  const draft = makeEmailReminder({ ...loan, title_en: 'Birds\r\nBcc:other@example.com & ?#' });
  assert.ok(draft.href);
  const url = new URL(draft.href);
  assert.equal(decodeURIComponent(url.pathname), loan.borrower_email);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  assert.equal(url.searchParams.get('subject')?.includes('\n'), false);
  assert.equal(url.searchParams.get('body'), draft.body);
  assert.match(draft.body, /2026-10-19/);
  assert.match(draft.body, /EVG\/1/);
  assert.match(draft.body, /7 day/);
});

test('email recipient is required and Vietnamese templates use student preference', () => {
  assert.equal(makeEmailReminder({ ...loan, borrower_email: null }).href, null);
  assert.equal(makeEmailReminder({ ...loan, borrower_email: 'student@example.com?bcc=other@example.com' }).href, null);
  assert.equal(makeEmailReminder({ ...loan, borrower_email: 'a@example.com\r\nBcc:b@example.com' }).href, null);
  const draft = makeEmailReminder({ ...loan, preferred_language: 'vi' });
  assert.match(draft.subject, /Nhắc trả sách Chim & ong/);
  assert.match(draft.body, /Chào An/);
  assert.equal(new URL(draft.href!).searchParams.get('body'), draft.body);
});

test('staff page parameters reject partial numbers and cap huge values', () => {
  for (const value of [null, '', '-2', '2.5', '3junk', 'Infinity']) assert.equal(staffPageNumber(value), 1);
  assert.equal(staffPageNumber('0'), 1);
  assert.equal(staffPageNumber('25'), 25);
  assert.equal(staffPageNumber('1000001'), 1000000);
  assert.equal(staffPageNumber('9'.repeat(500)), 1000000);
});
