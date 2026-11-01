import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { App } from './app/App';
import i18n from './i18n';
import { getPublicRoute } from './content/publicPages';

export async function renderPublicPage(path: string) {
  await i18n.changeLanguage(getPublicRoute(path)?.language ?? 'en');
  return renderToString(<StaticRouter location={path}><App /></StaticRouter>);
}
