import { useTranslation } from 'react-i18next';
import { InterestPicker } from '../learning/InterestPicker';
import { ActivityStack } from './ActivityStack';
import '../learning/reading.css';

export function LiveExplorePage() {
  const { t } = useTranslation();
  return <>
    <div className="page-heading"><div><span className="eyebrow">{t('explore')}</span><h1>{t('exploreTitle')}</h1><p>{t('exploreBody')}</p></div></div>
    <div className="section-heading"><div><h2>{t('pickCuriosity')}</h2><p>{t('editorial')}</p></div></div>
    <ActivityStack />
    <InterestPicker />
    <aside className="future-panel"><span className="future-label">{t('later')}</span><div><h2>{t('recommendationsTitle')}</h2><p>{t('recommendationsBody')}</p></div></aside>
  </>;
}
