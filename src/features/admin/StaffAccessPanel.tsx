import { requestFailureMessage } from '../../lib/requestFeedback';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import {
  claimInitialAdmin,
  getStaffAccessStatus,
  listStaffMembers,
  revokeStaffAccess,
  setStaffAccess,
  type StaffAccessStatus,
  type StaffMember,
  type StaffRole,
} from './staffAccess';

import { StaffActionDialog } from './StaffActionDialog';
import { staffAccessErrorKey } from './staffAccessErrors';

const roles: StaffRole[] = ['librarian', 'administrator'];

const accessCopy = {
  en: { reviewGrant: 'Review staff access', reviewRevoke: 'Remove staff access?', grantBody: 'This account will receive the selected permissions. Check the email and role before saving.', revokeBody: 'This person will lose access to the library’s staff tools. Their learner account and reading records will remain.', cancel: 'Cancel', confirm: 'Confirm change', saving: 'Saving…', failed: 'The change could not be completed. Check your connection and administrator access, then try again.', missingAccount: 'No matching staff account was found. Check the email and ask the person to create an account first.', lastAdministrator: 'At least one administrator must remain. Grant another administrator before changing this account.', permission: 'Your account no longer has permission for this action. Refresh your access and try again.', loading: 'Loading staff permissions…', empty: 'No staff accounts to display.' },
  vi: { reviewGrant: 'Kiểm tra quyền nhân viên', reviewRevoke: 'Gỡ quyền nhân viên?', grantBody: 'Tài khoản này sẽ nhận quyền đã chọn. Hãy kiểm tra email và vai trò trước khi lưu.', revokeBody: 'Người này sẽ mất quyền dùng công cụ nhân viên thư viện. Tài khoản học sinh và lịch sử đọc vẫn được giữ lại.', cancel: 'Hủy', confirm: 'Xác nhận thay đổi', saving: 'Đang lưu…', failed: 'Chưa thể hoàn tất thay đổi. Hãy kiểm tra kết nối và quyền quản trị rồi thử lại.', missingAccount: 'Không tìm thấy tài khoản phù hợp. Hãy kiểm tra email và yêu cầu người đó tạo tài khoản trước.', lastAdministrator: 'Phải còn ít nhất một quản trị viên. Hãy cấp quyền quản trị cho người khác trước khi thay đổi tài khoản này.', permission: 'Tài khoản của bạn không còn quyền thực hiện thao tác này. Hãy tải lại quyền rồi thử lại.', loading: 'Đang tải quyền nhân viên…', empty: 'Chưa có tài khoản nhân viên để hiển thị.' },
};

type AccessAction = { kind: 'grant'; email: string; role: StaffRole } | { kind: 'revoke'; email: string };

export function StaffAccessPanel() {
  const { user, staffRole } = useAccount();
  return <StaffAccessForm key={`${user?.id ?? 'guest'}:${staffRole ?? ''}`} />;
}

function StaffAccessForm() {
  const { t, i18n } = useTranslation();
  const text = accessCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [action, setAction] = useState<AccessAction | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const { user, staffRole, refreshStaffAccess } = useAccount();
  const [status, setStatus] = useState<StaffAccessStatus | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('librarian');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [serviceFailure, setServiceFailure] = useState<unknown>(null);
  const [error, setError] = useState<ReturnType<typeof staffAccessErrorKey> | ''>('');

  const refresh = useCallback(async () => {
    if (!user) return;
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const nextStatus = await getStaffAccessStatus();
      const members = staffRole === 'administrator' && nextStatus.current_staff_role === 'administrator'
        ? await listStaffMembers() : [];
      if (request !== generation.current) return;
      setStatus(nextStatus); setStaff(members);
    } catch (caught) {
      if (request === generation.current) { setServiceFailure(caught); setError(staffAccessErrorKey(caught)); }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [staffRole, user]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void refresh(); });
    return () => { active = false; generation.current += 1; };
  }, [refresh]);

  async function claim() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await claimInitialAdmin();
      await refreshStaffAccess();
      setNotice(t('staffAccess.claimed'));
      await refresh();
    } catch (caught) {
      setServiceFailure(caught); setError(staffAccessErrorKey(caught));
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || staffRole !== 'administrator') return;
    setError(''); setNotice('');
    setAction({ kind: 'grant', email: email.trim(), role });
  }

  async function confirmAction() {
    if (lock.current || staffRole !== 'administrator' || !action) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (action.kind === 'grant') await setStaffAccess(action.email, action.role);
      else await revokeStaffAccess(action.email);
      setAction(null);
      setNotice(t(action.kind === 'grant' ? 'staffAccess.saved' : 'staffAccess.revoked'));
      if (action.kind === 'grant') setEmail('');
      await refreshStaffAccess();
      await refresh();
    } catch (caught) { setServiceFailure(caught); setError(staffAccessErrorKey(caught)); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!user) return null;

  const canAdminister = staffRole === 'administrator';

  return <section className="staff-panel staff-access-panel" aria-busy={loading || busy}>
    {action && <StaffActionDialog tone={action.kind === 'revoke' ? 'danger' : 'default'} title={action.kind === 'grant' ? text.reviewGrant : text.reviewRevoke} confirmLabel={busy ? text.saving : text.confirm} cancelLabel={text.cancel} busy={busy} onConfirm={() => void confirmAction()} onCancel={() => { setAction(null); setError(''); }}>
      <p>{action.kind === 'grant' ? text.grantBody : text.revokeBody}</p><p><strong>{action.email}</strong>{action.kind === 'grant' && <> · {t(`staffAccess.roles.${action.role}`)}</>}</p>
      {error && <p role="alert" className="form-error">{requestFailureMessage(serviceFailure, i18n.language, text[error])}</p>}
    </StaffActionDialog>}
    <div className="panel-heading">
      <div>
        <span className="eyebrow">{t('staffAccess.eyebrow')}</span>
        <h2>{t('staffAccess.title')}</h2>
      </div>
      <button type="button" className="secondary" disabled={loading || busy} onClick={() => void refresh()}>{t('staffAccess.refresh')}</button>
    </div>
    {loading && <p role="status">{text.loading}</p>}
    {status && <p>{t(status.current_staff_role ? 'staffAccess.signedInRole' : 'staffAccess.signedInNoRole', {
      email: status.current_user_email,
      role: status.current_staff_role ? t(`staffAccess.roles.${status.current_staff_role}`) : '',
    })}</p>}
    {status && !status.has_administrator && <div className="access-callout">
      <p>{t(status.can_claim_initial_admin ? 'staffAccess.canClaim' : 'staffAccess.cannotClaim')}</p>
      {status.can_claim_initial_admin && <button type="button" className="primary" disabled={busy} onClick={() => void claim()}>{t('staffAccess.claim')}</button>}
    </div>}
    {canAdminister && <>
      <form className="data-form staff-access-form" onSubmit={submit}>
        <fieldset disabled={busy || loading}>
          <div className="form-grid">
            <label>{t('staffAccess.email')}<input type="email" autoComplete="off" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required /></label>
            <label>{t('staffAccess.role')}<select value={role} onChange={event => setRole(event.target.value as StaffRole)}>{roles.map(value => <option key={value} value={value}>{t(`staffAccess.roles.${value}`)}</option>)}</select></label>
          </div>
          <button type="submit" className="primary">{t('staffAccess.grant')}</button>
        </fieldset>
      </form>
      <div className="staff-table-wrap" tabIndex={0} role="region" aria-label={t('staffAccess.title')}>
        <table className="staff-table">
          <thead><tr><th scope="col">{t('staffAccess.email')}</th><th scope="col">{t('staffAccess.role')}</th><th scope="col">{t('staffAccess.updated')}</th><th scope="col">{t('staffAccess.actions')}</th></tr></thead>
          <tbody>{staff.map(member => <tr key={member.user_id}>
            <td>{member.email}</td>
            <td>{t(`staffAccess.roles.${member.role}`)}</td>
            <td>{new Date(member.updated_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-SG')}</td>
            <td><button type="button" className="secondary" disabled={busy || loading} onClick={() => { setError(''); setNotice(''); setAction({ kind: 'revoke', email: member.email }); }}>{t('staffAccess.revoke')}</button></td>
          </tr>)}{!loading && staff.length === 0 && <tr><td colSpan={4}>{text.empty}</td></tr>}</tbody>
        </table>
      </div>
    </>}
    {!canAdminister && status?.has_administrator && <p className="muted">{t('staffAccess.adminOnly')}</p>}
    {notice && <p role="status">{notice}</p>}
    {error && !action && <p role="alert" className="form-error">{requestFailureMessage(serviceFailure, i18n.language, text[error])}</p>}
  </section>;
}
