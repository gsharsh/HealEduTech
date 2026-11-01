export type PublicLanguage = 'en' | 'vi';
export type PublicPageKey = 'home' | 'start' | 'help' | 'privacy';

const paths: Record<PublicPageKey, string> = { home: '/', start: '/start', help: '/help', privacy: '/privacy' };

export function getPublicRoute(pathname: string): { key: PublicPageKey; path: string; language: PublicLanguage } | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const language = normalized === '/vi' || normalized.startsWith('/vi/') ? 'vi' : 'en';
  const path = language === 'vi' ? normalized.slice(3) || '/' : normalized;
  const entry = Object.entries(paths).find(([, value]) => value === path);
  return entry ? { key: entry[0] as PublicPageKey, path, language } : null;
}

export function publicPath(path: string, language: string): string {
  const route = getPublicRoute(path);
  if (!route) return path;
  return language === 'vi' ? `/vi${route.path === '/' ? '' : route.path}` : route.path;
}

export const publicPagePaths = Object.values(paths);

export const publicPages = {
  en: {
    home: { title: 'EVG · Learn & grow', description: 'Find a book, explore a new interest, and grow with the EVG community library.' },
    start: { title: 'Quick guide · EVG', description: 'Learn how to browse books, save your reading, and get help at the EVG library.' },
    help: { title: 'Help & support · EVG', description: 'Get help with your EVG account, reading records, and borrowing books at the library desk.' },
    privacy: { title: 'Privacy · EVG', description: 'Understand what EVG stores, what library staff can see, and how to ask for help with your information.' },
  },
  vi: {
    home: { title: 'EVG · Học hỏi và trưởng thành', description: 'Tìm sách, khám phá sở thích mới và cùng trưởng thành với thư viện cộng đồng EVG.' },
    start: { title: 'Hướng dẫn nhanh · EVG', description: 'Tìm hiểu cách xem sách, lưu việc đọc và nhận hỗ trợ tại thư viện EVG.' },
    help: { title: 'Trợ giúp · EVG', description: 'Nhận hỗ trợ về tài khoản EVG, việc đọc và mượn sách tại bàn thư viện.' },
    privacy: { title: 'Quyền riêng tư · EVG', description: 'Tìm hiểu thông tin EVG lưu, những gì nhân viên thư viện có thể xem và cách yêu cầu hỗ trợ.' },
  },
} as const;
