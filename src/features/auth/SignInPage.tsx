import { useTranslation } from "react-i18next";

export function SignInPage() {
  const { i18n, t } = useTranslation();

  const changeLanguage = () => {
    void i18n.changeLanguage(i18n.resolvedLanguage === "vi" ? "en" : "vi");
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="brand-mark" aria-hidden="true">EVG</div>
        <p className="eyebrow">{t("app.name")}</p>
        <h1 id="sign-in-title">{t("auth.title")}</h1>
        <p>{t("auth.description")}</p>
        <form className="auth-form">
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" autoComplete="email" disabled />
          <label htmlFor="password">{t("auth.password")}</label>
          <input id="password" type="password" autoComplete="current-password" disabled />
          <button className="primary-button" type="button" disabled>{t("auth.submit")}</button>
        </form>
        <p className="form-note">{t("auth.scaffoldNote")}</p>
        <button className="text-button" type="button" onClick={changeLanguage}>{t("auth.switchLanguage")}</button>
      </section>
    </main>
  );
}
