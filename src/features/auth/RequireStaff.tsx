import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAccount, type StaffRole } from './context';

function LoadingAccess() {
  const { t } = useTranslation();
  return <section className="route-access-state" aria-live="polite"><p role="status">{t('access.checking')}</p></section>;
}

function SignInRequired() {
  const { t } = useTranslation();
  const location = useLocation();
  const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
  return <section className="route-access-state"><span className="eyebrow">{t('access.accountArea')}</span><h1>{t('access.accountSignInTitle')}</h1><p>{t('access.accountSignInBody')}</p><Link className="primary" to={`/sign-in?next=${next}`}>{t('auth.signIn')}</Link><Link className="secondary" to="/library">{t('access.backToLibrary')}</Link></section>;
}

function AccessUnavailable() {
  const { t } = useTranslation();
  const { refreshStaffAccess } = useAccount();
  return <section className="route-access-state" role="alert"><span className="eyebrow">{t('access.accountArea')}</span><h1>{t('access.unavailableTitle')}</h1><p>{t('access.unavailableBody')}</p><button className="primary" type="button" onClick={() => void refreshStaffAccess()}>{t('access.tryAgain')}</button><Link className="secondary" to="/library">{t('access.backToLibrary')}</Link></section>;
}

export function RequireAuth({ children, allowDemo = true, requireStaffAccess = true }: { children: ReactNode; allowDemo?: boolean; requireStaffAccess?: boolean }) {
  const { user, loading, accessStatus } = useAccount();
  if (!supabase && allowDemo) return children;
  if (loading || (requireStaffAccess && user && accessStatus === 'loading')) return <LoadingAccess />;
  if (!user) return <SignInRequired />;
  if (requireStaffAccess && accessStatus === 'error') return <AccessUnavailable />;
  return children;
}

export function RequireStaff({ children, roles = ['librarian', 'administrator'], allowDemo = true }: { children: ReactNode; roles?: StaffRole[]; allowDemo?: boolean }) {
  const { t } = useTranslation();
  const { user, loading, accessStatus, staffRole } = useAccount();

  // The disconnected build remains a clearly labelled design preview.
  if (!supabase && allowDemo) return children;
  if (loading || (user && accessStatus === 'loading')) return <LoadingAccess />;
  if (!user) return <SignInRequired />;
  if (accessStatus === 'error') return <AccessUnavailable />;
  if (!staffRole || !roles.includes(staffRole)) {
    return <section className="route-access-state"><span className="eyebrow">{t('access.staffArea')}</span><h1>{t('access.noAccessTitle')}</h1><p>{t('access.noAccessBody')}</p><Link className="primary" to="/library">{t('access.backToLibrary')}</Link></section>;
  }
  return children;
}
