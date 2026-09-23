import test from 'node:test';
import assert from 'node:assert/strict';
import { activeLoanStatus, checkoutPayloadMatches, correctionPayloadMatches, dateInTimeZone, resolutionPayloadMatches, validDueDate, validReturnCondition } from '../src/features/circulation/validation.ts';

test('circulation due dates accept only calendar-shaped ISO dates', () => {
  assert.equal(validDueDate('2026-09-16'), true);
  assert.equal(validDueDate('2024-02-29'), true);
  assert.equal(validDueDate('2026-02-29'), false);
  assert.equal(validDueDate('2026-02-31'), false);
  assert.equal(validDueDate('2026-13-01'), false);
  assert.equal(validDueDate('16-09-2026'), false);
  assert.equal(validDueDate(''), false);
});

test('centre-local dates and overdue status respect the policy timezone boundary', () => {
  const instant = new Date('2026-09-23T17:30:00.000Z');
  assert.equal(dateInTimeZone(instant, 'Asia/Ho_Chi_Minh'), '2026-09-24');
  assert.equal(dateInTimeZone(instant, 'America/Los_Angeles'), '2026-09-23');
  assert.equal(activeLoanStatus('2026-09-23', '2026-09-24'), 'overdue');
  assert.equal(activeLoanStatus('2026-09-24', '2026-09-24'), 'active');
  assert.equal(activeLoanStatus('2026-09-25', '2026-09-24'), 'active');
});

test('return condition accepts only usable or damaged copy states', () => {
  assert.equal(validReturnCondition('usable'), true);
  assert.equal(validReturnCondition('damaged'), true);
  assert.equal(validReturnCondition('lost'), false);
  assert.equal(validReturnCondition(null), false);
});

test('checkout retry payload must match borrower, copy, and due date', () => {
  const existing = { borrower_user_id: 'learner-1', copy_id: 'copy-1', due_date: '2026-09-30' };
  assert.equal(checkoutPayloadMatches(existing, { borrowerUserId: 'learner-1', copyId: 'copy-1', dueDate: '2026-09-30' }), true);
  assert.equal(checkoutPayloadMatches(existing, { borrowerUserId: 'learner-2', copyId: 'copy-1', dueDate: '2026-09-30' }), false);
  assert.equal(checkoutPayloadMatches(existing, { borrowerUserId: 'learner-1', copyId: 'copy-1', dueDate: '2026-10-01' }), false);
});

test('resolution and correction retries reject reused request ids with different payloads', () => {
  const returnedEvent = {
    loan_id: 'loan-1',
    event_type: 'returned',
    payload: { loan_id: 'loan-1', resolution: 'returned', return_condition: 'usable' },
  };
  assert.equal(resolutionPayloadMatches(returnedEvent, { loanId: 'loan-1', resolution: 'returned', returnCondition: 'usable' }), true);
  assert.equal(resolutionPayloadMatches(returnedEvent, { loanId: 'loan-1', resolution: 'returned', returnCondition: 'damaged' }), false);
  assert.equal(resolutionPayloadMatches(returnedEvent, { loanId: 'loan-1', resolution: 'lost' }), false);

  const correctionEvent = {
    loan_id: 'loan-1',
    event_type: 'correction',
    payload: { loan_id: 'loan-1', resolution: 'lost', return_condition: null },
  };
  assert.equal(correctionPayloadMatches(correctionEvent, { loanId: 'loan-1', resolution: 'lost' }), true);
  assert.equal(correctionPayloadMatches(correctionEvent, { loanId: 'loan-2', resolution: 'lost' }), false);
  assert.equal(correctionPayloadMatches(returnedEvent, { loanId: 'loan-1', resolution: 'returned', returnCondition: 'usable' }), false);
});
