import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createServer, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { publicPagePaths, publicPath } from '../src/content/publicPages.ts';
import { pageMetadata, defaultSiteUrl, type PageMetadata } from '../src/app/pageMetadata.ts';

const root = process.cwd();
const values = { ...loadEnv('production', root, 'VITE_'), ...process.env };
const siteUrl = new URL(values.VITE_SITE_URL || defaultSiteUrl).origin;
if (!siteUrl.startsWith('https://')) throw new Error('VITE_SITE_URL must be an HTTPS origin.');
const template = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

function documentHead(metadata: PageMetadata) {
  const canonical = new URL(metadata.path, siteUrl).href;
  const meta = (attribute: string, key: string, value: string) => `<meta ${attribute}="${key}" content="${escape(value)}" />`;
  const alternates = metadata.alternates ? [...Object.entries(metadata.alternates), ['x-default', metadata.alternates.en]].map(([language, route]) => `<link rel="alternate" hreflang="${language}" href="${new URL(route, siteUrl).href}" />`).join('\n') : '';
  return `<title>${escape(metadata.title)}</title>\n${[
    meta('name', 'description', metadata.description), meta('name', 'robots', metadata.index ? 'index,follow' : 'noindex,follow'),
    meta('property', 'og:title', metadata.title), meta('property', 'og:description', metadata.description), meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'EVG · Learn & grow'), meta('property', 'og:locale', metadata.language === 'vi' ? 'vi_VN' : 'en_US'),
    meta('property', 'og:url', canonical), meta('property', 'og:image', `${siteUrl}/social-card.png`),
    meta('name', 'twitter:card', 'summary_large_image'), meta('name', 'twitter:title', metadata.title), meta('name', 'twitter:description', metadata.description),
  ].join('\n')}\n<link rel="canonical" href="${canonical}" />\n${alternates}`;
}

const base = template.replace(/<title>[^<]*<\/title>/, '').replace(/<meta\s+name="description"[\s\S]*?\/>/, '').replace(/<meta\s+name="robots"[^>]*\/>/, '');
// App-only paths get an unpersonalised shell, never a snapshot of account data.
await writeFile(path.join(root, 'dist/app.html'), base.replace('</head>', `${documentHead(pageMetadata('/account', 'en'))}</head>`));
const vite = await createServer({ configFile: false, mode: 'production', plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const routes: string[] = [];
try {
  const { renderPublicPage } = await vite.ssrLoadModule('/src/entry-public.tsx');
  for (const language of ['en', 'vi'] as const) for (const page of publicPagePaths) {
    const route = publicPath(page, language);
    const html = await renderPublicPage(route);
    const filename = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
    const destination = path.join(root, 'dist', filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, base.replace('<html lang="en">', `<html lang="${language}">`).replace('</head>', `${documentHead(pageMetadata(route, language))}</head>`).replace('<div id="root"></div>', () => `<div id="root">${html}</div>`));
    routes.push(route);
  }
  const html = await renderPublicPage('/not-found');
  await writeFile(path.join(root, 'dist/404.html'), base.replace('</head>', `${documentHead(pageMetadata('/not-found', 'en'))}</head>`).replace('<div id="root"></div>', () => `<div id="root">${html}</div>`));
} finally { await vite.close(); }

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${routes.map(route => {
  const metadata = pageMetadata(route, 'en');
  return `<url><loc>${siteUrl}${route}</loc>${Object.entries(metadata.alternates!).map(([language, alternate]) => `<xhtml:link rel="alternate" hreflang="${language}" href="${siteUrl}${alternate}"/>`).join('')}</url>`;
}).join('\n')}</urlset>`;
await writeFile(path.join(root, 'dist/sitemap.xml'), sitemap);
await writeFile(path.join(root, 'dist/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /learning\nDisallow: /sign-in\nDisallow: /reset-password\nDisallow: /staff\nDisallow: /admin\nDisallow: /api\nSitemap: ${siteUrl}/sitemap.xml\n`);
let commit = 'unknown';
let dirty_worktree = true;
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* Source archives may not include Git metadata. */ }
try {
  const changes = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  dirty_worktree = Boolean(changes);
  if (dirty_worktree) console.warn('Uncommitted build file paths (contents omitted):\n' + changes);
} catch { /* An archive cannot establish clean Git provenance. */ }
const required_migrations = (await readdir(path.join(root, 'supabase/migrations'))).filter(name => name.endsWith('.sql')).sort();
await writeFile(path.join(root, 'dist/release.json'), JSON.stringify({ version: '2026-11-01', commit, dirty_worktree, app_mode: values.VITE_APP_MODE === 'demo' ? 'demo' : 'live', required_migrations, public_routes: routes }, null, 2));
console.log(`Pre-rendered ${routes.length} bilingual public pages; generated sitemap, robots, 404, and release manifest.`);
