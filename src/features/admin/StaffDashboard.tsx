import { useCallback, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStaffDashboard, listStaffLoans } from './staffData';
import { staffDate, staffOversightCopy } from './staffOversightCopy';
import { useStaffResource } from './useStaffResource';
import './staff-oversight.css';

function Metric({ value, label, to, alert = false }: { value: number; label: string; to?: string; alert?: boolean }) {
  const content = <><strong>{value.toLocaleString()}</strong><span>{label}</span></>;
  const className = `staff-metric${alert ? ' staff-metric--alert' : ''}`;
  return to ? <Link className={className} to={to}>{content}</Link> : <div className={className}>{content}</div>;
}
function Panel({ title, body, children, wide = false }: { title: string; body?: string; children: ReactNode; wide?: boolean }) {
  return <section className={`staff-oversight__panel${wide ? ' staff-overview-grid__wide' : ''}`}><div className="staff-oversight__panel-heading"><div><h2>{title}</h2>{body && <p>{body}</p>}</div></div>{children}</section>;
}

export function StaffDashboard() {
  const { i18n } = useTranslation();
  const language = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = staffOversightCopy[language];
  const [params, setParams] = useSearchParams();
  const requestedWeeks = Number(params.get('weeks') ?? 12);
  const weeks = [4, 12, 52].includes(requestedWeeks) ? requestedWeeks : 12;
  const loadDashboard = useCallback((signal: AbortSignal) => getStaffDashboard(weeks, signal), [weeks]);
  const dashboard = useStaffResource(`dashboard:${weeks}`, loadDashboard);
  const loadAttention = useCallback((signal: AbortSignal) => listStaffLoans({ status: 'followup', pageSize: 5, signal }), []);
  const attention = useStaffResource('dashboard-attention', loadAttention);
  const stats = dashboard.data;
  const chartMaximum = Math.max(0, ...(stats?.trends ?? []).flatMap(row => [row.checkouts, row.returns]));

  return <div className="staff-oversight">
    <header className="staff-oversight__heading"><div><span className="eyebrow">{copy.staff}</span><h1>{copy.dashboard}</h1><p>{copy.dashboardBody}</p></div><Link className="secondary" to="/staff/students">{copy.students}</Link></header>
    <section className="staff-oversight__panel"><div className="staff-oversight__filters"><label>{copy.period}<select value={weeks} onChange={event => { const next = new URLSearchParams(params); next.set('weeks', event.target.value); setParams(next); }}>{[4, 12, 52].map(value => <option key={value} value={value}>{value} {copy.weeks}</option>)}</select></label><p style={{ margin: 0 }}>{stats ? `${copy.currentSnapshot} · ${copy.asOf} ${staffDate(stats.as_of_date, language)} · ${stats.timezone}` : copy.currentSnapshot}</p></div></section>
    {!stats ? <section className="staff-oversight__panel">{dashboard.error ? <><p role="alert">{copy.failed}</p><button className="secondary" type="button" onClick={dashboard.reload}>{copy.retry}</button></> : <p role="status">{copy.loading}</p>}</section> : <div className="staff-overview-grid" aria-busy={dashboard.loading}>
      <Panel title={copy.loanHealth} body={copy.currentSnapshot} wide><div className="staff-metrics">
        <Metric value={stats.loan_health.active} label={copy.activeLoans} to="/staff/circulation?status=active" />
        <Metric value={stats.loan_health.borrowers} label={copy.distinctBorrowers} to="/staff/students?filter=borrowers" />
        <Metric value={stats.loan_health.overdue} label={copy.overdueLoans} to="/staff/circulation?status=overdue" alert />
        <Metric value={stats.loan_health.due_soon} label={copy.dueSoon} to="/staff/circulation?status=due_soon" />
      </div></Panel>
      <section className="staff-oversight__panel staff-oversight__attention staff-overview-grid__wide" aria-busy={attention.loading}>
        <div className="staff-oversight__panel-heading"><div><h2>{copy.attention} · {stats.loan_health.followup.toLocaleString()}</h2><p>{copy.attentionBody}</p></div></div>
        {attention.error ? <><p role="alert">{copy.failed}</p><button className="secondary" type="button" onClick={attention.reload}>{copy.retry}</button></> : !attention.data ? <p role="status">{copy.loading}</p> : attention.data.items.length === 0 ? <p className="staff-oversight__empty">{copy.noAttention}</p> : <ul className="staff-oversight__attention-list">{attention.data.items.map(loan => <li className="staff-oversight__attention-item" key={loan.id}>
          <div><Link className="staff-oversight__text-link" to={`/staff/students/${loan.borrower_user_id}`}>{loan.borrower_name}</Link><p>{language === 'vi' ? loan.title_vi || loan.title_en : loan.title_en || loan.title_vi} · {loan.inventory_code}</p><small>{loan.days_overdue} {copy.daysOverdue} · {copy.due}: {staffDate(loan.due_date, language, false, stats.timezone)}</small><small>{loan.latest_contact_at ? `${copy.lastContact}: ${staffDate(loan.latest_contact_at, language, true, stats.timezone)} ${copy.by} ${loan.latest_contact_by ?? ''}` : copy.noContact}</small></div>
          <Link className="secondary" to={`/staff/circulation?status=followup&student=${loan.borrower_user_id}`}>{copy.followUp}</Link>
        </li>)}</ul>}
        <Link className="staff-oversight__text-link" to="/staff/circulation?status=followup">{copy.viewAllAttention}</Link>
      </section>
      <Panel title={copy.ageing} body={copy.currentSnapshot}><div className="staff-metrics">
        <Metric value={stats.ageing.days_1_7} label={copy.days1} to="/staff/circulation?status=age_1_7" alert />
        <Metric value={stats.ageing.days_8_14} label={copy.days8} to="/staff/circulation?status=age_8_14" alert />
        <Metric value={stats.ageing.days_15_plus} label={copy.days15} to="/staff/circulation?status=age_15_plus" alert />
      </div></Panel>
      <Panel title={copy.participation} body={copy.participationBody}><div className="staff-metrics">
        <Metric value={stats.reading.students_reading} label={copy.studentReading} to="/staff/students?filter=reading" />
        <Metric value={stats.reading.finished} label={copy.totalFinished} to="/staff/students?filter=finished" />
      </div></Panel>
      <Panel title={copy.trends} body={`${weeks} ${copy.weeks}. ${copy.trendsBody}`} wide>
        <p className="staff-oversight__chart-scale">{copy.maximumWeeklyCount}: {chartMaximum.toLocaleString()}</p>
        <div className={`staff-oversight__chart${stats.trends.length > 20 ? ' staff-oversight__chart--dense' : ''}`} aria-hidden="true">{stats.trends.map(item => {
          const maximum = Math.max(1, chartMaximum);
          return <div className="staff-oversight__chart-week" key={item.week}><span className="staff-oversight__bar" style={{ height: `${item.checkouts / maximum * 100}%` }} /><span className="staff-oversight__bar staff-oversight__bar--return" style={{ height: `${item.returns / maximum * 100}%` }} /></div>;
        })}</div>
        <div className="staff-oversight__chart-range"><span>{staffDate(stats.trends.at(0)?.week, language)}</span><span>{staffDate(stats.trends.at(-1)?.week, language)}</span></div>
        <div className="staff-oversight__chart-legend" aria-hidden="true"><span><i className="staff-oversight__chart-key" />{copy.checkouts}</span><span><i className="staff-oversight__chart-key staff-oversight__chart-key--return" />{copy.returns}</span></div>
        <details><summary>{copy.trendDetails}</summary><div className="staff-oversight__table-wrap" tabIndex={0} role="region" aria-label={copy.trendDetails}><table className="staff-oversight__table"><thead><tr><th scope="col">{copy.week}</th><th scope="col">{copy.checkouts}</th><th scope="col">{copy.returns}</th></tr></thead><tbody>{stats.trends.map(item => <tr key={item.week}><th scope="row">{staffDate(item.week, language)}</th><td>{item.checkouts}</td><td>{item.returns}</td></tr>)}</tbody></table></div></details>
      </Panel>
      <Panel title={copy.popular} body={`${weeks} ${copy.weeks}. ${copy.popularBody}`}>
        {stats.popular.length === 0 ? <p className="staff-oversight__empty">{copy.noPopular}</p> : <ol className="staff-oversight__popular">{stats.popular.map(book => <li key={book.book_id}><Link className="staff-oversight__text-link" to={`/staff/circulation?book=${book.book_id}`}>{language === 'vi' ? book.title_vi || book.title_en : book.title_en || book.title_vi}<small>{copy.viewBorrowingHistory}</small></Link><strong>{book.checkouts.toLocaleString()}</strong></li>)}</ol>}
      </Panel>
      <Panel title={copy.inventory} body={`${copy.currentSnapshot}. ${copy.inventoryBody}`}><div className="staff-metrics">
        <Metric value={stats.inventory.available} label={copy.available} />
        <Metric value={stats.inventory.borrowed} label={copy.borrowed} to="/staff/circulation?status=active" />
        <Metric value={stats.inventory.damaged} label={copy.damaged} />
        <Metric value={stats.inventory.lost} label={copy.lost} />
      </div><p style={{ marginTop: 16 }}><Link className="staff-oversight__text-link" to="/staff/catalogue">{copy.catalogue}</Link></p></Panel>
    </div>}
  </div>;
}
