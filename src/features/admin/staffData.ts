import { supabase } from '../../lib/supabase';

export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
export interface StudentSummary {
  user_id: string; display_name: string; email: string | null; preferred_language: 'en' | 'vi';
  created_at: string; registered: boolean; eligible: boolean;
  currently_reading_count: number; finished_count: number; active_loan_count: number; overdue_loan_count: number;
}
export interface StaffReadingBook { book_id: string; title_en: string; title_vi: string; status: 'currently_reading' | 'finished' }
export interface StaffLoan {
  id: string; borrower_user_id: string; borrower_name: string; borrower_email: string | null;
  preferred_language: 'en' | 'vi'; copy_id: string; inventory_code: string; book_id: string;
  title_en: string; title_vi: string; checked_out_at: string; due_date: string;
  resolved_at: string | null; resolution: 'returned' | 'lost' | null; return_condition: 'usable' | 'damaged' | null;
  days_overdue: number; latest_contact_at: string | null; latest_contact_by: string | null;
}
export type LoanFilter = 'all' | 'active' | 'overdue' | 'followup' | 'returned' | 'lost' | 'due_soon' | 'age_1_7' | 'age_8_14' | 'age_15_plus';
export interface LoanContact { id: string; loan_id: string; actor_user_id: string | null; actor_name: string; contacted_at: string; channel: 'email' }
export interface StaffDashboardStats {
  timezone: string; as_of_date: string;
  loan_health: { active: number; borrowers: number; overdue: number; due_soon: number; followup: number };
  ageing: { days_1_7: number; days_8_14: number; days_15_plus: number };
  reading: { students_reading: number; finished: number };
  inventory: { available: number; borrowed: number; damaged: number; lost: number };
  trends: { week: string; checkouts: number; returns: number }[];
  popular: { book_id: string; title_en: string; title_vi: string; checkouts: number }[];
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  if (!supabase) throw new Error('Database is not configured');
  let request = supabase.rpc(name, args);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data as T;
}

export function listStudents(options: { search?: string; page?: number; pageSize?: number; filter?: string; signal?: AbortSignal } = {}) {
  return rpc<Page<StudentSummary>>('staff_list_students', { p_search: options.search ?? '', p_page: options.page ?? 1, p_page_size: options.pageSize ?? 25, p_filter: options.filter ?? 'all' }, options.signal);
}
export function getStudent(userId: string, signal?: AbortSignal) {
  return rpc<StudentSummary | null>('staff_get_student', { p_user_id: userId }, signal);
}
export function listStudentReading(userId: string, options: { page?: number; pageSize?: number; status?: string; signal?: AbortSignal } = {}) {
  return rpc<Page<StaffReadingBook>>('staff_list_student_reading', { p_user_id: userId, p_page: options.page ?? 1, p_page_size: options.pageSize ?? 25, p_status: options.status ?? 'all' }, options.signal);
}
export function listStaffLoans(options: { search?: string; status?: LoanFilter; studentId?: string; bookId?: string; page?: number; pageSize?: number; signal?: AbortSignal } = {}) {
  return rpc<Page<StaffLoan>>('staff_list_loans', { p_search: options.search ?? '', p_status: options.status ?? 'all', p_student_id: options.studentId ?? null, p_book_id: options.bookId ?? null, p_page: options.page ?? 1, p_page_size: options.pageSize ?? 25 }, options.signal);
}
export function getStaffDashboard(weeks = 12, signal?: AbortSignal) {
  return rpc<StaffDashboardStats>('staff_dashboard_stats', { p_weeks: weeks }, signal);
}
export function getStaffAlertCount(signal?: AbortSignal) { return rpc<number>('staff_alert_count', {}, signal); }
export function listLoanContacts(loanId: string, signal?: AbortSignal) { return rpc<LoanContact[]>('staff_list_loan_contacts', { p_loan_id: loanId }, signal); }
export async function recordLoanContact(requestId: string, loanId: string) {
  const contact = await rpc<LoanContact>('staff_record_loan_contact', { p_request_id: requestId, p_loan_id: loanId });
  notifyStaffDataChanged();
  return contact;
}
export function notifyStaffDataChanged() { window.dispatchEvent(new Event('staff-data-changed')); }
