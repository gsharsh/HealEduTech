import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

const navigation = [
  { to: "/learning", label: "nav.learning", icon: "📖" },
  { to: "/explore", label: "nav.explore", icon: "🧭" },
  { to: "/community", label: "nav.community", icon: "💬" },
] as const;

export function AppShell() {
  const { i18n, t } = useTranslation();
  const nextLanguage = i18n.resolvedLanguage === "vi" ? "en" : "vi";

  const changeLanguage = () => {
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("a11y.skipToContent")}
      </a>
      <header className="topbar">
        <NavLink className="brand" to="/learning" aria-label={t("app.homeLabel")}>
          <span className="brand-mark" aria-hidden="true">EVG</span>
          <span>{t("app.name")}</span>
        </NavLink>
        <div className="topbar-actions">
          <button className="language-switch" type="button" onClick={changeLanguage}>
            {nextLanguage === "en" ? "English" : "Tiếng Việt"}
          </button>
          <NavLink className="staff-link" to="/admin">
            {t("nav.staff")}
          </NavLink>
        </div>
      </header>

      <div className="page-frame">
        <nav className="primary-nav" aria-label={t("nav.primaryLabel")}>
          {navigation.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <span aria-hidden="true">{icon}</span>
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        <main id="main-content" className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
