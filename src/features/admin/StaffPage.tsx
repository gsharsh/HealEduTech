import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { useStaffAlerts } from './useStaffAlerts';
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
  const { t, i18n } = useTranslation();
  const { staffRole } = useAccount();
  const alerts = useStaffAlerts();
  const vi = i18n.language === 'vi';
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

    <section className="staff-page__attention" aria-labelledby="staff-attention-title">
      <h2 id="staff-attention-title">{vi ? 'Sách cần theo dõi' : 'Books needing follow-up'}</h2>
      <p role="status">{alerts.error ? (vi ? 'Chưa thể tải cảnh báo. Mở trang mượn và trả để thử lại.' : 'Alerts could not load. Open loans and returns to retry.') : alerts.loading ? (vi ? 'Đang kiểm tra cảnh báo…' : 'Checking alerts…') : alerts.count === 0 ? (vi ? 'Không có lượt mượn nào quá hạn từ 7 ngày.' : 'No loans are overdue by seven days or more.') : (vi ? `${alerts.count ?? '—'} lượt mượn quá hạn từ 7 ngày cần nhân viên theo dõi.` : `${alerts.count ?? '—'} loans are overdue by seven days or more and need staff follow-up.`)}</p>
      <Link className="secondary" to="/staff/circulation?status=followup">{vi ? 'Xem sách quá hạn' : 'View overdue follow-ups'}</Link>
    </section>

    <section className="staff-page__workspaces" aria-labelledby="staff-workspaces-title">
      <div className="staff-page__section-heading">
        <div>
          <h2 id="staff-workspaces-title">{t('workspaces.deskTools')}</h2>
        </div>
        <Link className="workspace-public-link" to="/library">{t('workspaces.publicCatalogue')}</Link>
      </div>

      <div className={`staff-page__cards${isAdministrator ? ' staff-page__cards--administrator' : ''}`}>
        <WorkspaceCard number="01" title={vi ? 'Thống kê thư viện' : 'Library dashboard'} body={vi ? 'Xem việc mượn sách, tình trạng kho và tiến độ đọc được ghi nhận.' : 'Review lending, inventory health, and recorded reading participation.'} action={vi ? 'Mở thống kê' : 'Open dashboard'} to="/staff/dashboard" />
        <WorkspaceCard number="02" title={vi ? 'Học sinh' : 'Students'} body={vi ? 'Xem hồ sơ, sách đang đọc và lịch sử mượn của học sinh.' : 'View student profiles, current reading, and borrowing history.'} action={vi ? 'Xem học sinh' : 'View students'} to="/staff/students" />
        <WorkspaceCard
          number="03"
          title={t('workspaces.catalogueTitle')}
          body={t('workspaces.catalogueBody')}
          action={t('workspaces.openCatalogue')}
          to="/staff/catalogue"
        />
        <WorkspaceCard
          number="04"
          title={t('workspaces.circulationTitle')}
          body={t('workspaces.circulationBody')}
          action={t('workspaces.openCirculation')}
          to="/staff/circulation"
        />
        <WorkspaceCard
          number="05"
          title={t('staffTraining.title')}
          body={t('staffTraining.body')}
          action={t('staffTraining.nav')}
          to="/staff/training"
        />
        {isAdministrator && <WorkspaceCard
          number="06"
          title={t('workspaces.staffAccessTitle')}
          body={t('workspaces.staffAccessBody')}
          action={t('workspaces.manageStaff')}
          to="/admin/settings"
        />}
      </div>
    </section>
  </div>;
}
