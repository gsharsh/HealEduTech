import { parseClientErrorEvent } from '../src/lib/clientErrorEvent.ts';

interface Request {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Response {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(): unknown;
}
let windowStarted = 0;
let acceptedInWindow = 0;

/** Vercel Function: bounded operational categories, never exception messages or learner data. */
export default function handler(request: Request, response: Response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.statusCode = 405;
    response.end();
    return;
  }
  const origin = request.headers.origin;
  const host = request.headers.host;
  let sameOrigin = false;
  try {
    const url = new URL(typeof origin === 'string' ? origin : '');
    sameOrigin = url.host === host && ['https:', 'http:'].includes(url.protocol);
  } catch { /* Missing or malformed origins are not accepted. */ }
  if (!sameOrigin || request.headers['sec-fetch-site'] === 'cross-site') {
    response.statusCode = 403;
    response.end();
    return;
  }
  if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    response.statusCode = 415;
    response.end();
    return;
  }
  if (Number(request.headers['content-length'] ?? 0) > 256) {
    response.statusCode = 413;
    response.end();
    return;
  }
  let body: unknown;
  try {
    // Vercel's parsed-body getter can itself throw for malformed JSON.
    body = request.body;
    if (typeof body === 'string') body = body.length <= 256 ? JSON.parse(body) : null;
  } catch { body = null; }
  const event = parseClientErrorEvent(body);
  if (!event) {
    response.statusCode = 400;
    response.end();
    return;
  }
  const now = Date.now();
  if (now - windowStarted >= 60_000) { windowStarted = now; acceptedInWindow = 0; }
  // A per-instance volume cap complements the browser's one-event-per-kind limit.
  // This is deliberately not advertised as distributed abuse protection.
  if (acceptedInWindow >= 30) {
    response.setHeader('Retry-After', '60');
    response.statusCode = 429;
    response.end();
    return;
  }
  acceptedInWindow += 1;
  console.info('evg-client-error', JSON.stringify(event));
  response.statusCode = 204;
  response.end();
}
