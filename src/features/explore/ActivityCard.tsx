import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Topic } from '../../demo/catalogue';
import { TopicArtwork } from '../home/TopicArtwork';
import './activity-card.css';

export function ActivityCard({ topic }: { topic: Topic }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const activityId = `${topic}-activity`;

  return <article data-scroll-stack-card className={`topic-card topic-${topic}`}>
    <span className="topic-symbol" aria-hidden="true"><TopicArtwork topic={topic} /></span>
    <span className="eyebrow">{t(`topics.${topic}`)}</span>
    <h2>{t(`activities.${topic}.title`)}</h2>
    <p>{t(`activities.${topic}.body`)}</p>
    <button type="button" className="secondary" aria-expanded={open} aria-controls={activityId} onClick={() => setOpen(!open)}>{t(open ? 'close' : 'tryActivity')}<span aria-hidden="true">+</span></button>
    <div className="activity-reveal" data-open={open} aria-hidden={!open} inert={!open}>
      <div className="activity-reveal__clip">
        <div className="activity-detail activity-detail--steps" id={activityId} role="region" aria-label={t(`activities.${topic}.title`)}>
          <h3>{t('activityMaterials')}</h3>
          <p>{t(`activities.${topic}.materials`)}</p>
          <h3>{t('startHere')}</h3>
          <ol>{(t(`activities.${topic}.steps`, { returnObjects: true }) as string[]).map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>
          <h3>{t('activityReflect')}</h3>
          <p>{t(`activities.${topic}.reflection`)}</p>
          <Link className="activity-next-link" to={`/library?topic=${topic}`}>{t('activityRelatedBooks', { topic: t(`topics.${topic}`) })} →</Link>
        </div>
      </div>
    </div>
  </article>;
}
