import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InterestPicker } from '../learning/InterestPicker';
import type { Topic } from '../../demo/catalogue';
import '../learning/reading.css';

const topics: Topic[] = ['nature', 'stories', 'science'];

export function LiveExplorePage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Topic | null>(null);
  return <>
    <div className="page-heading"><div><span className="eyebrow">{t('explore')}</span><h1>{t('exploreTitle')}</h1><p>{t('exploreBody')}</p></div></div>
    <div className="section-heading"><div><h2>{t('pickCuriosity')}</h2><p>{t('editorial')}</p></div></div>
    <div className="topic-grid">{topics.map((topic, index) => <article key={topic} className={`topic-card topic-${topic}`}>
      <span className="topic-symbol" aria-hidden="true">{['✳', '≈', '△'][index]}</span><span className="eyebrow">0{index + 1} / {t(`topics.${topic}`)}</span><h2>{t(`activities.${topic}.title`)}</h2><p>{t(`activities.${topic}.body`)}</p>
      <button type="button" className="secondary" aria-expanded={open === topic} aria-controls={`${topic}-activity`} onClick={() => setOpen(open === topic ? null : topic)}>{t(open === topic ? 'close' : 'tryActivity')} →</button>
      {open === topic && <div className="activity-detail" id={`${topic}-activity`} role="region"><strong>{t('startHere')}</strong><p>{t(`activities.${topic}.instruction`)}</p></div>}
    </article>)}</div>
    <InterestPicker />
    <aside className="future-panel"><span className="future-label">{t('later')}</span><div><h2>{t('recommendationsTitle')}</h2><p>{t('recommendationsBody')}</p></div></aside>
  </>;
}
