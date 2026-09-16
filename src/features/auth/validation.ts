// Format checks improve feedback; Supabase validates the address and verifies ownership.
export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validPassword(value: string): boolean {
  return value.length >= 12 && value.length <= 128;
}

const appPaths = new Set(['/learning', '/library', '/explore', '/community', '/admin']);
export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/learning';
  const hasUnsafeCharacter = value.split('').some(character => {
    const code = character.charCodeAt(0);
    return character === '\\' || code < 32 || code === 127;
  });
  if (hasUnsafeCharacter || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return '/learning';
  try {
    const url = new URL(value, 'https://evg.local');
    return appPaths.has(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : '/learning';
  } catch {
    return '/learning';
  }
}

export function authErrorKey(error: { code?: string; status?: number }): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') return 'auth.rateLimit';
  if (error.code === 'email_address_not_authorized' || error.code === 'email_address_not_authorized_for_project') return 'auth.emailDelivery';
  if (error.code === 'email_not_confirmed') return 'auth.unconfirmed';
  if (error.code === 'otp_expired' || error.code === 'otp_disabled' || error.code === 'access_denied') return 'auth.linkExpired';
  if (error.code === 'weak_password') return 'auth.passwordHelp';
  if (error.code === 'invalid_credentials') return 'auth.invalidCredentials';
  return 'auth.failed';
}

export function authCallbackErrorFromUrl(href: string): string | null {
  const url = new URL(href);
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const code = query.get('error_code') ?? query.get('error') ?? hash.get('error_code') ?? hash.get('error');
  if (!code) return null;
  return authErrorKey({ code });
}

export function authCallbackError(): string | null {
  const result = authCallbackErrorFromUrl(window.location.href);
  if (!result) return null;
  window.history.replaceState({}, document.title, window.location.pathname);
  return result;
}
