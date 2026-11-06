import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Topic } from '../../demo/catalogue';
import { ActivityCard } from './ActivityCard';
import { exploreTopics } from './exploration';
import { exploreCopy } from './exploreCopy';
import { learningResources } from './learningResources';
import './explore.css';

export function LearningJourney({ topic, onTopic, books, preferences, demo = false }: {
  topic: Topic;
  onTopic: (topic: Topic) => void;
  books: ReactNode;
  preferences: ReactNode;
  demo?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = exploreCopy[locale];
  return <div className="explore-page">
    <header className="explore-intro">
      <div><span className="eyebrow">{copy.individual}</span><h1>{t('exploreTitle')}</h1><p>{copy.intro}</p></div>
      <div className="explore-intro-art" aria-hidden="true"><span>?</span><i>✳</i><b>↗</b></div>
    </header>
    {demo && <aside className="explore-demo"><strong>{copy.demo}</strong><p>{copy.demoBody}</p></aside>}
    <section className="explore-choices" aria-labelledby="explore-choice-heading">
      <h2 id="explore-choice-heading">{copy.choose}</h2><p>{copy.chooseBody}</p>
      <div className="explore-topic-options" role="group" aria-label={copy.choose}>
        {exploreTopics.map(item => <button type="button" key={item} className={`explore-topic-option explore-topic-option--${item}`} aria-pressed={item === topic} onClick={() => onTopic(item)}>
          <span className="explore-topic-symbol" aria-hidden="true">{item === 'nature' ? '✳' : item === 'stories' ? '≈' : '△'}</span>
          <span><strong>{t(`topics.${item}`)}</strong><small>{copy.topicNotes[item]}</small></span>
          <span className="explore-topic-selected" aria-hidden="true">{item === topic ? '✓' : '→'}</span>
        </button>)}
      </div>
    </section>
    <div className="explore-journey" aria-label={copy.path}>
      <section className="explore-chapter" aria-labelledby="explore-books-heading">
        <div className="explore-chapter-heading"><span className="explore-chapter-number" aria-hidden="true">01</span><div><h2 id="explore-books-heading">{copy.read}</h2><p>{copy.readBody}</p></div></div>
        {books}
        <Link className="explore-browse-link" to={`/library?topic=${topic}`}>{copy.browse} <span aria-hidden="true">→</span></Link>
      </section>
      <section className="explore-chapter" aria-labelledby="explore-resources-heading">
        <div className="explore-chapter-heading"><span className="explore-chapter-number" aria-hidden="true">02</span><div><h2 id="explore-resources-heading">{copy.watch}</h2><p>{copy.watchBody}</p></div></div>
        <div className="explore-resources">{learningResources.filter(resource => resource.topic === topic).map(resource => <article className="explore-resource" key={resource.id}>
          <div className="explore-resource-meta"><span>{copy.resourceKinds[resource.kind]}</span><span>{resource.language === 'en' ? copy.english : copy.bilingual}</span></div>
          <h3><a href={locale === 'vi' && resource.vietnameseUrl ? resource.vietnameseUrl : resource.url} target="_blank" rel="noopener noreferrer" aria-describedby={`resource-external-${resource.id}`}>{resource.title[locale]} <span aria-hidden="true">↗</span></a></h3>
          <p className="explore-resource-publisher">{resource.publisher}</p>
          <p>{resource.description[locale]}</p>
          <p className="explore-resource-prompt">{resource.prompt[locale]}</p>
          <small id={`resource-external-${resource.id}`}>{copy.external}</small>
        </article>)}</div>
        <p className="explore-resource-note">{copy.resourceNote}</p>
      </section>
      <section className="explore-chapter explore-activity" aria-labelledby="explore-activity-heading">
        <div className="explore-chapter-heading"><span className="explore-chapter-number" aria-hidden="true">03</span><div><h2 id="explore-activity-heading">{copy.try}</h2></div></div>
        <ActivityCard key={topic} topic={topic} headingLevel={3} />
        <div className="explore-reflection"><div><h3>{copy.reflect}</h3><p>{copy.reflectBody}</p></div><div className="explore-reflection-links"><Link className="secondary" to="/learning">{copy.readingLink}</Link><Link className="explore-browse-link" to="/community">{copy.togetherLink} <span aria-hidden="true">→</span></Link></div></div>
      </section>
    </div>
    {preferences}
  </div>;
}
