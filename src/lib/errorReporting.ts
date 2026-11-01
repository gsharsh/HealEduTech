import { errorArea, type ClientErrorKind } from './clientErrorEvent';

const reported = new Set<ClientErrorKind>();

export function reportClientError(kind: ClientErrorKind) {
  if (!import.meta.env.PROD || import.meta.env.VITE_APP_MODE === 'demo' || reported.has(kind)) return;
  reported.add(kind);
  // Never transmit the exception, stack, message, URL, user identity or page content.
  // Vercel's same-origin endpoint records only these bounded categories.
  void fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    keepalive: true,
    body: JSON.stringify({ kind, area: errorArea(window.location.pathname) }),
  }).catch(() => { /* Reporting must never interrupt recovery. */ });
}

export function installErrorReporting() {
  window.addEventListener('error', () => reportClientError('script_error'));
  window.addEventListener('unhandledrejection', () => reportClientError('unhandled_rejection'));
}
