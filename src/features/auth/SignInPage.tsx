import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export function SignInPage() {
  const { t, i18n } = useTranslation();
  return <main className="sign-in-page">
    <div className="sign-in-card">
      <span className="brand-mark">e.</span>
      <span className="eyebrow">EVG VIETNAM</span>
      <h1>{t('welcome')}</h1>
      <p>{t('signInPreview')}</p>
      <Link className="primary" to="/learning">{t('openPreview')} →</Link>
      <button className="secondary" onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>{i18n.language === 'vi' ? 'English' : 'Tiếng Việt'}</button>
    </div>
  </main>;
}
