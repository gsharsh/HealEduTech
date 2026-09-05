import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

const savedLanguage = window.localStorage.getItem("evg-language");
const initialLanguage = savedLanguage === "vi" ? "vi" : "en";

document.documentElement.lang = initialLanguage;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  window.localStorage.setItem("evg-language", language);
});

export default i18n;
