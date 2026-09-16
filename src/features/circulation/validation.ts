export function validDueDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validReturnCondition(value: string | null | undefined) {
  return value === 'usable' || value === 'damaged';
}

export function checkoutPayloadMatches(existing: { borrower_user_id: string; copy_id: string; due_date: string }, payload: { borrowerUserId: string; copyId: string; dueDate: string }) {
  return existing.borrower_user_id === payload.borrowerUserId && existing.copy_id === payload.copyId && existing.due_date === payload.dueDate;
}

export function resolutionPayloadMatches(
  existing: { loan_id: string; event_type: string; payload: { resolution?: string; return_condition?: string | null; loan_id?: string } },
  payload: { loanId: string; resolution: string; returnCondition?: string | null },
) {
  return existing.loan_id === payload.loanId
    && existing.event_type === payload.resolution
    && existing.payload.loan_id === payload.loanId
    && existing.payload.resolution === payload.resolution
    && (existing.payload.return_condition ?? null) === (payload.returnCondition ?? null);
}

export function correctionPayloadMatches(
  existing: { loan_id: string; event_type: string; payload: { resolution?: string; return_condition?: string | null; loan_id?: string } },
  payload: { loanId: string; resolution: string; returnCondition?: string | null },
) {
  return existing.loan_id === payload.loanId
    && existing.event_type === 'correction'
    && existing.payload.loan_id === payload.loanId
    && existing.payload.resolution === payload.resolution
    && (existing.payload.return_condition ?? null) === (payload.returnCondition ?? null);
}
