import { getPublicRoute, publicPath, publicPages, type PublicLanguage } from '../content/publicPages.ts';

export const defaultSiteUrl = 'https://heal-edu-tech.vercel.app';
export interface PageMetadata { title: string; description: string; path: string; language: PublicLanguage; index: boolean; alternates?: { en: string; vi: string }; }

export function pageMetadata(pathname: string, language: string): PageMetadata {
  const route = getPublicRoute(pathname);
  if (route) return {
    ...publicPages[route.language][route.key], path: publicPath(route.path, route.language), language: route.language, index: true,
    alternates: { en: publicPath(route.path, 'en'), vi: publicPath(route.path, 'vi') },
  };
  const vi = language === 'vi';
  const labels: Record<string, string> = vi
    ? { '/library': 'Thư viện', '/learning': 'Sách của em', '/explore': 'Khám phá', '/community': 'Cùng nhau', '/account': 'Tài khoản', '/sign-in': 'Đăng nhập', '/reset-password': 'Đặt lại mật khẩu', '/staff': 'Quầy thư viện', '/staff/dashboard': 'Thống kê thư viện', '/staff/students': 'Học sinh', '/staff/catalogue': 'Danh mục sách', '/staff/circulation': 'Mượn & trả sách', '/staff/training': 'Đào tạo cộng đồng', '/admin/settings': 'Quản trị' }
    : { '/library': 'Library', '/learning': 'My reading', '/explore': 'Explore', '/community': 'Together', '/account': 'Account', '/sign-in': 'Sign in', '/reset-password': 'Reset password', '/staff': 'Library desk', '/staff/dashboard': 'Library dashboard', '/staff/students': 'Students', '/staff/catalogue': 'Catalogue', '/staff/circulation': 'Loans & returns', '/staff/training': 'Community training', '/admin/settings': 'Administration' };
  const path = pathname.replace(/\/+$/, '') || '/';
  const title = labels[path] ?? (/^\/library\/[^/]+$/.test(path) ? labels['/library'] : /^\/staff\/students\//.test(path) ? labels['/staff/students'] : vi ? 'Trang không tìm thấy' : 'Page not found');
  return { title: `${title} · EVG`, description: vi ? 'Không gian đọc và thư viện cộng đồng EVG.' : 'Your EVG reading and community library space.', path, language: vi ? 'vi' : 'en', index: false };
}

export function setPageMetadata(metadata: PageMetadata, siteUrl = defaultSiteUrl): void {
  document.title = metadata.title;
  document.documentElement.lang = metadata.language;
  const setMeta = (attribute: 'name' | 'property', key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.append(element); }
    element.content = value;
  };
  setMeta('name', 'description', metadata.description);
  setMeta('name', 'robots', metadata.index ? 'index,follow' : 'noindex,follow');
  setMeta('property', 'og:title', metadata.title);
  setMeta('property', 'og:description', metadata.description);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', 'EVG · Learn & grow');
  setMeta('property', 'og:locale', metadata.language === 'vi' ? 'vi_VN' : 'en_US');
  setMeta('property', 'og:url', new URL(metadata.path, siteUrl).href);
  setMeta('property', 'og:image', new URL('/social-card.png', siteUrl).href);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', metadata.title);
  setMeta('name', 'twitter:description', metadata.description);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = new URL(metadata.path, siteUrl).href;
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
  if (metadata.alternates) for (const [language, path] of [...Object.entries(metadata.alternates), ['x-default', metadata.alternates.en]]) {
    const link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = language; link.href = new URL(path, siteUrl).href; document.head.append(link);
  }
}
