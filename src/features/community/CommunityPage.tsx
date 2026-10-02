import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProjectFeedbackPrototype } from './ProjectFeedbackPrototype';
import { TopicArtwork } from '../home/TopicArtwork';
import './community.css';
export function CommunityPage() {
  const { t } = useTranslation();
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('community')}</span>
        <h1>{t('communityTitle')}</h1>
        <p>{t('communityBody')}</p>
      </div>
    </div>
    <div className="showcase-grid">{['garden', 'bridge'].map((key, index) => <article className="showcase-card" key={key}>
      <div className={`showcase-art ${index ? 'ochre' : 'sage'}`} aria-hidden="true"><TopicArtwork topic={index ? 'science' : 'nature'} /><span>{t('sampleProject')}</span>
      </div>
      <div className="showcase-copy">
        <span className="eyebrow">{t('exampleOnly')}</span>
        <h2>{t(`showcases.${key}.title`)}</h2>
        <p>{t(`showcases.${key}.body`)}</p>
        <span className="muted">{t('fictionalWork')}</span>
      </div>
    </article>)}</div>
    <section className="community-next-step" aria-labelledby="community-next-step-title">
      <h2 id="community-next-step-title">{t('communityNextStep.title')}</h2>
      <p>{t('communityNextStep.body')}</p>
      <Link className="secondary" to="/explore">{t('communityNextStep.action')} →</Link>
    </section>
    <ProjectFeedbackPrototype />
    <aside className="future-panel">
      <span className="future-label">{t('later')}</span>
      <div>
        <h2>{t('sharingLater')}</h2>
        <p>{t('sharingBody')}</p>
      </div>
    </aside>
  </>;
}
