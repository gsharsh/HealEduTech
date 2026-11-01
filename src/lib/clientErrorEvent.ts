export const clientErrorKinds = ['render_error', 'chunk_load_error', 'script_error', 'unhandled_rejection'] as const;
export const clientErrorAreas = ['home', 'library', 'learning', 'explore', 'community', 'account', 'auth', 'staff', 'admin', 'information', 'other'] as const;
export type ClientErrorKind = typeof clientErrorKinds[number];
export type ClientErrorArea = typeof clientErrorAreas[number];
export interface ClientErrorEvent { kind: ClientErrorKind; area: ClientErrorArea }

/** No exception text, stack, identity, query string or record identifier is accepted. */
export function parseClientErrorEvent(value: unknown): ClientErrorEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !clientErrorKinds.includes(record.kind as ClientErrorKind) || !clientErrorAreas.includes(record.area as ClientErrorArea)) return null;
  return { kind: record.kind as ClientErrorKind, area: record.area as ClientErrorArea };
}

/** Report only a coarse area: book/user IDs, searches and auth callbacks stay on the device. */
export function errorArea(pathname: string): ClientErrorArea {
  if (pathname === '/') return 'home';
  const section = pathname.split('/')[1];
  if (['library', 'learning', 'explore', 'community', 'account', 'staff', 'admin'].includes(section)) return section as ClientErrorArea;
  if (section === 'sign-in' || section === 'reset-password') return 'auth';
  if (['start', 'help', 'privacy'].includes(section)) return 'information';
  return 'other';
}
