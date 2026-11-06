import { useCallback, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStaffDashboard, listStaffLoans } from './staffData';
import { staffDate, staffOversightCopy } from './staffOversightCopy';
import { useStaffResource } from './useStaffResource';
import './staff-oversight.css';

const dashboardCopy = {
  en: {
    overview: 'Today at the library', operations: 'Open loan desk', support: 'Support your students',
    supportBody: 'See what each student is reading, explore their topics, and review the discoveries they choose to share.',
    review: 'Review Together submissions', snapshotHint: 'Live records, shown in the centre’s timezone.',
    periodHint: 'Period applies to lending trends and most-borrowed books.',
    zeroTrends: 'No checkouts or returns in this period.', zeroTrendsBody: 'Weekly activity will appear here as loans are recorded.',
    totalCopies: 'Registered copies', checkoutsTotal: 'Checkouts in period', returnsTotal: 'Returns in period',
    ageingBody: 'Overdue loans grouped by how long they have been outstanding.',
    followupCount: 'loans to follow up', allClear: 'No follow-up needed', viewProfile: 'Open student profile',
    loanCount: 'Checkouts',
  },
  vi: {
    overview: 'Thư viện hôm nay', operations: 'Mở bàn mượn trả', support: 'Hỗ trợ học sinh',
    supportBody: 'Xem sách từng em đang đọc, tìm hiểu chủ đề các em yêu thích và duyệt những khám phá các em muốn chia sẻ.',
    review: 'Duyệt bài gửi Cùng nhau', snapshotHint: 'Hồ sơ hiện tại, hiển thị theo múi giờ trung tâm.',
    periodHint: 'Khoảng thời gian áp dụng cho biểu đồ mượn trả và sách được mượn nhiều nhất.',
    zeroTrends: 'Chưa có lượt mượn hoặc trả trong khoảng này.', zeroTrendsBody: 'Hoạt động theo tuần sẽ xuất hiện khi có hồ sơ mượn sách.',
    totalCopies: 'Bản sách đã đăng ký', checkoutsTotal: 'Lượt mượn trong kỳ', returnsTotal: 'Lượt trả trong kỳ',
    ageingBody: 'Lượt mượn quá hạn được nhóm theo thời gian chưa trả.',
    followupCount: 'lượt mượn cần theo dõi', allClear: 'Chưa cần theo dõi', viewProfile: 'Mở hồ sơ học sinh',
    loanCount: 'Lượt mượn',
  },
} as const;

function Metric({ value, label, to, alert = false }: { value: number; label: string; to: string; alert?: boolean }) {
  const { i18n } = useTranslation();
  return <Link className={`dashboard-metric${alert && value > 0 ? ' dashboard-metric--alert' : ''}`} to={to}>
    <span className="dashboard-metric__label">{label}<span aria-hidden="true">↗</span></span>
    <strong>{value.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-SG')}</strong>
  </Link>;
}

function Panel({ title, body, children, className = '', action }: { title: string; body?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return <section className={`dashboard-panel ${className}`}>
    <div className="dashboard-panel__heading"><div><h2>{title}</h2>{body && <p>{body}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function StaffDashboard() {
  const { i18n } = useTranslation();
  const language = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = staffOversightCopy[language];
  const detail = dashboardCopy[language];
  const number = (value: number) => value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-SG');
  const [params, setParams] = useSearchParams();
  const requestedWeeks = Number(params.get('weeks') ?? 12);
  const weeks = [4, 12, 52].includes(requestedWeeks) ? requestedWeeks : 12;
  const loadDashboard = useCallback((signal: AbortSignal) => getStaffDashboard(weeks, signal), [weeks]);
  const dashboard = useStaffResource(`dashboard:${weeks}`, loadDashboard);
  const loadAttention = useCallback((signal: AbortSignal) => listStaffLoans({ status: 'followup', pageSize: 5, signal }), []);
  const attention = useStaffResource('dashboard-attention', loadAttention);
  const stats = dashboard.data;
  const chartMaximum = Math.max(0, ...(stats?.trends ?? []).flatMap(row => [row.checkouts, row.returns]));
  const chartLimit = chartMaximum > 5 ? Math.ceil(chartMaximum / 10) * 10 : Math.max(2, Math.ceil(chartMaximum / 2) * 2);
  const totals = (stats?.trends ?? []).reduce((sum, row) => ({ checkouts: sum.checkouts + row.checkouts, returns: sum.returns + row.returns }), { checkouts: 0, returns: 0 });
  const inventoryTotal = stats ? Object.values(stats.inventory).reduce((sum, value) => sum + value, 0) : 0;

  return <div className="staff-oversight staff-dashboard">
    <header className="staff-oversight__heading dashboard-heading">
      <div><span className="eyebrow">{copy.staff}</span><h1>{copy.dashboard}</h1><p>{copy.dashboardBody}</p></div>
      <div className="dashboard-heading__actions"><Link className="secondary" to="/staff/students">{copy.students}</Link><Link className="primary" to="/staff/circulation">{detail.operations}<span aria-hidden="true">→</span></Link></div>
    </header>
    <div className="dashboard-toolbar">
      <div className="dashboard-snapshot"><span className="dashboard-snapshot__label">{copy.currentSnapshot}</span><p>{stats ? <>{copy.asOf} <time dateTime={stats.as_of_date}>{staffDate(stats.as_of_date, language)}</time><span aria-hidden="true"> · </span><span>{stats.timezone}</span></> : detail.snapshotHint}</p></div>
      <label className="dashboard-period">{copy.period}<select aria-describedby="dashboard-period-hint" value={weeks} onChange={event => { const next = new URLSearchParams(params); next.set('weeks', event.target.value); setParams(next); }}>{[4, 12, 52].map(value => <option key={value} value={value}>{value} {copy.weeks}</option>)}</select><span id="dashboard-period-hint" className="evg-sr-only">{detail.periodHint}</span></label>
    </div>
    {!stats ? <section className="dashboard-panel">{dashboard.error ? <><p role="alert">{copy.failed}</p><button className="secondary" type="button" onClick={dashboard.reload}>{copy.retry}</button></> : <p role="status">{copy.loading}</p>}</section> : <>
      <section className="dashboard-overview" aria-labelledby="dashboard-loan-health" aria-busy={dashboard.loading}>
        <div className="dashboard-section-label"><h2 id="dashboard-loan-health">{copy.loanHealth}</h2><span>{detail.overview}</span></div>
        <div className="dashboard-metrics">
          <Metric value={stats.loan_health.active} label={copy.activeLoans} to="/staff/circulation?status=active" />
          <Metric value={stats.loan_health.borrowers} label={copy.distinctBorrowers} to="/staff/students?filter=borrowers" />
          <Metric value={stats.loan_health.overdue} label={copy.overdueLoans} to="/staff/circulation?status=overdue" alert />
          <Metric value={stats.loan_health.due_soon} label={copy.dueSoon} to="/staff/circulation?status=due_soon" />
        </div>
      </section>
      <div className="dashboard-primary-grid">
        <Panel title={copy.attention} className={`dashboard-attention${stats.loan_health.followup > 0 ? ' dashboard-attention--pending' : ''}`} action={<span className="dashboard-count" aria-label={`${number(stats.loan_health.followup)} ${detail.followupCount}`}>{number(stats.loan_health.followup)}</span>}>
          <p className="dashboard-panel__note">{copy.attentionBody}</p>
          <div aria-busy={attention.loading}>
            {attention.error ? <><p role="alert">{copy.failed}</p><button className="secondary" type="button" onClick={attention.reload}>{copy.retry}</button></> : !attention.data ? <p role="status">{copy.loading}</p> : attention.data.items.length === 0 ? <div className="dashboard-empty"><span className="dashboard-empty__symbol" aria-hidden="true">✓</span><h3>{detail.allClear}</h3><p>{copy.noAttention}</p></div> : <ul className="dashboard-followups">{attention.data.items.map(loan => <li key={loan.id}>
              <div className="dashboard-followups__identity"><Link to={`/staff/students/${loan.borrower_user_id}`} title={detail.viewProfile}>{loan.borrower_name}</Link><span className="dashboard-overdue">{number(loan.days_overdue)} {copy.daysOverdue}</span></div>
              <p>{language === 'vi' ? loan.title_vi || loan.title_en : loan.title_en || loan.title_vi}</p>
              <div className="dashboard-followups__metadata"><span>{loan.inventory_code}</span><span>{copy.due}: {staffDate(loan.due_date, language, false, stats.timezone)}</span></div>
              <small>{loan.latest_contact_at ? `${copy.lastContact}: ${staffDate(loan.latest_contact_at, language, true, stats.timezone)}` : copy.noContact}</small>
              <Link className="dashboard-followups__action" to={`/staff/circulation?status=followup&student=${loan.borrower_user_id}`}>{copy.followUp}<span aria-hidden="true">→</span></Link>
            </li>)}</ul>}
          </div>
          <Link className="dashboard-panel__footer-link" to="/staff/circulation?status=followup">{copy.viewAllAttention}<span aria-hidden="true">→</span></Link>
        </Panel>
        <Panel title={copy.trends} body={`${weeks} ${copy.weeks}. ${copy.trendsBody}`} className="dashboard-trends">
          <dl className="dashboard-trend-totals"><div><dt><span className="dashboard-key" aria-hidden="true" />{detail.checkoutsTotal}</dt><dd>{number(totals.checkouts)}</dd></div><div><dt><span className="dashboard-key dashboard-key--return" aria-hidden="true" />{detail.returnsTotal}</dt><dd>{number(totals.returns)}</dd></div></dl>
          {chartMaximum === 0 ? <div className="dashboard-empty dashboard-empty--chart"><h3>{detail.zeroTrends}</h3><p>{detail.zeroTrendsBody}</p></div> : <div className={`dashboard-chart${stats.trends.length > 20 ? ' dashboard-chart--dense' : ''}`} aria-hidden="true">
            <div className="dashboard-chart__axis"><span>{number(chartLimit)}</span><span>{number(chartLimit / 2)}</span><span>0</span></div>
            <div className="dashboard-chart__plot"><div className="dashboard-chart__grid" />{stats.trends.map(item => <div className="dashboard-chart__week" key={item.week} title={`${staffDate(item.week, language)}: ${copy.checkouts} ${number(item.checkouts)}, ${copy.returns} ${number(item.returns)}`}><span className="dashboard-chart__bar" style={{ height: `${item.checkouts / chartLimit * 100}%` }} /><span className="dashboard-chart__bar dashboard-chart__bar--return" style={{ height: `${item.returns / chartLimit * 100}%` }} /></div>)}</div>
            <div className="dashboard-chart__range"><span>{staffDate(stats.trends.at(0)?.week, language)}</span><span>{staffDate(stats.trends.at(-1)?.week, language)}</span></div>
          </div>}
          <details className="dashboard-trend-details"><summary>{copy.trendDetails}</summary><div className="staff-oversight__table-wrap" tabIndex={0} role="region" aria-label={copy.trendDetails}><table className="staff-oversight__table dashboard-numeric-table"><caption className="evg-sr-only">{copy.trends} · {weeks} {copy.weeks}</caption><thead><tr><th scope="col">{copy.week}</th><th scope="col">{copy.checkouts}</th><th scope="col">{copy.returns}</th></tr></thead><tbody>{stats.trends.map(item => <tr key={item.week}><th scope="row">{staffDate(item.week, language)}</th><td>{number(item.checkouts)}</td><td>{number(item.returns)}</td></tr>)}</tbody></table></div></details>
        </Panel>
      </div>
      <div className="dashboard-secondary-grid">
        <Panel title={copy.participation} className="dashboard-reading">
          <dl className="dashboard-reading__metrics"><div><dt>{copy.studentReading}</dt><dd>{number(stats.reading.students_reading)}</dd></div><div><dt>{copy.totalFinished}</dt><dd>{number(stats.reading.finished)}</dd></div></dl>
          <p className="dashboard-panel__note">{copy.participationBody}</p>
          <Link className="dashboard-panel__footer-link" to="/staff/students?filter=reading">{copy.students}<span aria-hidden="true">→</span></Link>
        </Panel>
        <Panel title={copy.ageing} body={detail.ageingBody}>
          <ul className="dashboard-data-list">{([
            [stats.ageing.days_1_7, copy.days1, 'age_1_7'],
            [stats.ageing.days_8_14, copy.days8, 'age_8_14'],
            [stats.ageing.days_15_plus, copy.days15, 'age_15_plus'],
          ] as const).map(([value, label, status]) => <li key={status}><Link to={`/staff/circulation?status=${status}`}><span>{label}</span><strong className={value > 0 ? 'dashboard-warning-value' : undefined}>{number(value)}<span aria-hidden="true">↗</span></strong></Link></li>)}</ul>
        </Panel>
        <Panel title={copy.inventory} body={copy.inventoryBody}>
          <p className="dashboard-inventory-total"><strong>{number(inventoryTotal)}</strong><span>{detail.totalCopies}</span></p>
          <dl className="dashboard-inventory-list">{([
            [stats.inventory.available, copy.available], [stats.inventory.borrowed, copy.borrowed],
            [stats.inventory.damaged, copy.damaged], [stats.inventory.lost, copy.lost],
          ] as const).map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
          <Link className="dashboard-panel__footer-link" to="/staff/catalogue">{copy.catalogue}<span aria-hidden="true">→</span></Link>
        </Panel>
      </div>
      <div className="dashboard-bottom-grid">
        <Panel title={copy.popular} body={`${weeks} ${copy.weeks}. ${copy.popularBody}`}>
          {stats.popular.length === 0 ? <p className="staff-oversight__empty">{copy.noPopular}</p> : <><div className="dashboard-ranking-label" aria-hidden="true"><span>{copy.book}</span><span>{detail.loanCount}</span></div><ol className="dashboard-ranking">{stats.popular.map((book, index) => <li key={book.book_id}><span className="dashboard-ranking__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><Link to={`/staff/circulation?book=${book.book_id}`}>{language === 'vi' ? book.title_vi || book.title_en : book.title_en || book.title_vi}<small>{copy.viewBorrowingHistory}</small></Link><strong aria-label={`${number(book.checkouts)} ${copy.checkouts}`}>{number(book.checkouts)}</strong></li>)}</ol></>}
        </Panel>
        <Panel title={detail.support} body={detail.supportBody} className="dashboard-teaching">
          <div className="dashboard-teaching__links"><Link to="/staff/students">{copy.students}<span aria-hidden="true">→</span></Link><Link to="/community#review-desk-title">{detail.review}<span aria-hidden="true">→</span></Link></div>
          <p className="dashboard-panel__note">{copy.privacy}</p>
        </Panel>
      </div>
    </>}
  </div>;
}
