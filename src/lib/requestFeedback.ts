export function isRequestRateLimited(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; status?: unknown; message?: unknown };
  return value.status === 429 || value.code === 'PT429' || value.code === 'EVG_RATE_LIMITED' || value.message === 'EVG_RATE_LIMITED';
}

/** Safe, bilingual feedback; raw service errors never become user-facing copy. */
export function requestFailureMessage(error: unknown, language: string, fallback: string): string {
  if (isRequestRateLimited(error)) return language === 'vi'
    ? 'Có quá nhiều yêu cầu trong thời gian ngắn. Hãy đợi một phút rồi thử lại. Giữ trang này mở để không mất nội dung đang nhập.'
    : 'There have been too many requests. Wait a minute, then try again. Keep this page open to preserve your draft.';
  const failure = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown } : null;
  if (failure?.name === 'TimeoutError' || (typeof failure?.message === 'string' && /\bTimeoutError\b/.test(failure.message))) return language === 'vi'
    ? 'Kết nối đang mất nhiều thời gian. Giữ trang này mở. Nếu đang lưu thay đổi, hãy kiểm tra trạng thái trước khi thử lại.'
    : 'The connection is taking too long. Keep this page open. If you were saving a change, check its status before trying again.';
  return fallback;
}
