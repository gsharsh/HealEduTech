import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listLoanContacts, notifyStaffDataChanged, recordLoanContact, type LoanContact, type StaffLoan } from '../admin/staffData';
import { useAccount } from '../auth/context';
import { makeEmailReminder } from './followUpLogic';

// Preserve retry IDs across a table refresh, including an uncertain network result.
// Scope by actor so account switching never reuses another staff member's request.
const pendingContactRequests = new Map<string, string>();

const copy = {
  en: {
    open: 'Email and contact history', email: 'Email student', recipient: 'Recipient', message: 'Reminder message',
    explanation: 'This prepares a draft in your email app. Review and send it there. The website cannot confirm that an email was sent.',
    fallback: 'If your email app does not open, copy the recipient and message into your email service.',
    missing: 'No email address available.', copy: 'Copy email and message', copied: 'Copied.', copyFailed: 'Select and copy the text below.',
    record: 'Record contact', recording: 'Recording…', recorded: 'Contact recorded.', recordHelp: 'After contacting the student, record it here so other staff can see your follow-up.',
    history: 'Recorded email contacts', empty: 'No contact recorded yet.', loading: 'Loading contact history…', error: 'Could not load or record contact. Refresh and try again.', retry: 'Refresh history',
  },
  vi: {
    open: 'Email và lịch sử liên hệ', email: 'Gửi email cho học sinh', recipient: 'Người nhận', message: 'Nội dung nhắc trả sách',
    explanation: 'Mở bản nháp trong ứng dụng email. Hãy kiểm tra và gửi từ đó. Trang web không thể xác nhận email đã được gửi.',
    fallback: 'Nếu ứng dụng email không mở, hãy sao chép địa chỉ và nội dung vào dịch vụ email của bạn.',
    missing: 'Chưa có địa chỉ email.', copy: 'Sao chép email và nội dung', copied: 'Đã sao chép.', copyFailed: 'Hãy chọn và sao chép nội dung bên dưới.',
    record: 'Ghi nhận liên hệ', recording: 'Đang ghi nhận…', recorded: 'Đã ghi nhận liên hệ.', recordHelp: 'Sau khi liên hệ học sinh, hãy ghi nhận để nhân viên khác biết.',
    history: 'Các lần liên hệ qua email đã ghi nhận', empty: 'Chưa ghi nhận liên hệ.', loading: 'Đang tải lịch sử liên hệ…', error: 'Chưa thể tải hoặc ghi nhận liên hệ. Hãy tải lại và thử lại.', retry: 'Tải lại lịch sử',
  },
};

export function LoanFollowUp({ loan, timezone }: { loan: StaffLoan; timezone: string }) {
  const { i18n } = useTranslation();
  const { user } = useAccount();
  const text = copy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<LoanContact[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'copied' | 'copyFailed' | 'recorded' | null>(null);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const draft = makeEmailReminder(loan);
  const canContact = !loan.resolved_at && loan.days_overdue > 0;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void listLoanContacts(loan.id, controller.signal).then(value => {
      if (!controller.signal.aborted) { setContacts(value); setError(false); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [open, loan.id, loan.latest_contact_at, revision]);

  async function record() {
    if (busy || !canContact || !user) return;
    setBusy(true); setError(false); setNotice(null);
    const requestKey = `${user.id}:${loan.id}`;
    const requestId = pendingContactRequests.get(requestKey) ?? crypto.randomUUID();
    pendingContactRequests.set(requestKey, requestId);
    try {
      await recordLoanContact(requestId, loan.id);
      pendingContactRequests.delete(requestKey);
      if (!mounted.current) return;
      setRevision(value => value + 1); setNotice('recorded');
    } catch {
      if (mounted.current) { setError(true); notifyStaffDataChanged(); }
    } finally { if (mounted.current) setBusy(false); }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(`${draft.recipient}\n${draft.subject}\n\n${draft.body}`);
      if (mounted.current) setNotice('copied');
    } catch { if (mounted.current) setNotice('copyFailed'); }
  }

  return <details className="loan-followup" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{text.open}</summary>
    {open && <div className="loan-followup__content">
      {canContact && <>
        <p>{text.explanation}</p>
        {draft.href ? <a className="secondary" href={draft.href}>{text.email}</a> : <p className="form-error">{text.missing}</p>}
        <p className="circulation-muted">{text.fallback}</p>
        <label htmlFor={`recipient-${loan.id}`}>{text.recipient}</label>
        <input id={`recipient-${loan.id}`} readOnly value={draft.recipient} onFocus={event => event.currentTarget.select()} />
        <label htmlFor={`message-${loan.id}`}>{text.message}</label>
        <textarea id={`message-${loan.id}`} rows={9} readOnly value={`${draft.subject}\n\n${draft.body}`} onFocus={event => event.currentTarget.select()} />
        <button type="button" className="secondary" onClick={() => void copyMessage()}>{text.copy}</button>
        <p>{text.recordHelp}</p>
        <button type="button" className="secondary" disabled={busy || !draft.href} onClick={() => void record()}>{busy ? text.recording : text.record}</button>
      </>}
      {notice && <p role="status">{text[notice]}</p>}
      <h3>{text.history}</h3>
      {contacts === null && !error ? <p role="status">{text.loading}</p> : contacts?.length ? <ul>{contacts.map(contact => <li key={contact.id}>{new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(contact.contacted_at))} · {contact.actor_name}</li>)}</ul> : !error && <p>{text.empty}</p>}
      {error && <div><p className="form-error" role="alert">{text.error}</p><button className="secondary" type="button" onClick={() => setRevision(value => value + 1)}>{text.retry}</button></div>}
    </div>}
  </details>;
}
