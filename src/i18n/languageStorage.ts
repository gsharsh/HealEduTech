export type Language = 'en' | 'vi';

type StorageAccessor = () => Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage: StorageAccessor = () => window.localStorage;

export function readSavedLanguage(getStorage: StorageAccessor = browserStorage): Language {
  try {
    return getStorage().getItem('evg-language') === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

export function persistLanguage(language: string, getStorage: StorageAccessor = browserStorage): void {
  try {
    getStorage().setItem('evg-language', language === 'vi' ? 'vi' : 'en');
  } catch {
    // Language changes still work for this page through i18next when storage is unavailable.
  }
}
