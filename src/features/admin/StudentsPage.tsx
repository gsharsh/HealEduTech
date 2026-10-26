import { useCallback, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCirculationPolicy } from '../circulation/data';
import { getStudent, listStaffLoans, listStudentReading, listStudents, type Page, type StaffLoan, type StudentSummary } from './staffData';
import { staffDate, staffOversightCopy } from './staffOversightCopy';
import { useStaffResource } from './useStaffResource';
import './staff-oversight.css';

type Copy = (typeof staffOversightCopy)[keyof typeof staffOversightCopy];
const STUDENT_FILTERS = ['all', 'reading', 'finished', 'borrowers', 'overdue'];
const READING_FILTERS = ['all', 'currently_reading', 'finished'];
function pageNumber(value: string | null) { return value && /^\d+$/.test(value) ? Math.max(1, Math.min(1000000, Number(value))) : 1; }
function eligibility(student: StudentSummary, copy: Copy) { return student.registered ? (student.eligible ? copy.eligible : copy.ineligible) : copy.notRegistered; }

function LoadingState({ error, retry, copy }: { error: boolean; retry: () => void; copy: Copy }) {
  return <section className="staff-oversight__panel">{error ? <><p role="alert">{copy.failed}</p><button className="secondary" type="button" onClick={retry}>{copy.retry}</button></> : <p role="status">{copy.loading}</p>}</section>;
}

function Pagination({ data, disabled, onPage, copy }: { data: Page<unknown>; disabled: boolean; onPage: (page: number) => void; copy: Copy }) {
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return <nav className="staff-oversight__pagination" aria-label={`${copy.page} ${data.page} ${copy.of} ${pages}`}>
    <p aria-live="polite">{data.total.toLocaleString()} {copy.records} · {copy.page} {data.page} {copy.of} {pages}</p>
    <div className="staff-oversight__pagination-actions">
      <button className="secondary" type="button" disabled={disabled || data.page <= 1} onClick={() => onPage(data.page - 1)}>{copy.previous}</button>
      <button className="secondary" type="button" disabled={disabled || data.page >= pages} onClick={() => onPage(data.page + 1)}>{copy.next}</button>
    </div>
  </nav>;
}

export function StudentsPage() {
  const { i18n } = useTranslation();
  const copy = staffOversightCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const requestedFilter = params.get('filter') ?? 'all';
  const filter = STUDENT_FILTERS.includes(requestedFilter) ? requestedFilter : 'all';
  const page = pageNumber(params.get('page'));
  const load = useCallback((signal: AbortSignal) => listStudents({ search, filter, page, signal }), [search, filter, page]);
  const students = useStaffResource(`students:${search}:${filter}:${page}`, load);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const query = String(values.get('search') ?? '').trim();
    if (query) next.set('search', query);
    const nextFilter = String(values.get('filter') ?? 'all');
    if (nextFilter !== 'all') next.set('filter', nextFilter);
    setParams(next);
  }

  return <div className="staff-oversight">
    <header className="staff-oversight__heading"><div><span className="eyebrow">{copy.staff}</span><h1>{copy.students}</h1><p>{copy.studentBody}</p></div><Link className="secondary" to="/staff/dashboard">{copy.dashboard}</Link></header>
    <section className="staff-oversight__panel">
      <form key={`${search}:${filter}`} className="staff-oversight__filters" onSubmit={applyFilters}>
        <label>{copy.search}<input type="search" name="search" defaultValue={search} maxLength={160} /></label>
        <label>{copy.status}<select name="filter" defaultValue={filter}><option value="all">{copy.allStudents}</option><option value="reading">{copy.readingStudents}</option><option value="finished">{copy.finishedStudents}</option><option value="borrowers">{copy.borrowers}</option><option value="overdue">{copy.overdueStudents}</option></select></label>
        <button className="primary" type="submit">{copy.apply}</button>
      </form>
    </section>
    {!students.data ? <LoadingState error={students.error} retry={students.reload} copy={copy} /> : <section className="staff-oversight__panel" aria-busy={students.loading}>
      {students.data.items.length === 0 ? <p className="staff-oversight__empty">{copy.noStudents}</p> : <div className="staff-oversight__table-wrap" tabIndex={0} role="region" aria-label={copy.students}><table className="staff-oversight__table">
        <thead><tr><th scope="col">{copy.name}</th><th scope="col">{copy.eligibility}</th><th scope="col">{copy.reading}</th><th scope="col">{copy.finished}</th><th scope="col">{copy.activeLoans}</th><th scope="col">{copy.overdueLoans}</th></tr></thead>
        <tbody>{students.data.items.map(student => <tr key={student.user_id}>
          <td><Link to={`/staff/students/${student.user_id}`}>{student.display_name}</Link><small>{student.email ?? copy.noEmail}</small></td>
          <td>{eligibility(student, copy)}</td><td>{student.currently_reading_count}</td><td>{student.finished_count}</td>
          <td><Link to={`/staff/circulation?student=${student.user_id}&status=active`}>{student.active_loan_count}</Link></td>
          <td><Link to={`/staff/circulation?student=${student.user_id}&status=overdue`}>{student.overdue_loan_count}</Link></td>
        </tr>)}</tbody>
      </table></div>}
      <Pagination data={students.data} disabled={students.loading} onPage={next => { const values = new URLSearchParams(params); values.set('page', String(next)); setParams(values); }} copy={copy} />
    </section>}
    <p className="staff-oversight__note">{copy.privacy}</p>
  </div>;
}

function loanStatus(loan: StaffLoan, copy: Copy) {
  if (!loan.resolved_at) return loan.days_overdue > 0 ? copy.overdue : copy.active;
  return loan.resolution === 'lost' ? copy.lost : loan.return_condition === 'damaged' ? copy.damagedReturn : copy.returned;
}

export function StudentDetailPage() {
  const { studentId = '' } = useParams();
  const { i18n } = useTranslation();
  const language = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = staffOversightCopy[language];
  const [params, setParams] = useSearchParams();
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
  const readingPage = pageNumber(params.get('readingPage'));
  const loanPage = pageNumber(params.get('loanPage'));
  const requestedStatus = params.get('reading') ?? 'all';
  const readingStatus = READING_FILTERS.includes(requestedStatus) ? requestedStatus : 'all';
  const loadStudent = useCallback((signal: AbortSignal) => validId ? getStudent(studentId, signal) : Promise.resolve(null), [validId, studentId]);
  const student = useStaffResource(`student:${studentId}`, loadStudent);
  const loadPolicy = useCallback(() => getCirculationPolicy(), []);
  const policy = useStaffResource('student-centre-policy', loadPolicy);
  const loadReading = useCallback((signal: AbortSignal) => validId ? listStudentReading(studentId, { page: readingPage, status: readingStatus, signal }) : Promise.resolve({ items: [], total: 0, page: 1, page_size: 25 }), [validId, studentId, readingPage, readingStatus]);
  const reading = useStaffResource(`student-reading:${studentId}:${readingPage}:${readingStatus}`, loadReading);
  const loadLoans = useCallback((signal: AbortSignal) => validId ? listStaffLoans({ studentId, page: loanPage, signal }) : Promise.resolve({ items: [], total: 0, page: 1, page_size: 25 }), [validId, studentId, loanPage]);
  const loans = useStaffResource(`student-loans:${studentId}:${loanPage}`, loadLoans);

  function updatePage(key: string, value: number) {
    const next = new URLSearchParams(params); next.set(key, String(value)); setParams(next);
  }
  const reloadProfile = () => { student.reload(); policy.reload(); };
  if ((student.loading && !student.data) || (policy.loading && !policy.data)) return <div className="staff-oversight"><LoadingState error={false} retry={reloadProfile} copy={copy} /></div>;
  if (student.error || policy.error) return <div className="staff-oversight"><LoadingState error retry={reloadProfile} copy={copy} /></div>;
  if (!student.data) return <section className="staff-oversight staff-oversight__panel"><h1>{copy.notFound}</h1><p>{copy.notFoundBody}</p><Link className="secondary" to="/staff/students">{copy.back}</Link></section>;
  const profile = student.data;
  const timeZone = policy.data?.timezone ?? 'Asia/Ho_Chi_Minh';

  return <div className="staff-oversight">
    <Link className="staff-oversight__text-link" to="/staff/students">← {copy.back}</Link>
    <header className="staff-oversight__heading"><div><span className="eyebrow">{copy.students}</span><h1>{profile.display_name}</h1><p>{profile.email ?? copy.noEmail}</p></div><Link className="secondary" to={`/staff/circulation?student=${studentId}`}>{copy.viewCirculation}</Link></header>
    <section className="staff-oversight__panel"><dl className="staff-oversight__identity">
      <div><dt>{copy.email}</dt><dd>{profile.email ?? copy.noEmail}</dd></div><div><dt>{copy.language}</dt><dd>{profile.preferred_language === 'vi' ? copy.vietnamese : copy.english}</dd></div>
      <div><dt>{copy.joined}</dt><dd>{staffDate(profile.created_at, language, false, timeZone)}</dd></div><div><dt>{copy.eligibility}</dt><dd>{eligibility(profile, copy)}</dd></div>
    </dl></section>
    <section className="staff-metrics" aria-label={copy.currentSnapshot}>
      <div className="staff-metric"><strong>{profile.currently_reading_count}</strong><span>{copy.reading}</span></div>
      <div className="staff-metric"><strong>{profile.finished_count}</strong><span>{copy.finished}</span></div>
      <Link className="staff-metric" to={`/staff/circulation?student=${studentId}&status=active`}><strong>{profile.active_loan_count}</strong><span>{copy.activeLoans}</span></Link>
      <Link className="staff-metric staff-metric--alert" to={`/staff/circulation?student=${studentId}&status=overdue`}><strong>{profile.overdue_loan_count}</strong><span>{copy.overdueLoans}</span></Link>
    </section>
    <section className="staff-oversight__panel" id="reading-record" aria-busy={reading.loading}>
      <div className="staff-oversight__panel-heading"><div><h2>{copy.readingRecord}</h2><p>{copy.selfReported}</p></div></div>
      <div className="staff-oversight__filters"><label>{copy.status}<select value={readingStatus} onChange={event => { const next = new URLSearchParams(params); next.set('reading', event.target.value); next.delete('readingPage'); setParams(next); }}><option value="all">{copy.allReading}</option><option value="currently_reading">{copy.reading}</option><option value="finished">{copy.finished}</option></select></label></div>
      {!reading.data ? <LoadingState error={reading.error} retry={reading.reload} copy={copy} /> : <>
        {reading.data.items.length === 0 ? <p className="staff-oversight__empty">{copy.noReading}</p> : <div className="staff-oversight__table-wrap" style={{ marginTop: 18 }} tabIndex={0} role="region" aria-label={copy.readingRecord}><table className="staff-oversight__table"><thead><tr><th scope="col">{copy.book}</th><th scope="col">{copy.status}</th></tr></thead><tbody>{reading.data.items.map(book => <tr key={book.book_id}><td><Link to={`/library/${book.book_id}`}>{language === 'vi' ? book.title_vi || book.title_en : book.title_en || book.title_vi}</Link></td><td>{book.status === 'finished' ? copy.finished : copy.reading}</td></tr>)}</tbody></table></div>}
        <Pagination data={reading.data} disabled={reading.loading} onPage={page => updatePage('readingPage', page)} copy={copy} />
      </>}
    </section>
    <section className="staff-oversight__panel" aria-busy={loans.loading}>
      <div className="staff-oversight__panel-heading"><h2>{copy.borrowingHistory}</h2></div>
      {!loans.data ? <LoadingState error={loans.error} retry={loans.reload} copy={copy} /> : <>
        {loans.data.items.length === 0 ? <p className="staff-oversight__empty">{copy.noLoans}</p> : <div className="staff-oversight__table-wrap" tabIndex={0} role="region" aria-label={copy.borrowingHistory}><table className="staff-oversight__table"><thead><tr><th scope="col">{copy.book}</th><th scope="col">{copy.checkedOut}</th><th scope="col">{copy.due}</th><th scope="col">{copy.status}</th><th scope="col">{copy.lastContact}</th></tr></thead><tbody>{loans.data.items.map(loan => <tr key={loan.id}>
          <td><Link to={`/staff/circulation?student=${studentId}&search=${encodeURIComponent(loan.inventory_code)}`}>{language === 'vi' ? loan.title_vi || loan.title_en : loan.title_en || loan.title_vi}</Link><small>{loan.inventory_code}</small></td>
          <td>{staffDate(loan.checked_out_at, language, false, timeZone)}</td><td>{staffDate(loan.due_date, language, false, timeZone)}</td><td><span className={`staff-oversight__status${!loan.resolved_at && loan.days_overdue > 0 ? ' staff-oversight__status--overdue' : ''}`}>{loanStatus(loan, copy)}</span></td>
          <td>{loan.latest_contact_at ? <>{staffDate(loan.latest_contact_at, language, true, timeZone)}<small>{loan.latest_contact_by}</small></> : copy.noContact}</td>
        </tr>)}</tbody></table></div>}
        <Pagination data={loans.data} disabled={loans.loading} onPage={page => updatePage('loanPage', page)} copy={copy} />
      </>}
    </section>
    <p className="staff-oversight__note">{copy.privacy}</p>
  </div>;
}
