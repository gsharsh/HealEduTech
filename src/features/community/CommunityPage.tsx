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

export function CommunityPage() {
  const { t, i18n } = useTranslation();
  const { hash, search } = useLocation();
  const { user, staffRole, loading: accountLoading } = useAccount();
  const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [projects, setProjects] = useState<PublishedProject[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>(supabase ? 'loading' : 'unavailable');
  const [failure, setFailure] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [paging, setPaging] = useState(false);
  const notebook = useRef<NotebookHandle>(null);
  const [template, setTemplate] = useState<number | null>(null);
  const pagingController = useRef<AbortController | null>(null);
  const notebookHeading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pagingController.current?.abort(); }; }, []);
  useEffect(() => {
    if (!supabase) return;
    const controller = new AbortController();
    void listPublishedProjects(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setProjects(value); setHasMore(value.length === 12); setState('ready');
    }).catch(error => { if (!controller.signal.aborted) { setFailure(error); setState(isTogetherUnavailable(error) ? 'unavailable' : 'error'); } });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (state !== 'ready' || !staffRole || hash !== '#review-desk-title') return;
    const frame = requestAnimationFrame(() => { const heading = document.getElementById('review-desk-title'); heading?.focus(); heading?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    return () => cancelAnimationFrame(frame);
  }, [state, staffRole, hash, search]);
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
  function startOutline(index: number) {
    notebook.current?.startTemplate(copy.templates[index].format); setTemplate(index);
    notebookHeading.current?.focus(); notebookHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  return <div className="community-page together-page">
    <header className="together-hero">
      <div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p>
        <nav className="together-jump-links" aria-label={t('community')}><a href="#reading-circle">{copy.journey}</a><a href="#reading-notebook">{copy.notebook}</a><a href="#classroom-bookshelf">{copy.showcase}</a></nav>
        {state === 'ready' && staffRole && <a className="secondary together-teacher-shortcut" href="#review-desk-title">{i18n.language === 'vi' ? 'Mở góc duyệt bài' : 'Open teacher review'} →</a>}
      </div>
      <div className="together-hero-art" aria-hidden="true"><span className="together-book together-book--one">01<br />READ</span><span className="together-book together-book--two">02<br />NOTICE</span><span className="together-book together-book--three">03<br />SHARE</span><span className="together-hero-note">{i18n.language === 'vi' ? 'Mỗi bạn một góc nhìn.' : 'Every reader brings a new point of view.'}</span></div>
    </header>
    <section className="together-journey" aria-labelledby="reading-circle">
      <div className="section-heading"><div><span className="eyebrow">{i18n.language === 'vi' ? 'TỪ TRANG SÁCH ĐẾN LỚP HỌC' : 'FROM THE PAGE TO THE CLASSROOM'}</span><h2 id="reading-circle" tabIndex={-1}>{copy.journey}</h2><p>{copy.journeyBody}</p></div><Link className="secondary" to="/library">{i18n.language === 'vi' ? 'Tìm một cuốn sách' : 'Find a book'} →</Link></div>
      <ol className="together-weeks">{copy.weeks.map((week, index) => <li key={index}><span className="together-week-number">{copy.week} {index + 1}</span><h3>{week.title}</h3><p>{week.body}</p><strong>{week.output}</strong></li>)}</ol>
    </section>
    <section aria-labelledby="together-activities-title" className="together-activities">
      <div className="section-heading"><div><h2 id="together-activities-title">{copy.activities}</h2><p>{copy.activitiesBody}</p></div></div>
      <div className="together-template-grid">{copy.templates.map((item, index) => <article className={`together-template together-template--${index}`} key={item.title}>
        <span className="eyebrow">{item.tag}</span><h3>{item.title}</h3><p>{item.body}</p><blockquote>{item.prompt}</blockquote><button className="text-button" onClick={() => startOutline(index)}>{copy.useTemplate} →</button>
      </article>)}</div>
    </section>
    <section className="together-workspace" aria-labelledby="reading-notebook">
      <div className="section-heading"><div><span className="eyebrow">{i18n.language === 'vi' ? 'Ý TƯỞNG CỦA EM, LỜI VĂN CỦA EM' : 'YOUR IDEAS, YOUR WORDS'}</span><h2 id="reading-notebook" tabIndex={-1} ref={notebookHeading}>{copy.notebook}</h2><p>{copy.notebookBody}</p></div></div>
      {template !== null && <div className="together-template-prompt"><strong>{copy.templates[template].title}</strong><p>{copy.templates[template].prompt}</p></div>}
      {state === 'loading' || accountLoading ? <p role="status">{copy.loading}</p> : state === 'unavailable' ? <p className="together-service-notice">{copy.unavailable}</p> : state === 'error' ? <div role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={() => { setState('loading'); refreshPublic(); }}>{copy.retry}</button></div> : user ? <ProjectNotebook key={`notebook:${user.id}`} ref={notebook} initialFormat="presentation" onPublicChange={refreshPublic} /> : <div className="together-guest-notebook"><p>{copy.guestBody}</p><Link className="primary" to="/sign-in?next=/community">{copy.signIn}</Link></div>}
      {state === 'ready' && user && <MyClassroomComments key={`comments:${user.id}`} />}
    </section>
    <section aria-labelledby="classroom-bookshelf" className="together-public-shelf">
      <div className="section-heading"><div><h2 id="classroom-bookshelf" tabIndex={-1}>{copy.showcase}</h2><p>{copy.showcaseBody}</p></div></div>
      {state === 'ready' && (projects.length ? <div className="together-published-grid">{projects.map(project => <PublishedDiscovery key={project.id} project={project} />)}</div> : <p className="together-empty-shelf">{copy.noShowcase}</p>)}
      {state === 'ready' && hasMore && <button className="secondary" disabled={paging} onClick={() => void loadMore()}>{paging ? copy.loading : copy.more}</button>}
      {state === 'ready' && failure !== null && <p role="alert">{requestFailureMessage(failure, i18n.language, copy.loadError)}</p>}
      <details className="together-examples"><summary>{copy.exampleHeading}</summary><p>{copy.exampleBody}</p>
        <ul className="showcase-grid" role="list" aria-label={t('exampleOnly')}>{(['garden', 'bridge'] as const).map(key => <li key={key}><article className={`showcase-card showcase-card--${key}`} aria-labelledby={`showcase-${key}`}>
          <div className="showcase-art" aria-hidden="true"><picture><source srcSet={`/images/community/${key}-800.webp 800w, /images/community/${key}-1600.webp 1600w`} sizes="(max-width: 760px) calc(100vw - 48px), 568px" type="image/webp" /><img src={`/images/community/${key}-1600.webp`} width="1600" height="1067" alt="" loading="lazy" decoding="async" /></picture></div>
          <div className="showcase-copy"><span className="eyebrow">{t('exampleOnly')}</span><h3 id={`showcase-${key}`}>{t(`showcases.${key}.title`)}</h3><p>{t(`showcases.${key}.body`)}</p><span className="muted">{t('fictionalWork')}</span></div>
        </article></li>)}</ul>
      </details>
    </section>
    <aside className="together-encouragement"><h2>{copy.supporting}</h2><p>{copy.supportingBody}</p></aside>
    {state === 'ready' && staffRole && user && <ProjectReviewDesk key={`${user.id}:${staffRole}`} onPublicChange={refreshPublic} />}
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
