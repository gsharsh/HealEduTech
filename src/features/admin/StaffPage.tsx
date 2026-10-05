import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import './staff-page.css';

type WorkspaceCardProps = {
  number: string;
  title: string;
  body: string;
  action: string;
  to: string;
};

function WorkspaceCard({ number, title, body, action, to }: WorkspaceCardProps) {
  return <article className="staff-page__card">
    <span className="staff-page__card-number" aria-hidden="true">{number}</span>
    <div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
    <Link className="secondary" to={to}>{action}</Link>
  </article>;
}

export function StaffPage() {
  const { t } = useTranslation();
  const { staffRole } = useAccount();
  const isAdministrator = staffRole === 'administrator';

  return <div className="staff-page">
    <header className="staff-page__hero">
      <div>
        <span className="eyebrow">{t('access.staffArea')}</span>
        <h1>{t('access.openDesk')}</h1>
        <p>{t('workspaces.deskBody')}</p>
      </div>
      {staffRole && <span className="staff-page__role">{t(`staffAccess.roles.${staffRole}`)}</span>}
    </header>

    <section className="staff-page__workspaces" aria-labelledby="staff-workspaces-title">
      <div className="staff-page__section-heading">
        <div>
          <h2 id="staff-workspaces-title">{t('workspaces.deskTools')}</h2>
        </div>
        <Link className="workspace-public-link" to="/library">{t('workspaces.publicCatalogue')}</Link>
      </div>

      <div className={`staff-page__cards${isAdministrator ? ' staff-page__cards--administrator' : ''}`}>
        <WorkspaceCard
          number="01"
          title={t('workspaces.catalogueTitle')}
          body={t('workspaces.catalogueBody')}
          action={t('workspaces.openCatalogue')}
          to="/staff/catalogue"
        />
        <WorkspaceCard
          number="02"
          title={t('workspaces.circulationTitle')}
          body={t('workspaces.circulationBody')}
          action={t('workspaces.openCirculation')}
          to="/staff/circulation"
        />
        <WorkspaceCard
          number="03"
          title={t('staffTraining.title')}
          body={t('staffTraining.body')}
          action={t('staffTraining.nav')}
          to="/staff/training"
        />
        {isAdministrator && <WorkspaceCard
          number="04"
          title={t('workspaces.staffAccessTitle')}
          body={t('workspaces.staffAccessBody')}
          action={t('workspaces.manageStaff')}
          to="/admin/settings"
        />}
      </div>
    </section>
  </div>;
}
