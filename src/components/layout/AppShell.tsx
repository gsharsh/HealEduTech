import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAccount } from '../../features/auth/context';
import { libraryTranslations } from '../../features/library/libraryTranslations';
const destinations = [['/learning', 'home', '⌂'], ['/library', 'library', '▤'], ['/explore', 'explore', '⌁'], ['/community', 'community', '☷']];
export function AppShell() {
  const { t, i18n } = useTranslation();
  const { user } = useAccount();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [help, setHelp] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('skip')}</a>
      <aside className="sidebar">
        <NavLink className="brand" to="/learning" aria-label="EVG Learn & Grow">
          <span className="brand-mark">e.</span>
          <span>EVG<span className="brand-sub">{t('brandSub')}</span></span>
        </NavLink>
        <span className="nav-label">{t('yourSpace')}</span>
        <nav aria-label={t('navigation')}>
          {destinations.map(([path, key, symbol]) => (
            <NavLink key={path} to={path}>
              <span className="nav-icon" aria-hidden="true">{symbol}</span>
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className="staff-link" to="/admin">
            {t('staff')} <span aria-hidden="true">↗</span>
          </NavLink>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <NavLink className="compact-brand" to="/learning" aria-label="EVG Learn & Grow">
            <span className="brand-mark">e.</span>
            <span>EVG</span>
          </NavLink>
          <div className="topbar-actions">
            <NavLink className="topbar-button" to="/sign-in">{user ? copy.account : copy.signIn}</NavLink>
            <button className="topbar-button" onClick={() => void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')} lang={i18n.language === 'vi' ? 'en' : 'vi'}>
              {i18n.language === 'vi' ? 'English' : 'Tiếng Việt'}
            </button>
            <button className="help-button" aria-expanded={help} onClick={() => setHelp(value => !value)}>
              {t('help')} <span aria-hidden="true">?</span>
            </button>
          </div>
        </header>
        {help && (
          <div className="help-panel">
            <div>
              <strong>{t('helpTitle')}</strong>
              <p>{t('helpBody')}</p>
            </div>
            <button className="secondary" onClick={() => setHelp(false)}>{t('close')}</button>
          </div>
        )}
        <div className="demo-banner">
          <span className="demo-dot" aria-hidden="true" />
          <span>{supabase ? copy.pilot : t('demo')}</span>
        </div>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer><NavLink to="/admin">{t('staff')}</NavLink></footer>
      </div>
    </div>
  );
}
