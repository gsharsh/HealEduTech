import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { useStaffAlerts } from './useStaffAlerts';
import './staff-page.css';

type WorkspaceCardProps = {
  icon: 'dashboard' | 'students' | 'catalogue' | 'circulation' | 'together' | 'training' | 'access';
  wide?: boolean;
  title: string;
  body: string;
  action: string;
  to: string;
};

const workspaceIcons = {
  dashboard: 'M4 13h6v7H4zM14 4h6v16h-6zM4 4h6v5H4z',
  students: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M19 8a3 3 0 0 1 0 6M21 20v-2a4 4 0 0 0-2-3.5M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  catalogue: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
  circulation: 'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
  together: 'M20 11a8 8 0 0 1-8 8H5l-4 3V11a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8ZM6 9h9M6 13h6',
  training: 'm3 8 9-5 9 5-9 5-9-5Zm4 3v6l5 3 5-3v-6M21 8v8',
  access: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
};

function WorkspaceCard({ icon, title, body, action, to, wide = false }: WorkspaceCardProps) {
  return <article className={`staff-page__card${wide ? ' staff-page__card--wide' : ''}`}>
    <span className="staff-page__card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={workspaceIcons[icon]} /></svg></span>
    <div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
    <Link className="staff-page__card-action" to={to}>{action}<span aria-hidden="true">→</span></Link>
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
        <p>{vi ? 'Quản lý mượn trả, hỗ trợ việc đọc và duyệt những khám phá của học sinh.' : 'Manage loans, support reading, and review your students’ discoveries.'}</p>
      </div>
      {staffRole && <span className="staff-page__role">{t(`staffAccess.roles.${staffRole}`)}</span>}
    </header>

    <section className={`staff-page__attention${!alerts.error && !alerts.loading && alerts.count === 0 ? ' staff-page__attention--clear' : ''}`} aria-labelledby="staff-attention-title">
      <div className="staff-page__attention-copy"><h2 id="staff-attention-title">{vi ? 'Sách cần theo dõi' : 'Books needing follow-up'}</h2>
      <p role="status">{alerts.error ? (vi ? 'Chưa thể tải cảnh báo. Mở trang mượn và trả để thử lại.' : 'Alerts could not load. Open loans and returns to retry.') : alerts.loading ? (vi ? 'Đang kiểm tra cảnh báo…' : 'Checking alerts…') : alerts.count === 0 ? (vi ? 'Không có lượt mượn nào quá hạn từ 7 ngày.' : 'No loans are overdue by seven days or more.') : (vi ? `${alerts.count ?? '—'} lượt mượn quá hạn từ 7 ngày cần nhân viên theo dõi.` : `${alerts.count ?? '—'} loans are overdue by seven days or more and need staff follow-up.`)}</p></div>
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
        <WorkspaceCard icon="dashboard" title={vi ? 'Thống kê thư viện' : 'Library dashboard'} body={vi ? 'Xem việc mượn sách, tình trạng kho và tiến độ đọc được ghi nhận.' : 'Review lending, inventory health, and recorded reading participation.'} action={vi ? 'Mở thống kê' : 'Open dashboard'} to="/staff/dashboard" />
        <WorkspaceCard icon="students" title={vi ? 'Học sinh' : 'Students'} body={vi ? 'Xem hồ sơ, sách đang đọc và lịch sử mượn của học sinh.' : 'View student profiles, current reading, and borrowing history.'} action={vi ? 'Xem học sinh' : 'View students'} to="/staff/students" />
        <WorkspaceCard
          icon="catalogue"
          title={t('workspaces.catalogueTitle')}
          body={t('workspaces.catalogueBody')}
          action={t('workspaces.openCatalogue')}
          to="/staff/catalogue"
        />
        <WorkspaceCard
          icon="circulation"
          title={t('workspaces.circulationTitle')}
          body={t('workspaces.circulationBody')}
          action={t('workspaces.openCirculation')}
          to="/staff/circulation"
        />
        <WorkspaceCard icon="together" title={vi ? 'Khám phá của học sinh' : 'Student discoveries'} body={vi ? 'Duyệt bài đọc, bài trình bày và trò chuyện trước khi chia sẻ với lớp.' : 'Review reading projects, presentations, and conversations before they are shared with the class.'} action={vi ? 'Mở bàn duyệt' : 'Open review desk'} to="/community#review-desk-title" />
        <WorkspaceCard
          icon="training"
          title={t('staffTraining.title')}
          body={t('staffTraining.body')}
          action={t('staffTraining.nav')}
          to="/staff/training"
        />
        {isAdministrator && <WorkspaceCard
          icon="access"
          wide
          title={t('workspaces.staffAccessTitle')}
          body={t('workspaces.staffAccessBody')}
          action={t('workspaces.manageStaff')}
          to="/admin/settings"
        />}
      </div>
    </section>
  </div>;
}
