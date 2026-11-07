import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import type { Topic } from '../../demo/catalogue';
import { ActivityCard } from './ActivityCard';
import { exploreTopics } from './exploration';
import { exploreCopy } from './exploreCopy';
import { learningResources } from './learningResources';
import './explore.css';

const views = ['books', 'resources', 'activity'] as const;
type ExploreView = typeof views[number];

export function LearningJourney({ topic, onTopic, books, preferences, preferencesLabel, preferencesAttention = false, demo = false }: {
  topic: Topic;
  onTopic: (topic: Topic) => void;
  books: ReactNode;
  preferences: ReactNode;
  preferencesLabel?: string;
  preferencesAttention?: boolean;
  demo?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = exploreCopy[locale];
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view');
  const view: ExploreView = requestedView === 'resources' || requestedView === 'activity' ? requestedView : 'books';
  const tabs = useRef<Partial<Record<ExploreView, HTMLButtonElement | null>>>({});
  const preferencesRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // Reveal a load error, then leave the disclosure open while the student retries.
    // A successful load must not close a form they are using.
    if (preferencesAttention && preferencesRef.current) preferencesRef.current.open = true;
  }, [preferencesAttention]);

  function selectView(next: ExploreView) {
    setParams(current => {
      const nextParams = new URLSearchParams(current);
      if (next === 'books') nextParams.delete('view');
      else nextParams.set('view', next);
      return nextParams;
    }, { preventScrollReset: true });
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, current: ExploreView) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = views.indexOf(current);
    const next = event.key === 'ArrowRight' ? views[(index + 1) % views.length]
      : event.key === 'ArrowLeft' ? views[(index + views.length - 1) % views.length]
      : event.key === 'Home' ? views[0] : event.key === 'End' ? views[views.length - 1] : null;
    if (!next) return;
    event.preventDefault();
    selectView(next);
    tabs.current[next]?.focus();
  }

  return <div className="explore-page">
    <header className="explore-intro"><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    {demo && <p className="explore-demo">{copy.demoBody}</p>}
    <div className="explore-toolbar">
      <label className="explore-topic-field" htmlFor="explore-topic"><span>{copy.topicLabel}</span><select id="explore-topic" value={topic} onChange={event => onTopic(event.target.value as Topic)}>{exploreTopics.map(item => <option key={item} value={item}>{t(`topics.${item}`)}</option>)}</select></label>
      <div className="explore-tabs" role="tablist" aria-label={copy.viewLabel}>
        {views.map(item => <button type="button" role="tab" key={item} id={`explore-tab-${item}`} aria-controls={`explore-panel-${item}`} aria-selected={view === item} tabIndex={view === item ? 0 : -1} ref={node => { tabs.current[item] = node; }} onClick={() => selectView(item)} onKeyDown={event => navigateTabs(event, item)}>{copy.views[item]}</button>)}
      </div>
    </div>
    <section className="explore-content-view" role="tabpanel" id="explore-panel-books" aria-labelledby="explore-tab-books" hidden={view !== 'books'}>
      <h2 className="evg-sr-only">{copy.read}</h2>
      {books}
      <Link className="explore-browse-link" to={`/library?topic=${topic}`}>{copy.browse} <span aria-hidden="true">→</span></Link>
    </section>
    <section className="explore-content-view" role="tabpanel" id="explore-panel-resources" aria-labelledby="explore-tab-resources" hidden={view !== 'resources'}>
      <h2 className="evg-sr-only">{copy.views.resources}</h2>
      <p className="explore-resource-note" id="explore-external-note">{copy.external}</p>
      <div className="explore-resources">{learningResources.filter(resource => resource.topic === topic).map(resource => <article className="explore-resource" key={resource.id}>
        <h3><a href={locale === 'vi' && resource.vietnameseUrl ? resource.vietnameseUrl : resource.url} target="_blank" rel="noopener noreferrer" aria-describedby="explore-external-note">{resource.title[locale]} <span aria-hidden="true">↗</span></a></h3>
        <p className="explore-resource-meta">{resource.publisher} · {copy.resourceKinds[resource.kind]} · {resource.language === 'en' ? copy.english : copy.bilingual}</p>
        <p>{resource.description[locale]}</p>
        <details className="explore-resource-prompt"><summary>{copy.resourcePrompt}</summary><p>{resource.prompt[locale]}</p></details>
      </article>)}</div>
      <p className="explore-resource-note">{copy.resourceNote}</p>
    </section>
    <section className="explore-content-view" role="tabpanel" id="explore-panel-activity" aria-labelledby="explore-tab-activity" hidden={view !== 'activity'}>
      <ActivityCard key={topic} topic={topic} />
      <div className="explore-reflection"><p>{copy.reflectBody}</p><Link className="explore-browse-link" to="/learning">{copy.readingLink} <span aria-hidden="true">→</span></Link><Link className="explore-browse-link" to="/community">{copy.togetherLink} <span aria-hidden="true">→</span></Link></div>
    </section>
    {preferencesLabel ? <details className="explore-preferences" ref={preferencesRef}><summary>{preferencesLabel}</summary>{preferences}</details> : preferences}
  </div>;
}
