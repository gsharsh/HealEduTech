import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount, type StaffRole } from '../auth/context';
import { WorkspaceNavigation } from '../admin/WorkspaceNavigation';
import { checkoutCopy, configureCirculation, getCirculationPolicy, listBorrowers, listCopies, listLoans, registerBorrower, resolveLoan, type Borrower, type CirculationCopy, type CirculationPolicy, type Loan } from './data';
import { activeLoanStatus, dateInTimeZone } from './validation';
import './translations';
import './circulation.css';

function requestId() { return crypto.randomUUID(); }

export function CirculationPage() {
  const { t } = useTranslation();
  const { user, loading, canManageBooks, staffRole } = useAccount();
  if (loading) return <p role="status">{t('circulation.loading')}</p>;
  if (!user || !canManageBooks) return <section className="circulation-card"><p>{t('circulation.signIn')}</p><Link className="secondary" to="/sign-in?next=/staff/circulation">{t('auth.account')}</Link></section>;
  return <CirculationDesk key={user.id} staffRole={staffRole} />;
}

function CirculationDesk({ staffRole }: { staffRole: StaffRole | null }) {
  const { t, i18n } = useTranslation();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [copies, setCopies] = useState<CirculationCopy[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [policy, setPolicy] = useState<CirculationPolicy | null>(null);
  const [policyDraft, setPolicyDraft] = useState({ enabled: false, maxActiveLoans: 1, timezone: 'Asia/Ho_Chi_Minh' });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [copyId, setCopyId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState(() => crypto.randomUUID());
  const [resolutionRequestIds, setResolutionRequestIds] = useState<Record<string, string>>({});
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');

  function applyDeskData(nextBorrowers: Borrower[], nextCopies: CirculationCopy[], nextLoans: Loan[], nextPolicy: CirculationPolicy) {
    setBorrowers(nextBorrowers);
    setCopies(nextCopies);
    setLoans(nextLoans);
    setPolicy(nextPolicy);
    setPolicyDraft({ enabled: nextPolicy.enabled, maxActiveLoans: nextPolicy.max_active_loans, timezone: nextPolicy.timezone });
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([listBorrowers(), listCopies(), listLoans('staff'), getCirculationPolicy()])
      .then(([nextBorrowers, nextCopies, nextLoans, nextPolicy]) => { if (active) applyDeskData(nextBorrowers, nextCopies, nextLoans, nextPolicy); })
      .catch(() => { if (active) setError('circulation.failed'); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setError('');
    const [nextBorrowers, nextCopies, nextLoans, nextPolicy] = await Promise.all([listBorrowers(), listCopies(), listLoans('staff'), getCirculationPolicy()]);
    applyDeskData(nextBorrowers, nextCopies, nextLoans, nextPolicy);
  }

  async function submitPolicy(event: FormEvent) {
    event.preventDefault(); if (busy || staffRole !== 'administrator') return;
    setBusy(true); setError('');
    try { await configureCirculation(policyDraft.enabled, policyDraft.maxActiveLoans, policyDraft.timezone); await refresh(); }
    catch { setError('circulation.failed'); } finally { setBusy(false); }
  }
  async function submitCheckout(event: FormEvent) {
    event.preventDefault(); if (busy || !borrowerId || !copyId || !dueDate) return;
    setBusy(true); setError('');
    try { await checkoutCopy(checkoutRequestId, borrowerId, copyId, dueDate); setDueDate(''); setCheckoutRequestId(crypto.randomUUID()); await refresh(); }
    catch { setError('circulation.failed'); } finally { setBusy(false); }
  }
  async function submitBorrower(event: FormEvent) {
    event.preventDefault(); if (busy || !newUserId || !newName.trim()) return;
    setBusy(true); setError('');
    try { await registerBorrower(newUserId.trim(), newName.trim()); setNewUserId(''); setNewName(''); await refresh(); }
    catch { setError('circulation.failed'); } finally { setBusy(false); }
  }
  async function finish(loan: Loan, resolution: 'returned' | 'lost', condition?: 'usable' | 'damaged') {
    if (busy) return; setBusy(true); setError('');
    const actionKey = `${loan.id}:${resolution}:${condition ?? ''}`;
    const stableRequestId = resolutionRequestIds[actionKey] ?? requestId();
    setResolutionRequestIds(value => ({ ...value, [actionKey]: stableRequestId }));
    try {
      await resolveLoan(stableRequestId, loan.id, resolution, condition);
      setResolutionRequestIds(value => {
        const next = { ...value };
        delete next[actionKey];
        return next;
      });
      await refresh();
    }
    catch { setError('circulation.failed'); } finally { setBusy(false); }
  }

  if (!loaded) return error ? <section className="circulation-card"><p role="alert">{t(error)}</p><button className="secondary" type="button" onClick={() => { setError(''); void refresh(); }}>{t('circulation.retry')}</button></section> : <p role="status">{t('circulation.loading')}</p>;

  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-SG', { dateStyle: 'medium' });
  const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00`));
  const activeCopyIds = new Set(loans.filter(loan => !loan.resolved_at).map(loan => loan.copy_id));
  const lendableCopies = copies.filter(item => item.condition === 'usable' && !activeCopyIds.has(item.id));
  const eligibleBorrowers = borrowers.filter(item => item.eligible);
  const centreToday = dateInTimeZone(new Date(), policy?.timezone ?? 'Asia/Ho_Chi_Minh');
  const dueDateIsPast = dueDate !== '' && dueDate < centreToday;
  const canRecordCheckout = Boolean(policy?.enabled) && eligibleBorrowers.length > 0 && lendableCopies.length > 0 && dueDate !== '' && !dueDateIsPast;
  const checkoutUnavailableKey = !policy?.enabled
    ? 'circulation.checkoutDisabled'
    : eligibleBorrowers.length === 0
      ? 'circulation.noBorrowersAction'
      : lendableCopies.length === 0
        ? 'circulation.noCopiesAction'
        : null;

  function loanStatusKey(loan: Loan) {
    if (!loan.resolved_at) return `circulation.${activeLoanStatus(loan.due_date, centreToday)}`;
    if (loan.resolution === 'lost') return 'circulation.resolvedLost';
    if (loan.return_condition === 'damaged') return 'circulation.resolvedDamaged';
    return 'circulation.resolvedUsable';
  }

  return <>
    <WorkspaceNavigation staffRole={staffRole} current="circulation" />
    <div className="page-heading"><div><span className="eyebrow">{t('staff')}</span><h1>{t('circulation.title')}</h1><p>{t('circulation.body')}</p></div></div>
    {error && <p role="alert" className="form-error">{t(error)}</p>}
    <div className="circulation-grid">
      {policy && <section className="circulation-card circulation-wide"><h2>{t('circulation.policy')}</h2><p className="circulation-muted">{policy.enabled ? t('circulation.enabledNotice', { count: policy.max_active_loans, timezone: policy.timezone }) : t('circulation.disabled')}</p>{staffRole === 'administrator' && <form className="circulation-form" onSubmit={event => void submitPolicy(event)}>
        <label><input type="checkbox" checked={policyDraft.enabled} onChange={event => setPolicyDraft(value => ({ ...value, enabled: event.target.checked }))} /> {t('circulation.enable')}</label>
        <label>{t('circulation.maxLoans')}<input type="number" min={1} max={100} step={1} value={policyDraft.maxActiveLoans} onChange={event => setPolicyDraft(value => ({ ...value, maxActiveLoans: Number(event.target.value) }))} required /></label>
        <label>{t('circulation.timezone')}<input value={policyDraft.timezone} onChange={event => setPolicyDraft(value => ({ ...value, timezone: event.target.value }))} required maxLength={80} /></label>
        <button className="primary" disabled={busy}>{t('circulation.savePolicy')}</button>
      </form>}</section>}
      <section className="circulation-card"><h2>{t('circulation.register')}</h2><form className="circulation-form" onSubmit={event => void submitBorrower(event)}>
        <label>{t('circulation.userId')}<input value={newUserId} onChange={event => setNewUserId(event.target.value)} placeholder="UUID" required /></label>
        <label>{t('circulation.displayName')}<input value={newName} onChange={event => setNewName(event.target.value)} required maxLength={120} /></label>
        <button className="primary" disabled={busy}>{t('circulation.registerButton')}</button>
      </form></section>
      <section className="circulation-card"><h2>{t('circulation.checkout')}</h2><form className="circulation-form" onSubmit={event => void submitCheckout(event)}>
        {checkoutUnavailableKey && <p className="circulation-muted">{t(checkoutUnavailableKey)}</p>}
        <label>{t('circulation.borrower')}<select value={borrowerId} onChange={event => setBorrowerId(event.target.value)} required disabled={eligibleBorrowers.length === 0}><option value="">{t('circulation.chooseBorrower')}</option>{eligibleBorrowers.map(item => <option key={item.user_id} value={item.user_id}>{item.display_name}</option>)}</select></label>
        <label>{t('circulation.copy')}<select value={copyId} onChange={event => setCopyId(event.target.value)} required disabled={lendableCopies.length === 0}><option value="">{t('circulation.chooseCopy')}</option>{lendableCopies.map(item => <option key={item.id} value={item.id}>{item.inventory_code} · {item.books?.title_en ?? item.book_id}</option>)}</select></label>
        <label>{t('circulation.dueDate')}<input type="date" min={centreToday} value={dueDate} onChange={event => setDueDate(event.target.value)} required aria-invalid={dueDateIsPast} aria-describedby={dueDateIsPast ? 'circulation-due-error' : undefined} /></label>
        {dueDateIsPast && <p className="form-error" id="circulation-due-error" role="alert">{t('circulation.pastDueDate', { date: formatDate(centreToday) })}</p>}
        <button className="primary" disabled={busy || !canRecordCheckout}>{t('circulation.checkout')}</button>
      </form></section>
      <section className="circulation-card circulation-wide"><h2>{t('circulation.loans')}</h2>{loans.length === 0 ? <p className="circulation-muted">{t('circulation.noLoans')}</p> : <div className="table-wrap"><table className="circulation-table"><thead><tr><th>{t('circulation.borrower')}</th><th>{t('circulation.copy')}</th><th>{t('circulation.dueDate')}</th><th>{t('status')}</th><th /></tr></thead><tbody>{loans.map(loan => {
        const statusKey = loanStatusKey(loan);
        return <tr key={loan.id}><td>{borrowers.find(item => item.user_id === loan.borrower_user_id)?.display_name ?? loan.borrower_user_id}</td><td>{loan.book_copies?.inventory_code ?? loan.copy_id}</td><td>{t('circulation.dueOn', { date: formatDate(loan.due_date) })}</td><td><span className={statusKey === 'circulation.overdue' ? 'loan-status loan-status--overdue' : 'loan-status'}>{t(statusKey)}</span></td><td>{!loan.resolved_at && <div className="circulation-actions"><button className="secondary" disabled={busy} onClick={() => void finish(loan, 'returned', 'usable')}>{t('circulation.return')}</button><button className="secondary" disabled={busy} onClick={() => void finish(loan, 'returned', 'damaged')}>{t('circulation.damaged')}</button><button className="secondary" disabled={busy} onClick={() => void finish(loan, 'lost')}>{t('circulation.lost')}</button></div>}</td></tr>;
      })}</tbody></table></div>}</section>
    </div>
  </>;
}
