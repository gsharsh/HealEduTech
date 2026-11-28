import { requestFailureMessage } from '../../lib/requestFeedback';
import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { StaffActionDialog } from '../admin/StaffActionDialog';
import { PublicCatalogueLink } from '../admin/WorkspaceNavigation';
import { listStaffLoans, notifyStaffDataChanged, type LoanFilter, type Page, type StaffLoan } from '../admin/staffData';
import { checkoutCopy, getCirculationPolicy, listActiveLoanCopyIds, listBorrowers, listCopies, resolveLoan, type Borrower, type CirculationCopy, type CirculationPolicy } from './data';
import { activeLoanStatus, dateInTimeZone } from './validation';
import { LoanFollowUp } from './LoanFollowUp';
import { staffPageNumber } from './followUpLogic';
import { createRefreshGate } from '../../lib/readCache';
import './translations';
import './circulation.css';

type PendingResolution = { loan: StaffLoan; resolution: 'returned' | 'lost'; condition?: 'usable' | 'damaged' };

const filters: LoanFilter[] = ['all', 'active', 'overdue', 'followup', 'returned', 'lost', 'due_soon', 'age_1_7', 'age_8_14', 'age_15_plus'];
const extraCopy = {
  en: { confirmTitle: 'Review loan resolution', confirm: 'Confirm resolution', cancel: 'Cancel', saving: 'Saving…', resolutionHelp: 'Check the student, copy, and condition. This closes the active loan and updates the copy’s availability.', savedCheckout: 'Checkout recorded.', savedResolution: 'Loan resolved.', stale: 'The desk could not refresh. Refresh before recording another change.', noLoansOnPage: 'There are no loans on this page.', firstPage: 'Go to first page', search: 'Search student, book title, or copy', searchButton: 'Search', status: 'Loan status', all: 'All loans', active: 'Active loans', overdue: 'All overdue', followup: 'Needs attention', returned: 'Returned', lost: 'Resolved as lost', due_soon: 'Due within seven days', age_1_7: '1–7 days overdue', age_8_14: '8–14 days overdue', age_15_plus: '15+ days overdue', previous: 'Previous', next: 'Next', page: 'Page', of: 'of', records: 'records', clear: 'Clear filters', filtered: 'Filtered by a linked student or book.', book: 'Book and copy', dates: 'Loan dates', checkedOut: 'Borrowed', contact: 'Last contact recorded', noContact: 'No contact recorded', days: 'days overdue', attention: 'Staff alert · seven or more days overdue', failed: 'Could not load circulation. Check your connection and staff access, then try again.', actions: 'Actions', refresh: 'Refresh', noOverdue: 'No overdue books.' },
  vi: { confirmTitle: 'Kiểm tra xử lý lượt mượn', confirm: 'Xác nhận xử lý', cancel: 'Hủy', saving: 'Đang lưu…', resolutionHelp: 'Hãy kiểm tra học sinh, mã bản sách và tình trạng. Thao tác này đóng lượt mượn và cập nhật khả năng cho mượn của bản sách.', savedCheckout: 'Đã ghi nhận mượn sách.', savedResolution: 'Đã xử lý lượt mượn.', stale: 'Chưa thể cập nhật bàn mượn trả. Hãy tải lại trước khi ghi nhận thay đổi tiếp theo.', noLoansOnPage: 'Không có lượt mượn trên trang này.', firstPage: 'Về trang đầu', search: 'Tìm học sinh, tên sách hoặc mã bản sách', searchButton: 'Tìm', status: 'Trạng thái mượn', all: 'Tất cả lượt mượn', active: 'Đang mượn', overdue: 'Tất cả sách quá hạn', followup: 'Cần chú ý', returned: 'Đã trả', lost: 'Đã ghi nhận mất', due_soon: 'Đến hạn trong bảy ngày', age_1_7: 'Quá hạn 1–7 ngày', age_8_14: 'Quá hạn 8–14 ngày', age_15_plus: 'Quá hạn từ 15 ngày', previous: 'Trước', next: 'Sau', page: 'Trang', of: '/', records: 'bản ghi', clear: 'Xóa bộ lọc', filtered: 'Đang lọc theo học sinh hoặc sách được liên kết.', book: 'Sách và mã bản sách', dates: 'Ngày mượn trả', checkedOut: 'Ngày mượn', contact: 'Liên hệ gần nhất đã ghi nhận', noContact: 'Chưa ghi nhận liên hệ', days: 'ngày quá hạn', attention: 'Thông báo cho nhân viên · quá hạn từ bảy ngày', failed: 'Chưa thể tải mượn trả. Hãy kiểm tra kết nối và quyền nhân viên rồi thử lại.', actions: 'Thao tác', refresh: 'Tải lại', noOverdue: 'Không có sách quá hạn.' },
};

export function CirculationPage() {
  const { t } = useTranslation();
  const { user, loading, accessStatus, canManageBooks } = useAccount();
  if (loading || accessStatus === 'loading') return <p role="status">{t('circulation.loading')}</p>;
  if (!user || !canManageBooks || accessStatus !== 'ready') return <section className="circulation-card"><p>{t('circulation.signIn')}</p><Link className="secondary" to="/sign-in?next=/staff/circulation">{t('auth.account')}</Link></section>;
  return <CirculationDesk key={user.id} />;
}

function CirculationDesk() {
  const { t, i18n } = useTranslation();
  const text = extraCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status') ?? 'all';
  const status: LoanFilter = filters.includes(rawStatus as LoanFilter) ? rawStatus as LoanFilter : 'all';
  const needsAttention = status === 'followup';
  const search = params.get('search') ?? '';
  const studentId = params.get('student') ?? undefined;
  const bookId = params.get('book') ?? undefined;
  const page = staffPageNumber(params.get('page'));
  const [revision, setRevision] = useState(0);
  const refreshGate = useRef(createRefreshGate(5_000));
  const refreshDesk = useCallback(() => {
    refreshGate.current(true);
    setRevision(value => value + 1);
  }, [setRevision]);
  const [desk, setDesk] = useState<{ borrowers: Borrower[]; copies: CirculationCopy[]; activeCopyIds: Set<string>; policy: CirculationPolicy } | null>(null);
  const [loanState, setLoanState] = useState<{ key: string; revision: number; value: Page<StaffLoan> } | null>(null);
  const [loanError, setLoanError] = useState<{ key: string; revision: number } | null>(null);
  const [error, setError] = useState('');
  const [deskError, setDeskError] = useState(false);
  const [deskRevision, setDeskRevision] = useState(-1);
  const [notice, setNotice] = useState<'savedCheckout' | 'savedResolution' | null>(null);
  const [pendingResolution, setPendingResolution] = useState<PendingResolution | null>(null);
  const mutationLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [borrowerId, setBorrowerId] = useState('');
  const [copyId, setCopyId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const checkoutRequestId = useRef(crypto.randomUUID());
  const resolutionRequestIds = useRef<Record<string, string>>({});
  const loanKey = JSON.stringify([search, status, studentId, bookId, page]);
  const loans = loanState?.key === loanKey ? loanState.value : null;
  const loanHasError = loanError?.key === loanKey && loanError.revision === revision;
  const loansUpdating = !loanHasError && (!loans || loanState?.revision !== revision);
  const deskStale = deskRevision !== revision;

  useEffect(() => {
    refreshGate.current(true); // The initial desk requests already revalidate this snapshot.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && refreshGate.current()) setRevision(value => value + 1);
    };
    window.addEventListener('focus', onVisibility);
    window.addEventListener('staff-data-changed', refreshDesk);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('focus', onVisibility); window.removeEventListener('staff-data-changed', refreshDesk); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refreshDesk]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([listBorrowers(controller.signal), listCopies(controller.signal), listActiveLoanCopyIds(controller.signal), getCirculationPolicy(controller.signal)])
      .then(([borrowers, copies, activeCopyIds, policy]) => {
        if (controller.signal.aborted) return;
        setDesk({ borrowers, copies, activeCopyIds, policy }); setDeskError(false); setDeskRevision(revision);
      }).catch(() => { if (!controller.signal.aborted) setDeskError(true); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    void listStaffLoans({ search: needsAttention ? '' : search, status: needsAttention ? 'overdue' : status, studentId: needsAttention ? undefined : studentId, bookId: needsAttention ? undefined : bookId, page, signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) { setLoanState({ key: loanKey, revision, value }); setLoanError(null); } })
      .catch(() => { if (!controller.signal.aborted) setLoanError({ key: loanKey, revision }); });
    return () => controller.abort();
  }, [search, status, studentId, bookId, page, revision, loanKey, needsAttention]);

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  }
  async function submitCheckout(event: FormEvent) {
    event.preventDefault(); if (mutationLock.current || deskStale || !canRecordCheckout) return;
    mutationLock.current = true; setBusy(true); setError(''); setNotice(null);
    try { await checkoutCopy(checkoutRequestId.current, borrowerId, copyId, dueDate); setDueDate(''); setCopyId(''); checkoutRequestId.current = crypto.randomUUID(); setNotice('savedCheckout'); notifyStaffDataChanged(); }
    catch (failure) { setError(requestFailureMessage(failure, i18n.language, t('circulation.failed'))); } finally { mutationLock.current = false; setBusy(false); }
  }
  async function finish(loan: StaffLoan, resolution: 'returned' | 'lost', condition?: 'usable' | 'damaged') {
    if (mutationLock.current || loansUpdating || loanHasError) return; mutationLock.current = true; setBusy(true); setError(''); setNotice(null);
    const actionKey = `${loan.id}:${resolution}:${condition ?? ''}`;
    const stableRequestId = resolutionRequestIds.current[actionKey] ?? crypto.randomUUID();
    resolutionRequestIds.current[actionKey] = stableRequestId;
    try { await resolveLoan(stableRequestId, loan.id, resolution, condition); delete resolutionRequestIds.current[actionKey]; setPendingResolution(null); setNotice('savedResolution'); notifyStaffDataChanged(); }
    catch (failure) { setError(requestFailureMessage(failure, i18n.language, t('circulation.failed'))); } finally { mutationLock.current = false; setBusy(false); }
  }

  if (!desk) return deskError ? <section className="circulation-card"><p role="alert">{text.failed}</p><button className="secondary" type="button" onClick={refreshDesk}>{t('circulation.retry')}</button></section> : <p role="status">{t('circulation.loading')}</p>;
  const { policy } = desk;
  const timezone = policy.timezone;
  const centreToday = dateInTimeZone(new Date(), timezone);
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-SG';
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
  const lendableCopies = desk.copies.filter(item => item.condition === 'usable' && !desk.activeCopyIds.has(item.id));
  const eligibleBorrowers = desk.borrowers.filter(item => item.eligible);
  const dueDateIsPast = dueDate !== '' && dueDate < centreToday;
  const canRecordCheckout = policy.enabled && eligibleBorrowers.some(item => item.user_id === borrowerId) && lendableCopies.some(item => item.id === copyId) && dueDate !== '' && !dueDateIsPast;
  const checkoutUnavailableKey = !policy.enabled ? 'circulation.checkoutDisabled' : eligibleBorrowers.length === 0 ? 'circulation.noBorrowersAction' : lendableCopies.length === 0 ? 'circulation.noCopiesAction' : null;
  function loanStatusKey(loan: StaffLoan) {
    if (!loan.resolved_at) return `circulation.${activeLoanStatus(loan.due_date, centreToday)}`;
    if (loan.resolution === 'lost') return 'circulation.resolvedLost';
    return loan.return_condition === 'damaged' ? 'circulation.resolvedDamaged' : 'circulation.resolvedUsable';
  }

  if (needsAttention) return <section className="staff-oversight">
    <header className="staff-oversight__heading workspace-heading-surface"><div><h1>{text.followup}</h1></div></header>
    {loanHasError && <p role="alert" className="form-error">{text.failed}</p>}
    {!loans ? !loanHasError && <p role="status">{t('circulation.loading')}</p> : loans.items.length === 0 ? <p className="staff-oversight__empty">{text.noOverdue}</p> : <>
      <div className="staff-oversight__table-wrap" tabIndex={0} role="region" aria-label={text.followup}><table className="staff-oversight__table"><thead><tr><th scope="col">{t('circulation.borrower')}</th><th scope="col">{text.book}</th></tr></thead><tbody>{loans.items.map(loan => <tr key={loan.id}><td><Link to={`/staff/students/${loan.borrower_user_id}`}>{loan.borrower_name}</Link></td><td><Link to={`/library/${loan.book_id}`}>{(i18n.language === 'vi' ? loan.title_vi : loan.title_en) || loan.title_en}</Link></td></tr>)}</tbody></table></div>
      <nav className="circulation-pagination" aria-label={text.followup}><button type="button" className="secondary" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>{text.previous}</button><span>{text.page} {page} {text.of} {Math.max(1, Math.ceil(loans.total / loans.page_size))}</span><button type="button" className="secondary" disabled={page * loans.page_size >= loans.total} onClick={() => updateParam('page', String(page + 1))}>{text.next}</button></nav>
    </>}
  </section>;

  return <>
    {pendingResolution && <StaffActionDialog title={text.confirmTitle} confirmLabel={busy ? text.saving : text.confirm} cancelLabel={text.cancel} busy={busy} onConfirm={() => void finish(pendingResolution.loan, pendingResolution.resolution, pendingResolution.condition)} onCancel={() => { setPendingResolution(null); setError(''); }}>
      <p>{text.resolutionHelp}</p>
      <p><strong>{pendingResolution.loan.borrower_name}</strong><br />{pendingResolution.loan.inventory_code} · {(i18n.language === 'vi' ? pendingResolution.loan.title_vi : pendingResolution.loan.title_en) || pendingResolution.loan.title_en}</p>
      <p><strong>{t(pendingResolution.resolution === 'lost' ? 'circulation.resolvedLost' : pendingResolution.condition === 'damaged' ? 'circulation.resolvedDamaged' : 'circulation.resolvedUsable')}</strong></p>
      {error && <p role="alert" className="form-error">{error}</p>}
    </StaffActionDialog>}
    <PublicCatalogueLink />
    <div className="page-heading workspace-heading-surface"><div><h1>{t('circulation.title')}</h1><p>{t('circulation.body')}</p></div></div>
    {error && !pendingResolution && <p role="alert" className="form-error">{error}</p>}
    {notice && <p className="circulation-notice" role="status">{text[notice]}</p>}
    {deskError && <div className="circulation-notice circulation-notice--error"><p role="alert">{text.stale}</p><button className="secondary" type="button" onClick={refreshDesk}>{text.refresh}</button></div>}
    <div className="circulation-grid">
      {!needsAttention && <section className="circulation-card"><h2>{t('circulation.checkout')}</h2><form className="circulation-form" onSubmit={event => void submitCheckout(event)}><fieldset disabled={busy || deskStale}>
        {checkoutUnavailableKey && <p className="circulation-muted">{t(checkoutUnavailableKey)}</p>}
        <label>{t('circulation.borrower')}<select value={borrowerId} onChange={event => { setBorrowerId(event.target.value); checkoutRequestId.current = crypto.randomUUID(); }} required disabled={eligibleBorrowers.length === 0}><option value="">{t('circulation.chooseBorrower')}</option>{eligibleBorrowers.map(item => <option key={item.user_id} value={item.user_id}>{item.display_name}</option>)}</select></label>
        <label>{t('circulation.copy')}<select value={copyId} onChange={event => { setCopyId(event.target.value); checkoutRequestId.current = crypto.randomUUID(); }} required disabled={lendableCopies.length === 0}><option value="">{t('circulation.chooseCopy')}</option>{lendableCopies.map(item => <option key={item.id} value={item.id}>{item.inventory_code} · {(i18n.language === 'vi' ? item.books?.title_vi : item.books?.title_en) || item.books?.title_en || item.book_id}</option>)}</select></label>
        <label>{t('circulation.dueDate')}<input type="date" min={centreToday} value={dueDate} onChange={event => { setDueDate(event.target.value); checkoutRequestId.current = crypto.randomUUID(); }} required aria-invalid={dueDateIsPast} aria-describedby={dueDateIsPast ? 'circulation-due-error' : undefined} /></label>
        {dueDateIsPast && <p className="form-error" id="circulation-due-error" role="alert">{t('circulation.pastDueDate', { date: formatDate(centreToday) })}</p>}
        <button className="primary" disabled={busy || !canRecordCheckout}>{t('circulation.checkout')}</button>
      </fieldset></form></section>}
      <section className="circulation-card circulation-wide" aria-busy={loansUpdating}><div className="circulation-section-heading"><h2>{needsAttention ? text.followup : t('circulation.loans')}</h2>{!needsAttention && <button className="secondary" type="button" onClick={refreshDesk}>{text.refresh}</button>}</div>
        {!needsAttention && <div className="circulation-filters"><form onSubmit={event => { event.preventDefault(); updateParam('search', String(new FormData(event.currentTarget).get('search') ?? '').trim()); }}><label htmlFor="loan-search">{text.search}</label><div className="circulation-search"><input key={search} id="loan-search" name="search" type="search" defaultValue={search} maxLength={200} /><button className="primary circulation-search__button" type="submit">{text.searchButton}</button></div></form><label htmlFor="loan-status">{text.status}<select id="loan-status" value={status} onChange={event => updateParam('status', event.target.value)}>{filters.filter(value => value !== 'followup').map(value => <option key={value} value={value}>{text[value]}</option>)}</select></label></div>}
        {(studentId || bookId || search || status !== 'all') && <p className="circulation-filter-note">{(studentId || bookId) && text.filtered} <button type="button" className="secondary" onClick={() => setParams({})}>{text.clear}</button></p>}
        {loanHasError && <p role="alert" className="form-error">{text.failed}</p>}
        {!loans ? !loanHasError && <p role="status">{t('circulation.loading')}</p> : loans.items.length === 0 ? <div className="circulation-empty"><p className="circulation-muted">{page > 1 ? text.noLoansOnPage : t('circulation.noLoans')}</p>{page > 1 && <button className="secondary" type="button" onClick={() => updateParam('page', '1')}>{text.firstPage}</button>}</div> : <>
          <p className="circulation-muted">{loans.total} {text.records}</p>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={t('circulation.loans')}><table className="circulation-table"><thead><tr><th scope="col">{t('circulation.borrower')}</th><th scope="col">{text.book}</th><th scope="col">{text.dates}</th><th scope="col">{t('status')}</th><th scope="col">{text.contact}</th><th scope="col">{text.actions}</th></tr></thead><tbody>{loans.items.map(loan => {
            const statusKey = loanStatusKey(loan);
            return <Fragment key={loan.id}><tr><td><Link to={`/staff/students/${loan.borrower_user_id}`}>{loan.borrower_name}</Link><small className="circulation-meta">{loan.borrower_email}</small></td><td><Link to={`/library/${loan.book_id}`}>{(i18n.language === 'vi' ? loan.title_vi : loan.title_en) || loan.title_en}</Link><small className="circulation-meta">{loan.inventory_code}</small></td><td><span className="circulation-meta">{text.checkedOut}: {formatTime(loan.checked_out_at)}</span><span className="circulation-meta">{t('circulation.dueOn', { date: formatDate(loan.due_date) })}</span></td><td><span className={statusKey === 'circulation.overdue' ? 'loan-status loan-status--overdue' : 'loan-status'}>{t(statusKey)}</span>{!loan.resolved_at && loan.days_overdue > 0 && <small className="circulation-meta">{loan.days_overdue} {text.days}</small>}{!loan.resolved_at && loan.days_overdue >= 7 && <small className="circulation-meta circulation-attention">{text.attention}</small>}</td><td>{loan.latest_contact_at ? <><span>{formatTime(loan.latest_contact_at)}</span><small className="circulation-meta">{loan.latest_contact_by}</small></> : text.noContact}</td><td>{!loan.resolved_at && <div className="circulation-actions"><button type="button" className="secondary" disabled={busy || loansUpdating || !!loanHasError} onClick={() => { setError(''); setPendingResolution({ loan, resolution: 'returned', condition: 'usable' }); }}>{t('circulation.return')}</button><button type="button" className="secondary" disabled={busy || loansUpdating || !!loanHasError} onClick={() => { setError(''); setPendingResolution({ loan, resolution: 'returned', condition: 'damaged' }); }}>{t('circulation.damaged')}</button><button type="button" className="secondary" disabled={busy || loansUpdating || !!loanHasError} onClick={() => { setError(''); setPendingResolution({ loan, resolution: 'lost' }); }}>{t('circulation.lost')}</button></div>}</td></tr>{((!loan.resolved_at && loan.days_overdue > 0) || loan.latest_contact_at) && <tr className="circulation-followup-row"><td colSpan={6}><LoanFollowUp loan={loan} timezone={timezone} /></td></tr>}</Fragment>;
          })}</tbody></table></div>
          <nav className="circulation-pagination" aria-label={t('circulation.loans')}><button type="button" className="secondary" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>{text.previous}</button><span>{text.page} {page} {text.of} {Math.max(1, Math.ceil(loans.total / loans.page_size))}</span><button type="button" className="secondary" disabled={page * loans.page_size >= loans.total} onClick={() => updateParam('page', String(page + 1))}>{text.next}</button></nav>
        </>}
      </section>
    </div>
  </>;
}
