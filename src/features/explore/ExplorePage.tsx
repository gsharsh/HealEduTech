import { useTranslation } from 'react-i18next';
import { useDemo } from '../../demo/context';
import { ActivityStack } from './ActivityStack';
export function ExplorePage() {
  const { t } = useTranslation();
  const { interests, toggleInterest } = useDemo();
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
    <ActivityStack />
    <section className="interests-panel">
      <h2>{t('yourInterests')}</h2>
      <p>{t('interestsBody')}</p>
      <div className="interest-options">{(['nature', 'stories', 'science'] as const).map(topic => <button type="button" key={topic} className={interests.includes(topic) ? 'selected' : ''} aria-pressed={interests.includes(topic)} onClick={() => toggleInterest(topic)}>{interests.includes(topic) ? '✓ ' : '+ '}{t(`topics.${topic}`)}</button>)}</div>
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
