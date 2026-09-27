import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAccount } from '../../features/auth/context';
import { libraryTranslations } from '../../features/library/libraryTranslations';
import './app-shell.css';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const { user, accessStatus, staffRole } = useAccount();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const { pathname } = useLocation();
  const isVietnamese = i18n.language === 'vi';

  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="evg-shell">
      <a className="evg-skip-link" href="#main-content">{t('skip')}</a>
      <header className="evg-header">
        <NavLink className="evg-brand" to="/" aria-label="EVG Learn & Grow">
          <span className="evg-brand-name">EVG</span>
        </NavLink>
        <nav className="evg-primary-nav" aria-label={t('navigation')}>
          <NavLink end to="/">{isVietnamese ? 'Trang chủ' : 'Home'}</NavLink>
          <NavLink to="/library">{t('library')}</NavLink>
          <NavLink to="/learning">{isVietnamese ? 'Sách của em' : 'My reading'}</NavLink>
        </nav>
        <div className="evg-header-actions">
          <NavLink className="evg-guide-link" to="/start">{isVietnamese ? 'Hướng dẫn nhanh' : 'Quick guide'}</NavLink>
          <NavLink className="evg-account-link" to="/sign-in">{user ? copy.account : copy.signIn}</NavLink>
          <div className="evg-language">
            <button
              type="button"
              className="evg-language-toggle"
              role="switch"
              aria-checked={isVietnamese}
              aria-label="Tiếng Việt / Vietnamese"
              onClick={() => void i18n.changeLanguage(isVietnamese ? 'en' : 'vi')}
            >
              <span className="evg-language-option">EN</span>
              <span className="evg-language-option">VI</span>
            </button>
          </div>
        </div>
      </header>

      {accessStatus === 'ready' && staffRole && (
        <nav className="evg-staff-nav" aria-label={t('access.navigation')}>
          <span className="evg-staff-label">{t('access.staffArea')}</span>
          <NavLink to="/staff/catalogue">{t('access.catalogue')}</NavLink>
          <NavLink to="/staff/circulation">{t('access.circulation')}</NavLink>
          {staffRole === 'administrator' && <NavLink to="/admin/settings">{t('access.administration')}</NavLink>}
        </nav>
      )}

      {!supabase && <div className="evg-demo-banner" role="status">
        <span className="evg-demo-dot" aria-hidden="true" />
        <span>{t('demo')}</span>
      </div>}

      <main className="evg-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="evg-footer">
        <span lang="en">EVG · Learn &amp; grow</span>
        <nav aria-label={isVietnamese ? 'Liên kết bổ sung' : 'More links'}>
          <NavLink to="/start">{isVietnamese ? 'Hướng dẫn nhanh' : 'Quick guide'}</NavLink>
          <NavLink to="/explore">{t('explore')}</NavLink>
          <NavLink to="/community">{t('community')}</NavLink>
        </nav>
        <span>{t('footer')}</span>
      </footer>
    </div>
  );
}
