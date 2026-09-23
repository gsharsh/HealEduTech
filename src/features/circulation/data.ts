import { supabase } from '../../lib/supabase';

export type CopyCondition = 'usable' | 'damaged' | 'lost' | 'withdrawn';
export type LoanResolution = 'returned' | 'lost';

export interface Borrower {
  user_id: string;
  display_name: string;
  eligible: boolean;
}

export interface CirculationCopy {
  id: string;
  book_id: string;
  inventory_code: string;
  condition: CopyCondition;
  shelf_location: string;
  books?: { title_en: string; title_vi: string } | null;
}

export interface Loan {
  id: string;
  borrower_user_id: string;
  copy_id: string;
  checked_out_at: string;
  due_date: string;
  resolved_at: string | null;
  resolution: LoanResolution | null;
  return_condition: 'usable' | 'damaged' | null;
  book_copies?: { inventory_code: string; books?: { title_en: string; title_vi: string } | null } | null;
}

export interface CirculationPolicy {
  enabled: boolean;
  max_active_loans: number;
  timezone: string;
}

function requireClient() {
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

export async function getCirculationPolicy() {
  const { data, error } = await requireClient().from('circulation_policy')
    .select('enabled,max_active_loans,timezone').eq('id', 1).single();
  if (error) throw error;
  return data as CirculationPolicy;
}

export async function listBorrowers() {
  const { data, error } = await requireClient().from('circulation_borrowers')
    .select('user_id,display_name,eligible').order('display_name');
  if (error) throw error;
  return data as Borrower[];
}

export async function listCopies() {
  const { data, error } = await requireClient().from('book_copies')
    .select('id,book_id,inventory_code,condition,shelf_location,books(title_en,title_vi)')
    .order('inventory_code');
  if (error) throw error;
  return data as unknown as CirculationCopy[];
}

export async function listLoans(scope: 'own' | 'staff' = 'own', options: { userId?: string; signal?: AbortSignal } = {}) {
  if (scope === 'own') {
    if (!options.userId) throw new Error('User id is required for own loans');
    let request = requireClient().rpc('list_my_loans');
    if (options.signal) request = request.abortSignal(options.signal);
    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []) as unknown as Loan[];
  }
  let query = requireClient().from('loans')
    .select('id,borrower_user_id,copy_id,checked_out_at,due_date,resolved_at,resolution,return_condition,book_copies(inventory_code,books(title_en,title_vi))')
    .order('resolved_at', { ascending: true, nullsFirst: true }).order('due_date');
  if (options.signal) query = query.abortSignal(options.signal);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Loan[];
}

export async function configureCirculation(enabled: boolean, maxActiveLoans: number, timezone: string) {
  const { data, error } = await requireClient().rpc('configure_circulation', {
    p_enabled: enabled, p_max_active_loans: maxActiveLoans, p_timezone: timezone,
  });
  if (error) throw error;
  return data;
}

export async function registerBorrower(userId: string, displayName: string) {
  const { data, error } = await requireClient().rpc('register_circulation_borrower', {
    p_user_id: userId, p_display_name: displayName,
  });
  if (error) throw error;
  return data as Borrower;
}

export async function setBorrowerEligibility(userId: string, eligible: boolean) {
  const { data, error } = await requireClient().rpc('set_circulation_borrower_eligibility', {
    p_user_id: userId, p_eligible: eligible,
  });
  if (error) throw error;
  return data as Borrower;
}

export async function checkoutCopy(requestId: string, borrowerUserId: string, copyId: string, dueDate: string) {
  const { data, error } = await requireClient().rpc('checkout_circulation_copy', {
    p_request_id: requestId, p_borrower_user_id: borrowerUserId, p_copy_id: copyId, p_due_date: dueDate,
  });
  if (error) throw error;
  return data as Loan;
}

export async function resolveLoan(requestId: string, loanId: string, resolution: LoanResolution, returnCondition?: 'usable' | 'damaged') {
  const { data, error } = await requireClient().rpc('resolve_circulation_loan', {
    p_request_id: requestId, p_loan_id: loanId, p_resolution: resolution, p_return_condition: returnCondition ?? null,
  });
  if (error) throw error;
  return data as Loan;
}
