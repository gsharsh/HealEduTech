import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

const roles: StaffRole[] = ['librarian', 'administrator'];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

export function StaffAccessPanel() {
  const { t } = useTranslation();
  const { user, staffRole, refreshStaffAccess } = useAccount();
  const [status, setStatus] = useState<StaffAccessStatus | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('librarian');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const nextStatus = await getStaffAccessStatus();
      setStatus(nextStatus);
      setStaff(staffRole === 'administrator' || nextStatus.current_staff_role === 'administrator'
        ? await listStaffMembers()
        : []);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [staffRole, user]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await claimInitialAdmin();
      await refreshStaffAccess();
      setNotice(t('staffAccess.claimed'));
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || staffRole !== 'administrator') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await setStaffAccess(email, role);
      setNotice(t('staffAccess.saved'));
      setEmail('');
      await refreshStaffAccess();
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(emailToRevoke: string) {
    if (busy || staffRole !== 'administrator') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await revokeStaffAccess(emailToRevoke);
      setNotice(t('staffAccess.revoked'));
      await refreshStaffAccess();
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const canAdminister = staffRole === 'administrator';

  return <section className="staff-panel staff-access-panel">
    <div className="panel-heading">
      <div>
        <span className="eyebrow">{t('staffAccess.eyebrow')}</span>
        <h2>{t('staffAccess.title')}</h2>
      </div>
      <button type="button" className="secondary" disabled={loading || busy} onClick={() => void refresh()}>{t('staffAccess.refresh')}</button>
    </div>
    {status && <p>{t(status.current_staff_role ? 'staffAccess.signedInRole' : 'staffAccess.signedInNoRole', {
      email: status.current_user_email,
      role: status.current_staff_role ? t(`staffAccess.roles.${status.current_staff_role}`) : '',
    })}</p>}
    {status && !status.has_administrator && <div className="access-callout">
      <p>{t(status.can_claim_initial_admin ? 'staffAccess.canClaim' : 'staffAccess.cannotClaim')}</p>
      {status.can_claim_initial_admin && <button type="button" className="primary" disabled={busy} onClick={() => void claim()}>{t('staffAccess.claim')}</button>}
    </div>}
    {canAdminister && <>
      <form className="data-form staff-access-form" onSubmit={event => void submit(event)}>
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>{t('staffAccess.email')}<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
            <label>{t('staffAccess.role')}<select value={role} onChange={event => setRole(event.target.value as StaffRole)}>{roles.map(value => <option key={value} value={value}>{t(`staffAccess.roles.${value}`)}</option>)}</select></label>
          </div>
          <button type="submit" className="primary">{t('staffAccess.grant')}</button>
        </fieldset>
      </form>
      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead><tr><th>{t('staffAccess.email')}</th><th>{t('staffAccess.role')}</th><th>{t('staffAccess.updated')}</th><th>{t('staffAccess.actions')}</th></tr></thead>
          <tbody>{staff.map(member => <tr key={member.user_id}>
            <td>{member.email}</td>
            <td>{t(`staffAccess.roles.${member.role}`)}</td>
            <td>{new Date(member.updated_at).toLocaleDateString()}</td>
            <td><button type="button" className="secondary" disabled={busy} onClick={() => void revoke(member.email)}>{t('staffAccess.revoke')}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    {!canAdminister && status?.has_administrator && <p className="muted">{t('staffAccess.adminOnly')}</p>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
