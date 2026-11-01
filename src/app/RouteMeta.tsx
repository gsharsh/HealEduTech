import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicRoute } from '../content/publicPages';
import { pageMetadata, setPageMetadata, defaultSiteUrl } from './pageMetadata';

export function RouteMeta() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const routeLanguage = getPublicRoute(pathname)?.language;
  useEffect(() => {
    if (routeLanguage && i18n.language !== routeLanguage) void i18n.changeLanguage(routeLanguage);
    setPageMetadata(pageMetadata(pathname, routeLanguage ?? i18n.language), import.meta.env.VITE_SITE_URL || defaultSiteUrl);
  }, [i18n, i18n.language, pathname, routeLanguage]);
  return null;
}
