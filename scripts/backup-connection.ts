/** Parse a secret connection without exposing it. Remote backups always verify server identity. */
export function backupConnectionEnvironment(connection: string, base: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  let parsed: URL;
  try { parsed = new URL(connection); } catch { throw new Error('The database connection must be a PostgreSQL URL stored in the named environment variable.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.username || (!parsed.hostname && !parsed.searchParams.get('host'))) throw new Error('Expected an explicit PostgreSQL host and user in the named connection.');
  const supported = new Map([['host', 'PGHOST'], ['port', 'PGPORT'], ['sslmode', 'PGSSLMODE'], ['sslrootcert', 'PGSSLROOTCERT'], ['sslcert', 'PGSSLCERT'], ['sslkey', 'PGSSLKEY'], ['channel_binding', 'PGCHANNELBINDING']]);
  const environment: NodeJS.ProcessEnv = {
    ...Object.fromEntries(Object.entries(base).filter(([name]) => !name.startsWith('PG'))),
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''), PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username), PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)) || 'postgres', PGCONNECT_TIMEOUT: '20',
    PGAPPNAME: 'evg-readonly-backup', PGOPTIONS: '-c default_transaction_read_only=on',
  };
  for (const [key, value] of parsed.searchParams) {
    const setting = supported.get(key);
    if (!setting) throw new Error(`Unsupported database URL option: ${key}. Use standard connection and TLS fields only.`);
    environment[setting] = value;
  }
  const host = environment.PGHOST ?? '';
  const local = host.startsWith('/') || ['localhost', '127.0.0.1', '::1'].includes(host);
  if (!local) {
    if (environment.PGSSLMODE && environment.PGSSLMODE !== 'verify-full') throw new Error('Remote backups require sslmode=verify-full; weaker modes are not accepted.');
    environment.PGSSLMODE = 'verify-full';
    environment.PGSSLROOTCERT ||= 'system';
  }
  return environment;
}
