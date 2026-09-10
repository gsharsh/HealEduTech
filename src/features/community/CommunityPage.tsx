import { useTranslation } from 'react-i18next';
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
      <div className={`showcase-art ${index ? 'ochre' : 'sage'}`} aria-hidden="true">{index ? '△' : '✳'}<span>{t('sampleProject')}</span>
      </div>
      <div className="showcase-copy">
        <span className="eyebrow">{t('exampleOnly')}</span>
        <h2>{t(`showcases.${key}.title`)}</h2>
        <p>{t(`showcases.${key}.body`)}</p>
        <span className="muted">{t('fictionalWork')}</span>
      </div>
    </article>)}</div>
    <aside className="future-panel">
      <span className="future-label">{t('later')}</span>
      <div>
        <h2>{t('sharingLater')}</h2>
        <p>{t('sharingBody')}</p>
      </div>
    </aside>
  </>;
}
