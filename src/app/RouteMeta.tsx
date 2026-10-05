import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const labels = {
  en: { '/': 'Home', '/start': 'Quick guide', '/learning': 'My reading', '/library': 'Library', '/explore': 'Explore', '/community': 'Together', '/account': 'Account', '/sign-in': 'Sign in', '/reset-password': 'Reset password', '/staff': 'Library desk', '/staff/catalogue': 'Catalogue', '/staff/circulation': 'Loans & returns', '/staff/training': 'Community training', '/admin/settings': 'Administration' },
  vi: { '/': 'Trang chủ', '/start': 'Hướng dẫn nhanh', '/learning': 'Sách của em', '/library': 'Thư viện', '/explore': 'Khám phá', '/community': 'Cùng nhau', '/account': 'Tài khoản', '/sign-in': 'Đăng nhập', '/reset-password': 'Đặt lại mật khẩu', '/staff': 'Quầy thư viện', '/staff/catalogue': 'Danh mục sách', '/staff/circulation': 'Mượn & trả sách', '/staff/training': 'Đào tạo cộng đồng', '/admin/settings': 'Quản trị' },
} as const;

export function RouteMeta() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  useEffect(() => {
    const language = i18n.language === 'vi' ? 'vi' : 'en';
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const isBookDetail = /^\/library\/[^/]+$/.test(normalizedPath);
    const label = labels[language][normalizedPath as keyof typeof labels.en] ?? (isBookDetail ? labels[language]['/library'] : language === 'vi' ? 'Trang không tìm thấy' : 'Page not found');
    document.title = normalizedPath === '/' ? `EVG · ${label}` : `${label} · EVG`;
  }, [i18n.language, pathname]);
  return null;
}
