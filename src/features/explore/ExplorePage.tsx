import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useDemo } from '../../demo/context';
import type { Topic } from '../../demo/catalogue';
const topics: Topic[] = ['nature', 'stories', 'science'];
export function ExplorePage() {
  const { t } = useTranslation();
  const { interests, toggleInterest } = useDemo();
  const [open, setOpen] = useState<Topic | null>(null);
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('explore')}</span>
        <h1>{t('exploreTitle')}</h1>
        <p>{t('exploreBody')}</p>
      </div>
    </div>
    <div className="section-heading">
      <div>
        <h2>{t('pickCuriosity')}</h2>
        <p>{t('editorial')}</p>
      </div>
    </div>
    <div className="topic-grid">{topics.map((topic, index) => <article key={topic} className={`topic-card topic-${topic}`}>
      <span className="topic-symbol" aria-hidden="true">{['✳', '≈', '△'][index]}</span>
      <span className="eyebrow">0{index + 1} / {t(`topics.${topic}`)}</span>
      <h2>{t(`activities.${topic}.title`)}</h2>
      <p>{t(`activities.${topic}.body`)}</p>
      <button className="secondary" aria-expanded={open === topic} onClick={() => setOpen(open === topic ? null : topic)}>{t(open === topic ? 'close' : 'tryActivity')} →</button>{open === topic && <div className="activity-detail">
        <strong>{t('startHere')}</strong>
        <p>{t(`activities.${topic}.instruction`)}</p>
      </div>}</article>)}</div>
    <section className="interests-panel">
      <h2>{t('yourInterests')}</h2>
      <p>{t('interestsBody')}</p>
      <div className="interest-options">{topics.map(topic => <button key={topic} className={interests.includes(topic) ? 'selected' : ''} aria-pressed={interests.includes(topic)} onClick={() => toggleInterest(topic)}>{interests.includes(topic) ? '✓ ' : '+ '}{t(`topics.${topic}`)}</button>)}</div>
    </section>
    <aside className="future-panel">
      <span className="future-label">{t('later')}</span>
      <div>
        <h2>{t('recommendationsTitle')}</h2>
        <p>{t('recommendationsBody')}</p>
      </div>
    </aside>
  </>;
}
