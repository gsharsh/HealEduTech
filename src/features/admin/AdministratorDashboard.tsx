import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { StaffAccessPanel } from './StaffAccessPanel';
import { PublicCatalogueLink } from './WorkspaceNavigation';
import './admin.css';

export function AdministratorDashboard() {
  const { t } = useTranslation();
  const { user, loading, staffRole } = useAccount();

  if (loading) return <p role="status">{t('auth.loading')}</p>;

  if (!user) return <section className="staff-panel admin-access-state">
    <span className="eyebrow">{t('workspaces.administration')}</span>
    <h1>{t('workspaces.signInTitle')}</h1>
    <p>{t('workspaces.signInBody')}</p>
    <Link className="primary" to="/sign-in?next=/admin/settings">{t('auth.signIn')}</Link>
  </section>;

  if (staffRole === 'librarian') return <div className="administrator-workspace">
    <PublicCatalogueLink />
    <section className="staff-panel admin-access-state">
      <span className="eyebrow">{t('workspaces.staffWorkspace')}</span>
      <h1>{t('workspaces.adminOnlyTitle')}</h1>
      <p>{t('workspaces.adminOnlyBody')}</p>
      <div className="form-actions">
        <Link className="primary" to="/staff/catalogue">{t('workspaces.openCatalogue')}</Link>
        <Link className="secondary" to="/staff/circulation">{t('workspaces.openCirculation')}</Link>
      </div>
    </section>
  </div>;

  if (staffRole !== 'administrator') return <div className="administrator-workspace">
    <section className="staff-panel admin-access-state">
      <span className="eyebrow">{t('workspaces.administration')}</span>
      <h1>{t('workspaces.noAccessTitle')}</h1>
      <p>{t('workspaces.noAccessBody')}</p>
      <Link className="secondary" to="/learning">{t('workspaces.returnToLearning')}</Link>
    </section>
    <StaffAccessPanel />
  </div>;

  return <div className="administrator-workspace"><StaffAccessPanel /></div>;
}
