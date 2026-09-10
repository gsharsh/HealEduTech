import { useTranslation } from 'react-i18next';
import { useDemo } from '../../demo/context';
import { books } from '../../demo/catalogue';
export function AdminPage() {
  const { t, i18n } = useTranslation();
  const { borrowed, toggleLoan } = useDemo();
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('staff')}</span>
        <h1>{t('staffTitle')}</h1>
        <p>{t('staffBody')}</p>
      </div>
    </div>
    <section className="staff-panel">
      <span className="eyebrow">{t('circulation')}</span>
      <h2>{books[0].title[i18n.language === 'vi' ? 'vi' : 'en']}</h2>
      <dl className="loan-facts">
        <div>
          <dt>{t('copy')}</dt>
          <dd>EVG-001</dd>
        </div>
        <div>
          <dt>{t('borrower')}</dt>
          <dd>{borrowed ? t('demoLearner') : '—'}</dd>
        </div>
        <div>
          <dt>{t('status')}</dt>
          <dd role="status">{t(borrowed ? 'onLoan' : 'ready')}</dd>
        </div>
        <div>
          <dt>{t('availabilityLabel')}</dt>
          <dd>{t('available', { count: borrowed ? 1 : 2 })}</dd>
        </div>
      </dl>
      <button className="primary" onClick={toggleLoan}>{t(borrowed ? 'recordReturn' : 'checkoutDemo')}</button>
      <p className="muted">{t('staffLoanNote')}</p>
    </section>
    <div className="future-panel">
      <span className="future-label">{t('later')}</span>
      <div>
        <h2>{t('operationsLater')}</h2>
        <p>{t('operationsBody')}</p>
      </div>
    </div>
  </>;
}
