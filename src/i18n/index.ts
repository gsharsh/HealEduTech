import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";
import { persistLanguage, readSavedLanguage } from "./languageStorage";
import { getPublicRoute } from '../content/publicPages';

// Keep a returning reader's chosen Vietnamese homepage while giving public
// English and Vietnamese documents stable URLs for sharing and discovery.
if (typeof window !== 'undefined' && window.location.pathname === '/' && readSavedLanguage() === 'vi') {
  window.history.replaceState(window.history.state, '', `/vi${window.location.search}${window.location.hash}`);
}
const initialLanguage = typeof window === 'undefined' ? 'en' : getPublicRoute(window.location.pathname)?.language ?? readSavedLanguage();

if (typeof document !== 'undefined') document.documentElement.lang = initialLanguage;
if (typeof window !== 'undefined') persistLanguage(initialLanguage);

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  if (typeof document !== 'undefined') document.documentElement.lang = language === "vi" ? "vi" : "en";
  if (typeof window !== 'undefined') persistLanguage(language);
});

export default i18n;
