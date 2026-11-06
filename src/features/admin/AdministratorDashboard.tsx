import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { StaffAccessPanel } from './StaffAccessPanel';
import { PublicCatalogueLink } from './WorkspaceNavigation';
import './admin.css';

export function AdministratorDashboard() {
  const { t, i18n } = useTranslation();
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

  return <div className="administrator-workspace">
    <PublicCatalogueLink />
    <header className="administrator-workspace__heading">
      <div>
        <span className="eyebrow">{t('workspaces.administration')}</span>
        <h1>{t('workspaces.adminTitle')}</h1>
        <p>{t('workspaces.adminBody')}</p>
      </div>
      <div className="administrator-workspace__actions"><span className="role-badge">{t('staffAccess.roles.administrator')}</span><Link to="/staff/dashboard">{i18n.language === 'vi' ? 'Tổng quan thư viện' : 'Library dashboard'} <span aria-hidden="true">→</span></Link></div>
    </header>
    <section className="workspace-card-grid" aria-label={t('workspaces.operationsTitle')}>
      <article className="workspace-card">
        <span className="workspace-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /></svg></span>
        <div><h2>{t('workspaces.catalogueTitle')}</h2><p>{t('workspaces.catalogueBody')}</p></div>
        <Link className="workspace-card__action" to="/staff/catalogue">{t('workspaces.openCatalogue')}<span aria-hidden="true">→</span></Link>
      </article>
      <article className="workspace-card">
        <span className="workspace-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></svg></span>
        <div><h2>{t('workspaces.circulationTitle')}</h2><p>{t('workspaces.circulationBody')}</p></div>
        <Link className="workspace-card__action" to="/staff/circulation">{t('workspaces.openCirculation')}<span aria-hidden="true">→</span></Link>
      </article>
      <article className="workspace-card">
        <span className="workspace-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6" /></svg></span>
        <div><h2>{t('workspaces.staffAccessTitle')}</h2><p>{t('workspaces.staffAccessBody')}</p></div>
        <a className="workspace-card__action" href="#staff-access">{t('workspaces.manageStaff')}<span aria-hidden="true">↓</span></a>
      </article>
    </section>
    <div id="staff-access"><StaffAccessPanel /></div>
  </div>;
}
