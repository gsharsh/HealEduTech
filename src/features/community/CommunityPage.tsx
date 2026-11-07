import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from '../auth/context';
import { supabase } from '../../lib/supabase';
import { requestFailureMessage } from '../../lib/requestFeedback';
import { togetherCopy } from './togetherCopy';
import { isTogetherUnavailable, listPublishedProjects } from './togetherData';
import type { PublishedProject } from './togetherModel';
import { ProjectNotebook, type NotebookHandle } from './ProjectNotebook';
import { ProjectReviewDesk } from './ProjectReviewDesk';
import { ProjectConversation } from './ProjectConversation';
import { MyClassroomComments } from './MyClassroomComments';
import './community.css';
import './together.css';

type TogetherView = 'activities' | 'work' | 'bookshelf' | 'review';
function viewForHash(hash: string): TogetherView {
  if (hash === '#review-desk-title') return 'review';
  if (hash === '#reading-notebook') return 'work';
  if (hash === '#classroom-bookshelf') return 'bookshelf';
  return 'activities';
}

export function CommunityPage() {
  const { t, i18n } = useTranslation();
  const vi = i18n.language === 'vi';
  const { hash, search } = useLocation();
  const { user, staffRole, loading: accountLoading } = useAccount();
  const copy = togetherCopy[vi ? 'vi' : 'en'];
  const [projects, setProjects] = useState<PublishedProject[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>(supabase ? 'loading' : 'unavailable');
  const [failure, setFailure] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [paging, setPaging] = useState(false);
  const [template, setTemplate] = useState(0);
  const [startWithNew, setStartWithNew] = useState(false);
  const [views, setViews] = useState(() => ({ hash, search, active: viewForHash(hash), opened: [viewForHash(hash)] }));
  // External deep links choose a view; local tab changes keep the same mounted workspaces.
  if (views.hash !== hash || views.search !== search) {
    const next = viewForHash(hash);
    setViews({ hash, search, active: next, opened: [...new Set([...views.opened, views.active, next])] });
  }
  const ready = state === 'ready';
  const activeView: TogetherView = !ready || (views.active === 'review' && !staffRole) ? 'activities' : views.active;
  const tabs: { id: TogetherView; label: string }[] = [{ id: 'activities', label: vi ? 'Hoạt động' : 'Activities' }];
  if (ready) tabs.push({ id: 'work', label: vi ? 'Bài của em' : 'My work' }, { id: 'bookshelf', label: vi ? 'Góc sách của lớp' : 'Class bookshelf' });
  if (ready && staffRole) tabs.push({ id: 'review', label: vi ? 'Duyệt bài' : 'Teacher review' });
  const notebook = useRef<NotebookHandle>(null);
  const pagingController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const focusedDeepLink = useRef('');
  const notebookHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pagingController.current?.abort(); }; }, []);
  useEffect(() => {
    if (!supabase) return;
    const controller = new AbortController();
    void listPublishedProjects(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setProjects(value); setHasMore(value.length === 12); setState('ready');
    }).catch(error => { if (!controller.signal.aborted) { setFailure(error); setState(current => current === 'ready' ? current : isTogetherUnavailable(error) ? 'unavailable' : 'error'); } });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const requestKey = `${hash}:${search}`;
    if (!ready || focusedDeepLink.current === requestKey || viewForHash(hash) !== activeView) return;
    if (!['#review-desk-title', '#reading-notebook', '#classroom-bookshelf'].includes(hash) || (activeView === 'review' && !staffRole)) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(hash.slice(1));
      if (heading) { focusedDeepLink.current = requestKey; heading.focus(); heading.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, staffRole, activeView, hash, search]);
  function activate(view: TogetherView) {
    setViews(value => ({ ...value, active: view, opened: [...new Set([...value.opened, value.active, view])] }));
  }
  function tabKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); activate(tabs[next].id); document.getElementById(`together-tab-${tabs[next].id}`)?.focus();
  }
  function refreshPublic() { pagingController.current?.abort(); setPaging(false); setFailure(null); setRevision(value => value + 1); }
  async function loadMore() {
    if (paging) return;
    const controller = new AbortController(); pagingController.current = controller; setPaging(true); setFailure(null);
    try {
      const next = await listPublishedProjects(controller.signal, projects.at(-1));
      if (!mounted.current || controller.signal.aborted) return;
      setProjects(values => [...values, ...next.filter(project => !values.some(item => item.id === project.id))]); setHasMore(next.length === 12);
    } catch (error) { if (mounted.current && !controller.signal.aborted) setFailure(error); }
    finally { if (mounted.current && !controller.signal.aborted) setPaging(false); }
  }
  function startOutline() {
    setStartWithNew(true); notebook.current?.startTemplate(copy.templates[template].format); activate('work');
    requestAnimationFrame(() => notebookHeading.current?.focus({ preventScroll: true }));
  }
  function downloadActivity() {
    const activity = copy.templates[template];
    const text = [activity.title, activity.tag, '', activity.body, '', ...activity.steps.map((step, index) => `${index + 1}. ${step}`), '', copy.bookLabel, '________________________', '', copy.summary, '', '', copy.takeaways, '', '', copy.recommendation, '', '', copy.question, ''].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'classroom-reading-activity.txt'; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const chosen = copy.templates[template];
  return <div className="community-page together-page">
    <header className="together-header"><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    {tabs.length > 1 && <div className="together-tabs" role="tablist" aria-label={vi ? 'Nội dung cùng học' : 'Together sections'}>{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`together-tab-${tab.id}`} aria-controls={`together-panel-${tab.id}`} aria-selected={activeView === tab.id} tabIndex={activeView === tab.id ? 0 : -1} onClick={() => activate(tab.id)} onKeyDown={event => tabKey(event, index)}>{tab.label}</button>)}</div>}

    <section id="together-panel-activities" role={ready ? 'tabpanel' : 'region'} aria-labelledby={ready ? 'together-tab-activities' : 'together-activity-title'} hidden={activeView !== 'activities'} className="together-panel">
      <h2 id="together-activity-title">{copy.activities}</h2>
      <fieldset className="together-format-choices"><legend className="evg-sr-only">{copy.activities}</legend>{copy.templates.map((item, index) => <label key={item.title} className={template === index ? 'is-selected' : ''}><input type="radio" name="classroom-activity" value={index} checked={template === index} onChange={() => setTemplate(index)} /><span><strong>{item.title}</strong><small>{item.tag}</small></span></label>)}</fieldset>
      <div className="together-activity-detail">
        <p>{chosen.body}</p><ol>{chosen.steps.map(step => <li key={step}>{step}</li>)}</ol>
        {(state === 'loading' || accountLoading) && <p role="status">{copy.loading}</p>}
        {state === 'unavailable' && <p className="together-service-notice">{copy.unavailable}</p>}
        {state === 'error' && <div role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={refreshPublic}>{copy.retry}</button></div>}
        <div className="together-start-actions">
          {ready && user ? <button type="button" className="primary" onClick={startOutline}>{vi ? 'Tạo dàn ý' : 'Create an outline'}</button> : ready ? <Link className="primary" to="/sign-in?next=/community%23reading-notebook">{copy.signIn}</Link> : <button type="button" className="primary" onClick={downloadActivity}>{vi ? 'Tải phiếu hoạt động' : 'Download activity sheet'}</button>}
          <Link className="together-text-link" to="/library">{vi ? 'Tìm sách trong thư viện' : 'Find a library book'}</Link>
          {ready && <button type="button" className="together-text-link" onClick={downloadActivity}>{vi ? 'Dùng bản giấy' : 'Use a paper copy'}</button>}
        </div>
      </div>
      <details className="together-teacher-plan"><summary>{copy.journey}</summary><p>{copy.journeyBody}</p><ol className="together-weeks">{copy.weeks.map((week, index) => <li key={week.title}><span>{copy.week} {index + 1}</span><div><strong>{week.title}</strong><p>{week.body}</p></div></li>)}</ol></details>
    </section>

    {ready && <section id="together-panel-work" role="tabpanel" aria-labelledby="together-tab-work" hidden={activeView !== 'work'} className="together-panel together-workspace">
      <h2 id="reading-notebook" tabIndex={-1} ref={notebookHeading}>{copy.notebook}</h2><p className="together-view-intro">{copy.notebookBody}</p>
      {user ? (views.opened.includes('work') || activeView === 'work') && <><ProjectNotebook key={`notebook:${user.id}`} ref={notebook} initialFormat={copy.templates[template].format} startWithNew={startWithNew} onPublicChange={refreshPublic} /><MyClassroomComments key={`comments:${user.id}`} /></> : <Link className="primary" to="/sign-in?next=/community%23reading-notebook">{copy.signIn}</Link>}
    </section>}

    {ready && <section id="together-panel-bookshelf" role="tabpanel" aria-labelledby="together-tab-bookshelf" hidden={activeView !== 'bookshelf'} className="together-panel together-public-shelf">
      <h2 id="classroom-bookshelf" tabIndex={-1}>{copy.showcase}</h2><p className="together-view-intro">{copy.showcaseBody}</p>
      {projects.length ? <div className="together-published-grid">{projects.map(project => <PublishedDiscovery key={project.id} project={project} />)}</div> : <p className="together-empty-shelf">{copy.noShowcase}</p>}
      {hasMore && <button className="secondary" disabled={paging} onClick={() => void loadMore()}>{paging ? copy.loading : copy.more}</button>}
      {failure !== null && <div role="alert"><p>{requestFailureMessage(failure, i18n.language, vi ? 'Chưa tải được bài chia sẻ. Hãy thử lại.' : 'Shared work could not be loaded. Try again.')}</p><button type="button" className="secondary" onClick={refreshPublic}>{copy.retry}</button></div>}
      <details className="together-examples"><summary>{copy.exampleHeading}</summary><p>{copy.exampleBody}</p><ul className="showcase-grid" role="list" aria-label={t('exampleOnly')}>{(['garden', 'bridge'] as const).map(key => <li key={key}><article aria-labelledby={`showcase-${key}`}><span className="together-example-label">{t('exampleOnly')}</span><h3 id={`showcase-${key}`}>{t(`showcases.${key}.title`)}</h3><p>{t(`showcases.${key}.body`)}</p><small>{t('fictionalWork')}</small></article></li>)}</ul></details>
    </section>}

    {ready && staffRole && user && <div id="together-panel-review" role="tabpanel" aria-labelledby="together-tab-review" hidden={activeView !== 'review'} className="together-panel">{(views.opened.includes('review') || activeView === 'review') && <ProjectReviewDesk key={`${user.id}:${staffRole}`} onPublicChange={refreshPublic} />}</div>}
  </div>;
}
function PublishedDiscovery({ project }: { project: PublishedProject }) {
  const { i18n } = useTranslation(); const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [open, setOpen] = useState(false);
  return <article className="together-discovery" aria-labelledby={`discovery-${project.id}`}>
    <span className="eyebrow">{project.format === 'review' ? copy.review : copy.presentation}</span><h3 id={`discovery-${project.id}`}>{project.title}</h3><p className="together-discovery-book">{project.book_title}</p><p className="together-anonymous">{copy.anonymous}</p>
    <details onToggle={event => { if (event.currentTarget.open) setOpen(true); }}><summary>{i18n.language === 'vi' ? 'Đọc khám phá và trò chuyện' : 'Read the discovery and conversation'}</summary>
      <dl className="together-project-content">{(['summary', 'takeaways', 'recommendation', 'question'] as const).filter(field => project[field]).map(field => <div key={field}><dt>{copy[field]}</dt><dd>{project[field]}</dd></div>)}</dl>
      {open && <ProjectConversation projectId={project.id} />}
    </details>
  </article>;
}
