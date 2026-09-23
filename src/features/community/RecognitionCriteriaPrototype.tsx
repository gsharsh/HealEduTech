import { useTranslation } from 'react-i18next';

const recognitionKeys = ['reader', 'explorer', 'helper'] as const;

export function RecognitionCriteriaPrototype() {
  const { t } = useTranslation();
  return <section className="recognition-preview" aria-labelledby="recognition-preview-heading">
    <div className="recognition-preview__heading">
      <div>
        <span className="eyebrow">{t('recognitionPrototype.kicker')}</span>
        <h2 id="recognition-preview-heading">{t('recognitionPrototype.title')}</h2>
        <p>{t('recognitionPrototype.intro')}</p>
      </div>
      <span className="recognition-preview__status">{t('recognitionPrototype.draft')}</span>
    </div>
    <div className="recognition-grid">
      {recognitionKeys.map((key, index) => <article className="recognition-card" key={key}>
        <div className={`recognition-mark recognition-mark--${index + 1}`} aria-hidden="true">{index === 0 ? '◇' : index === 1 ? '✦' : '○'}</div>
        <h3>{t(`recognitionPrototype.items.${key}.title`)}</h3>
        <p>{t(`recognitionPrototype.items.${key}.purpose`)}</p>
        <dl>
          <div>
            <dt>{t('recognitionPrototype.criteriaLabel')}</dt>
            <dd>{t(`recognitionPrototype.items.${key}.criteria`)}</dd>
          </div>
          <div>
            <dt>{t('recognitionPrototype.evidenceLabel')}</dt>
            <dd>{t(`recognitionPrototype.items.${key}.evidence`)}</dd>
          </div>
        </dl>
        <span className="recognition-card__result">{t('recognitionPrototype.notAwarded')}</span>
      </article>)}
    </div>
    <div className="recognition-boundary">
      <strong>{t('recognitionPrototype.boundaryTitle')}</strong>
      <p>{t('recognitionPrototype.boundary')}</p>
    </div>
  </section>;
}
