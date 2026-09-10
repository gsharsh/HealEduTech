import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const destinations = [['/learning', 'home', '⌂'], ['/library', 'library', '▤'], ['/explore', 'explore', '⌁'], ['/community', 'community', '☷']];
export function AppShell() {
  const { t, i18n } = useTranslation();
  const [help, setHelp] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <aside className="sidebar">
      <NavLink className="brand" to="/learning">
        <span className="brand-mark">e.</span>
        <span>EVG<span className="brand-sub">{t('brandSub')}</span>
        </span>
      </NavLink>
      <span className="nav-label">{t('yourSpace')}</span>
      <nav aria-label={t('navigation')}>{destinations.map(([path, key, symbol]) => <NavLink key={path} to={path}>
        <span className="nav-icon" aria-hidden="true">{symbol}</span>{t(key)}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span aria-hidden="true">✳</span>
          <strong>{t('smallSteps')}</strong>
          <p>{t('smallStepsBody')}</p>
        </div>
        <NavLink className="staff-link" to="/admin">{t('staff')} <span aria-hidden="true">↗</span>
        </NavLink>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <span className="centre-name">{t('centre')}</span>
        <div className="topbar-actions">
          <button className="language-button" onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')} lang={i18n.language === 'vi' ? 'en' : 'vi'}>{i18n.language === 'vi' ? 'English' : 'Tiếng Việt'} <span aria-hidden="true">◎</span>
          </button>
          <button className="help-button" aria-expanded={help} onClick={() => setHelp(value => !value)}>{t('help')} <span aria-hidden="true">?</span>
          </button>
        </div>
      </header>{help && <div className="help-panel">
        <strong>{t('helpTitle')}</strong>
        <p>{t('helpBody')}</p>
        <button className="secondary" onClick={() => setHelp(false)}>{t('close')}</button>
      </div>}<div className="demo-banner">
        <span className="demo-dot" />{t('demo')}</div>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer>{t('footer')}<NavLink to="/admin">{t('staff')}</NavLink>
      </footer>
    </div>
  </div>;
}
