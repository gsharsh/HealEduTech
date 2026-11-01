/** Offline Auth/PostgREST rehearsal for an already verified, owned disposable restore. */
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SERVICE_IMAGES = {
  database: 'docker.io/supabase/postgres@sha256:f20491444ff7818267e652ced923991fdab24fc07e0eb2bacfba26ab72a45563',
  auth: 'docker.io/supabase/gotrue@sha256:3439d5affb9e96395d1348521f4c675eea7096d8d76d18d4e31fcc08df802116',
  rest: 'docker.io/postgrest/postgrest@sha256:dfa6464b877fa7b1b0be85740f6ce6985144b509a6edb5f09c5ee67e687e8c1f',
} as const;
const RESTORE_OWNER = 'org.healedutech.restore-owner';
const SERVICE_OWNER = 'org.healedutech.restore-service-owner';
const SOCKET = '/restore/socket';
const DATA = '/restore/data';
const AUTH_PORT = 19999;
const REST_PORT = 13000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

type RestoreReport = {
  format?: number; status?: string; source_writes?: boolean; image?: string; container?: string; volume?: string;
  strict_restore_passed?: boolean; resources_retained_for_service_checks?: boolean; cleanup_pending?: boolean;
  archive_data_comparison?: { passed?: boolean }; source_metadata_comparison?: { passed?: boolean };
  cleanup_ownership_label?: string;
};
type Container = {
  Id?: string; Image?: string; State?: { Running?: boolean };
  Config?: { Image?: string; Labels?: Record<string, string> };
  HostConfig?: { NetworkMode?: string; Binds?: unknown[]; PortBindings?: Record<string, unknown>; Privileged?: boolean; PidMode?: string; IpcMode?: string };
  NetworkSettings?: { Ports?: Record<string, unknown> };
  Mounts?: { Type?: string; Name?: string; Destination?: string }[];
};
type HttpResult = { status: number; body: unknown };
type Actor = { id: string; email: string; token: string };

export function validateServiceRestoreReport(report: RestoreReport) {
  if (report.format !== 1 || report.status !== 'database_verified_services_pending' || report.source_writes !== false ||
      report.strict_restore_passed !== true || report.resources_retained_for_service_checks !== true || report.cleanup_pending !== true ||
      report.archive_data_comparison?.passed !== true || report.source_metadata_comparison?.passed !== true || report.image !== SERVICE_IMAGES.database) {
    throw new Error('Require a successful retained strict restore with matching archive and source catalog evidence.');
  }
  const name = report.container ?? '';
  if (!/^evg-restore-[a-z0-9][a-z0-9-]{3,47}$/.test(name) || report.volume !== `${name}-data`) throw new Error('Unexpected disposable restore resource names.');
  const label = report.cleanup_ownership_label ?? '';
  const owner = label.slice(`${RESTORE_OWNER}=`.length);
  if (!label.startsWith(`${RESTORE_OWNER}=`) || !uuid.test(owner)) throw new Error('The retained restore has no valid ownership label.');
  return { name, volume: report.volume, owner };
}

export function assertOfflineDatabase(info: Container | undefined, target: ReturnType<typeof validateServiceRestoreReport>, imageId: string) {
  if (!info || !/^[a-f0-9]{64}$/.test(info.Id ?? '') || info.Image !== imageId || info.Config?.Image !== SERVICE_IMAGES.database ||
      info.Config.Labels?.[RESTORE_OWNER] !== target.owner || info.State?.Running !== true ||
      info.HostConfig?.NetworkMode !== 'none' || info.HostConfig.Privileged === true ||
      info.HostConfig.PidMode === 'host' || info.HostConfig.IpcMode === 'host' ||
      (info.HostConfig.Binds?.length ?? 0) !== 0 || Object.keys(info.HostConfig.PortBindings ?? {}).length !== 0 ||
      Object.keys(info.NetworkSettings?.Ports ?? {}).length !== 0 || info.Mounts?.length !== 1 ||
      info.Mounts[0].Type !== 'volume' || info.Mounts[0].Name !== target.volume || info.Mounts[0].Destination !== '/restore') {
    throw new Error('The retained database does not match the exact owned offline restore.');
  }
  return info.Id!;
}

/** Only the private, unreachable local Auth bootstrap gets a locally signed administrator token. */
export function localRestoreAdminJwt(secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!/^[a-f0-9]{64,128}$/.test(secret) || !Number.isSafeInteger(now)) throw new Error('Use a fresh random local signing secret.');
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ aud: 'authenticated', role: 'service_role', iss: `http://127.0.0.1:${AUTH_PORT}`, iat: now, exp: now + 1800 })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

/** Curl reads headers and JSON from stdin; no session or password appears in a process argument. */
export function restoredServiceCurlConfig(port: number, path: string, method = 'GET', token?: string, body?: Record<string, unknown>, timeout = 8) {
  const origin = `http://127.0.0.1:${port}`;
  const url = new URL(path, origin);
  if (![AUTH_PORT, REST_PORT].includes(port) || !path.startsWith('/') || path.startsWith('//') || url.origin !== origin || url.username || url.password || url.hash ||
      !['GET', 'POST', 'PATCH', 'DELETE'].includes(method) || ![2, 8].includes(timeout) ||
      (token !== undefined && (!/^[A-Za-z0-9._-]+$/.test(token) || token.length > 16384))) throw new Error('Only fixed loopback service requests are supported.');
  const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
  return ['silent', 'show-error', 'connect-timeout = 2', `max-time = ${timeout}`, 'noproxy = "*"',
    `request = ${quote(method)}`, `url = ${quote(url.href)}`, 'header = "Content-Type: application/json"',
    'header = "Prefer: return=representation"', ...(token ? [`header = ${quote(`Authorization: Bearer ${token}`)}`] : []),
    ...(body ? [`data-binary = ${quote(JSON.stringify(body))}`] : []), 'write-out = "\\n%{http_code}"', ''].join('\n');
}

const protectedRead = (path: string) => {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024 || (info.mode & 0o077) !== 0 || realpathSync(path) !== path ||
      (process.getuid && info.uid !== process.getuid())) throw new Error('The restore report must be a bounded, private, owned regular file without symlinks.');
  return readFileSync(path, 'utf8');
};

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('DOCKER_HOST=unix:///explicit/local/docker.sock node scripts/verify-restored-services.ts --restore-report /protected/retained/report.json --output /protected/NEW-directory [--execute]');
    console.log('Default only describes the plan. Execution requires a retained, fully verified restore and pre-pulled pinned images. No source connection, remote URL or key is accepted. Only this run’s service containers are removed; the database remains for its owner to remove.');
    return;
  }
  const options = new Map<string, string>();
  let execute = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--execute' && !execute) execute = true;
    else if (['--restore-report', '--output'].includes(flag) && !options.has(flag) && args[i + 1] && !args[i + 1].startsWith('--')) options.set(flag, args[++i]);
    else throw new Error('Unknown, duplicate or incomplete option; use --help.');
  }
  if (!options.has('--restore-report') || !options.has('--output')) throw new Error('Supply the retained restore report and a new protected output directory.');
  const input = resolve(options.get('--restore-report')!);
  const output = resolve(options.get('--output')!);
  const dockerHost = process.env.DOCKER_HOST;
  if (!dockerHost || !/^unix:\/\/\/[A-Za-z0-9_./-]+$/.test(dockerHost)) throw new Error('Set an explicit local Unix DOCKER_HOST; remote endpoints are refused.');
  if (!execute) {
    console.log(JSON.stringify({ mode: 'plan', restore_report: input, output, report_contents_read: false, source_writes: false, images: SERVICE_IMAGES,
      network: 'Existing owned database network=none; new services share only its network namespace', ports: [], service_mounts: [],
      steps: ['Validate retained success, exact images, ownership, isolation and new resource names', 'Capture copied-data counts and Auth schema baseline', 'Enable loopback-only SCRAM with fresh local role passwords, preserving provider preload settings', 'Run Auth serve without migrations and REST with fresh local JWT configuration', 'Create four disposable local Auth users; obtain real password-login JWTs', 'Exercise learner ownership, anonymous denial, staff boundaries and immediate librarian revocation', 'Verify Auth schema/migration baseline unchanged', 'Remove only this run’s labeled service containers'],
      limitations: ['Original users’ password login is not tested', 'Database fixtures and local role/password configuration are disposable; root must remove the retained database separately'] }, null, 2));
    return;
  }
  if (!statSync(dockerHost.slice('unix://'.length)).isSocket()) throw new Error('DOCKER_HOST must identify an existing local Unix socket.');
  const repository = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  const inside = (parent: string, child: string) => { const r = relative(parent, child); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
  if (realpathSync(dirname(output)) !== dirname(output) || inside(repository, output) || existsSync(output) || inside(dirname(input), output)) throw new Error('Choose a new output directory outside the repository and restore-report directory, without symlink parents.');
  const target = validateServiceRestoreReport(JSON.parse(protectedRead(input)) as RestoreReport);
  mkdirSync(output, { mode: 0o700 }); chmodSync(output, 0o700);
  const dockerConfig = join(output, 'docker-client'); mkdirSync(dockerConfig, { mode: 0o700 });
  const environment: NodeJS.ProcessEnv = { PATH: process.env.PATH, LANG: 'C.UTF-8', DOCKER_HOST: dockerHost, DOCKER_CONFIG: dockerConfig };
  const owner = randomUUID();
  const suffix = owner.replace(/-/g, '').slice(0, 10);
  const names = { auth: `evg-restore-services-${suffix}-auth`, rest: `evg-restore-services-${suffix}-rest` };
  const checks: { check: string; passed: boolean; http_status?: number }[] = [];
  const report: Record<string, unknown> = { format: 1, started_at: new Date().toISOString(), status: 'started', source_writes: false,
    restored_database: target.name, images: SERVICE_IMAGES, service_containers: names, cleanup_ownership_label: `${SERVICE_OWNER}=${owner}`,
    network: 'container namespace of owned network=none database', published_ports: [], service_mounts: [], fresh_local_credentials_only: true,
    local_configuration_adaptations: ['Fresh LOGIN/SCRAM credentials for authenticator and supabase_auth_admin', 'Unix trust restricted to supabase_admin; TCP SCRAM restricted to loopback and those two roles', 'Loopback PostgreSQL listener with the restore tool’s provider preloads and disabled cron launches', 'Auth serve without migrations; REST in-database configuration overrides disabled'],
    checks, database_cleanup_owned_by_caller: true, limitations: ['Original user passwords are not tested; local synthetic users use fresh passwords.', 'Source SMTP, OAuth, signing keys and platform infrastructure are not restored by this rehearsal.'] };
  const reportPath = join(output, 'report.json');
  const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  let commandNumber = 0;
  let cancellation: NodeJS.Signals | undefined;
  let cleaningUp = false;
  const onInterrupt = () => { cancellation = 'SIGINT'; };
  const onTerminate = () => { cancellation = 'SIGTERM'; };
  process.on('SIGINT', onInterrupt); process.on('SIGTERM', onTerminate);
  const invoke = (parameters: string[], data?: string, allowFailure = false, timeout = 30000) => {
    if (cancellation && !cleaningUp) throw new Error('Rehearsal cancelled.');
    const result = spawnSync('docker', parameters, { env: environment, input: data, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      if (allowFailure) return undefined;
      writeFileSync(join(output, `${String(++commandNumber).padStart(3, '0')}-failure.log`), `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error ? String(result.error) : ''}`, { mode: 0o600 });
      throw new Error('A local service command failed; diagnostics are only in the protected output.');
    }
    return parameters[0] === 'logs' ? `${result.stdout}\n${result.stderr}` : result.stdout;
  };
  const inspect = (kind: 'container' | 'image' | 'volume', name: string): Container | Record<string, unknown> | undefined => {
    if (kind === 'container') {
      const inventory = invoke(['container', 'ls', '--all', '--format', '{{.Names}}']) ?? '';
      if (!inventory.split(/\r?\n/).includes(name)) return undefined;
    }
    return JSON.parse(invoke([kind, 'inspect', name]) ?? '[]')[0];
  };
  let databaseId: string | undefined;
  const dbExec = (parameters: string[], data?: string, allowFailure = false) => invoke(['exec', '-i', '--user', 'postgres', databaseId!, ...parameters], data, allowFailure);
  const sql = (text: string) => dbExec(['psql', '-X', '--no-password', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--single-transaction', '-h', SOCKET, '-U', 'supabase_admin', '-d', 'postgres'], text) ?? '';
  const checkpoint = async () => { await new Promise<void>(done => setImmediate(done)); if (cancellation) throw new Error('Rehearsal cancelled.'); };
  const check = (name: string, okay: boolean, status?: number) => {
    checks.push({ check: name, passed: okay, ...(status === undefined ? {} : { http_status: status }) }); save();
    if (!okay) throw new Error(`Failed check: ${name}`);
  };
  const http = (port: number, path: string, method = 'GET', token?: string, body?: Record<string, unknown>, readiness = false): HttpResult | undefined => {
    const raw = dbExec(['curl', '--config', '-'], restoredServiceCurlConfig(port, path, method, token, body, readiness ? 2 : 8), readiness);
    if (raw === undefined) return undefined;
    const match = /\n(\d{3})$/.exec(raw);
    if (!match) throw new Error('Local HTTP status framing was invalid.');
    const text = raw.slice(0, match.index);
    let value: unknown; try { value = text ? JSON.parse(text) : null; } catch { value = null; }
    return { status: Number(match[1]), body: value };
  };
  const requiredHttp = (...args: Parameters<typeof http>) => { const value = http(...args); if (!value) throw new Error('Local HTTP transport failed.'); return value; };
  const authSchemaHash = () => createHash('sha256').update((dbExec(['pg_dump', '--no-password', '--schema-only', '--schema=auth', '-h', SOCKET, '-U', 'supabase_admin', '-d', 'postgres']) ?? '')
    .replace(/^\\(?:un)?restrict [A-Za-z0-9]+\r?\n/gm, '')).digest('hex');
  const migrationHash = () => sql("SELECT md5(coalesce(string_agg(version::text, ',' ORDER BY version::text),'')) FROM auth.schema_migrations;").trim();
  const envFiles: string[] = [];
  const createdIds: Partial<Record<'auth' | 'rest', string>> = {};
  const imageIds: Partial<Record<'auth' | 'rest', string>> = {};
  save();
  try {
    invoke(['version', '--format', '{{.Server.Version}}']);
    const databaseImage = inspect('image', SERVICE_IMAGES.database) as { Id?: string; Os?: string; Architecture?: string };
    if (databaseImage.Os !== 'linux' || databaseImage.Architecture !== 'arm64' || !databaseImage.Id) throw new Error('The pinned provider image must already be available for linux/arm64.');
    databaseId = assertOfflineDatabase(inspect('container', target.name) as Container, target, databaseImage.Id);
    const volume = inspect('volume', target.volume) as { Labels?: Record<string, string> };
    if (volume.Labels?.[RESTORE_OWNER] !== target.owner) throw new Error('The restored volume ownership differs.');
    for (const service of ['auth', 'rest'] as const) {
      if (inspect('container', names[service])) throw new Error('A requested service name already exists; nothing is reused.');
      const image = inspect('image', SERVICE_IMAGES[service]) as { Id?: string; Os?: string; Architecture?: string; Config?: { Volumes?: Record<string, unknown> } };
      if (!image.Id || image.Os !== 'linux' || image.Architecture !== 'arm64' || Object.keys(image.Config?.Volumes ?? {}).length) throw new Error('Pinned service images must already be present and declare no implicit volumes.');
      imageIds[service] = image.Id;
    }
    dbExec(['curl', '--version']);
    const baseline = JSON.parse(sql("SELECT json_build_object('auth_users',(SELECT count(*) FROM auth.users),'reading_records',(SELECT count(*) FROM public.reading_records),'staff_members',(SELECT count(*) FROM public.staff_members),'books',(SELECT count(*) FROM public.books));"));
    const schemaBefore = authSchemaHash(); const migrationsBefore = migrationHash();
    report.baseline_before_local_fixtures = { ...baseline, auth_schema_sha256: schemaBefore, auth_migration_rows_md5: migrationsBefore }; save();
    await checkpoint();
    const authPassword = randomBytes(32).toString('hex');
    const restPassword = randomBytes(32).toString('hex');
    const jwtSecret = randomBytes(32).toString('hex');
    sql(`SET password_encryption='scram-sha-256'; ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD '${authPassword}'; ALTER ROLE authenticator WITH LOGIN PASSWORD '${restPassword}';`);
    dbExec(['/bin/sh', '-eu', '-c', 'umask 077; cat > /restore/data/pg_hba.conf'], 'local all supabase_admin trust\nlocal all all reject\nhost postgres supabase_auth_admin 127.0.0.1/32 scram-sha-256\nhost postgres authenticator 127.0.0.1/32 scram-sha-256\nhost all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n');
    const postgresOptions = `-c listen_addresses=127.0.0.1 -c unix_socket_directories=${SOCKET} -c shared_preload_libraries=pg_stat_statements,pg_cron,pg_net,pgsodium,supabase_vault,supautils -c pgsodium.getkey_script=/restore/config/getkey.sh -c vault.getkey_script=/restore/config/getkey.sh -c cron.launch_active_jobs=off -c wal_level=logical -c max_wal_senders=2 -c max_replication_slots=2 -c shared_buffers=32MB -c max_connections=20`;
    dbExec(['pg_ctl', '-D', DATA, '-l', '/restore/postgres.log', '-m', 'fast', '-o', postgresOptions, '-w', 'restart']);
    check('Database is loopback-only with queued cron jobs disabled', sql("SELECT current_setting('listen_addresses')='127.0.0.1' AND current_setting('cron.launch_active_jobs')='off';").trim() === 't');
    const authEnv = {
      GOTRUE_API_HOST: '0.0.0.0', GOTRUE_API_PORT: String(AUTH_PORT), API_EXTERNAL_URL: `http://127.0.0.1:${AUTH_PORT}`, GOTRUE_SITE_URL: `http://127.0.0.1:${AUTH_PORT}`,
      GOTRUE_DB_DRIVER: 'postgres', GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${authPassword}@127.0.0.1:5432/postgres?sslmode=disable`, GOTRUE_DB_MAX_POOL_SIZE: '4',
      GOTRUE_JWT_SECRET: jwtSecret, GOTRUE_JWT_AUD: 'authenticated', GOTRUE_JWT_ADMIN_ROLES: 'service_role', GOTRUE_JWT_ISSUER: `http://127.0.0.1:${AUTH_PORT}`, GOTRUE_JWT_EXP: '1800',
      GOTRUE_DISABLE_SIGNUP: 'true', GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_EXTERNAL_EMAIL_MAGIC_LINK_ENABLED: 'false', GOTRUE_EXTERNAL_PHONE_ENABLED: 'false', GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED: 'false',
      GOTRUE_SMTP_HOST: '', GOTRUE_RATE_LIMIT_EMAIL_SENT: '0', GOTRUE_MAILER_AUTOCONFIRM: 'false', GOTRUE_HOOK_SEND_EMAIL_ENABLED: 'false', GOTRUE_HOOK_SEND_SMS_ENABLED: 'false',
      GOTRUE_MAILER_EMAIL_BACKGROUND_SENDING: 'false', GOTRUE_MAILER_TEMPLATE_RELOADING_ENABLED: 'false', GOTRUE_MAILER_EMAIL_VALIDATION_EXTENDED: 'false', GOTRUE_PASSWORD_HIBP_ENABLED: 'false',
      GOTRUE_DB_CLEANUP_ENABLED: 'false', GOTRUE_DB_ADVISOR_ENABLED: 'false', GOTRUE_INDEX_WORKER_ENSURE_USER_SEARCH_INDEXES_EXIST: 'false', GOTRUE_INDEX_WORKER_MAX_USERS_THRESHOLD: '0',
      GOTRUE_CUSTOM_OAUTH_ENABLED: 'false', GOTRUE_OAUTH_SERVER_ENABLED: 'false',
    };
    const restEnv = { PGRST_DB_URI: `postgres://authenticator:${restPassword}@127.0.0.1:5432/postgres?sslmode=disable`, PGRST_DB_SCHEMAS: 'public', PGRST_DB_EXTRA_SEARCH_PATH: 'public',
      PGRST_DB_ANON_ROLE: 'anon', PGRST_DB_CONFIG: 'false', PGRST_JWT_SECRET: jwtSecret, PGRST_JWT_AUD: 'authenticated', PGRST_DB_POOL: '4',
      PGRST_SERVER_HOST: '0.0.0.0', PGRST_SERVER_PORT: String(REST_PORT), PGRST_ADMIN_SERVER_HOST: 'localhost', PGRST_ADMIN_SERVER_PORT: '13001', PGRST_LOG_LEVEL: 'error' };
    for (const service of ['auth', 'rest'] as const) {
      await checkpoint();
      const path = join(output, `${service}.env`); envFiles.push(path);
      writeFileSync(path, Object.entries(service === 'auth' ? authEnv : restEnv).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
      invoke(['create', '--pull=never', '--name', names[service], '--label', `${SERVICE_OWNER}=${owner}`, '--network', `container:${databaseId}`, '--read-only', '--no-healthcheck',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '64', '--memory', '256m', '--cpus', '0.5', '--env-file', path,
        ...(service === 'auth' ? ['--entrypoint', '/usr/local/bin/auth'] : []), SERVICE_IMAGES[service], ...(service === 'auth' ? ['serve'] : [])]);
      unlinkSync(path);
      const info = inspect('container', names[service]) as Container;
      if (!/^[a-f0-9]{64}$/.test(info.Id ?? '') || info.Image !== imageIds[service] || info.Config?.Labels?.[SERVICE_OWNER] !== owner || info.Config.Image !== SERVICE_IMAGES[service] ||
          info.HostConfig?.NetworkMode !== `container:${databaseId}` || (info.HostConfig.Binds?.length ?? 0) || Object.keys(info.HostConfig.PortBindings ?? {}).length ||
          (info.Mounts?.length ?? 0)) throw new Error('New service ownership or isolation does not match the requested recipe.');
      createdIds[service] = info.Id;
      invoke(['start', info.Id!]);
    }
    const until = Date.now() + 30000;
    let ready = false;
    while (Date.now() < until) {
      await checkpoint();
      const auth = http(AUTH_PORT, '/health', 'GET', undefined, undefined, true);
      const rest = invoke(['exec', createdIds.rest!, 'postgrest', '--ready'], undefined, true, 5000);
      if (auth?.status === 200 && rest !== undefined) { ready = true; break; }
      await new Promise(done => setTimeout(done, 500));
    }
    check('Exact Auth and REST services are ready without migration overlays', ready);
    const bootstrap = localRestoreAdminJwt(jwtSecret);
    const actors: Actor[] = [];
    for (const label of ['learner-a', 'learner-b', 'librarian', 'administrator']) {
      await checkpoint();
      const email = `restore-${suffix}-${label}@example.invalid`; const password = randomBytes(24).toString('hex');
      const created = requiredHttp(AUTH_PORT, '/admin/users', 'POST', bootstrap, { email, password, email_confirm: true, role: 'authenticated', user_metadata: { display_name: `Offline ${label}` } });
      const id = (created.body as { id?: string } | null)?.id;
      check(`Create local ${label} through Auth administration`, created.status === 200 && typeof id === 'string' && uuid.test(id), created.status);
      const login = requiredHttp(AUTH_PORT, '/token?grant_type=password', 'POST', undefined, { email, password });
      const session = login.body as { access_token?: string; user?: { id?: string } } | null;
      check(`Real password login for local ${label}`, login.status === 200 && session?.user?.id === id && typeof session?.access_token === 'string', login.status);
      const token = session!.access_token!;
      const identity = requiredHttp(AUTH_PORT, '/user', 'GET', token);
      check(`Server-confirmed JWT identity for local ${label}`, identity.status === 200 && (identity.body as { id?: string } | null)?.id === id, identity.status);
      actors.push({ id: id!, email, token });
    }
    const [a, b, librarian, admin] = actors;
    const catalogue = requiredHttp(REST_PORT, '/books?select=id&order=id&limit=2');
    const books = catalogue.body as { id?: string }[];
    check('Anonymous public catalogue remains available', catalogue.status === 200 && Array.isArray(books) && books.length === 2 && books.every(book => typeof book.id === 'string' && uuid.test(book.id)), catalogue.status);
    const [bookA, bookB] = books.map(book => book.id!);
    const markerA = `Offline restore ${suffix} learner A private note`;
    const markerB = `Offline restore ${suffix} learner B private note`;
    const path = (actor: Actor, book: string) => `/reading_records?user_id=eq.${actor.id}&book_id=eq.${book}`;
    const insert = (actor: Actor, book: string, reflection: string) => requiredHttp(REST_PORT, '/reading_records', 'POST', actor.token, { user_id: actor.id, book_id: book, status: 'finished', reflection });
    for (const [actor, book, marker] of [[a, bookA, markerA], [b, bookB, markerB]] as const) {
      const added = insert(actor, book, marker);
      check('Learner can create own private reading', added.status === 201 && Array.isArray(added.body) && added.body.length === 1, added.status);
      const saved = requiredHttp(REST_PORT, path(actor, book), 'GET', actor.token);
      check('New request reads persisted own private reflection', saved.status === 200 && Array.isArray(saved.body) && saved.body.length === 1 && saved.body[0].reflection === marker, saved.status);
    }
    const updatedMarker = `${markerA} updated`;
    const update = requiredHttp(REST_PORT, path(a, bookA), 'PATCH', a.token, { reflection: updatedMarker });
    check('Learner can update own reading', update.status === 200 && Array.isArray(update.body) && update.body.length === 1, update.status);
    const removed = requiredHttp(REST_PORT, path(b, bookB), 'DELETE', b.token);
    check('Learner can delete own reading', removed.status === 200 && Array.isArray(removed.body) && removed.body.length === 1, removed.status);
    const absent = requiredHttp(REST_PORT, path(b, bookB), 'GET', b.token);
    check('Own deletion persists on a separate request', absent.status === 200 && Array.isArray(absent.body) && absent.body.length === 0, absent.status);
    check('Recreate disposable learner B record', insert(b, bookB, markerB).status === 201);
    for (const [attacker, victim, book] of [[b, a, bookA], [a, b, bookB]] as const) {
      for (const method of ['GET', 'PATCH', 'DELETE']) {
        const attempt = requiredHttp(REST_PORT, path(victim, book), method, attacker.token, method === 'PATCH' ? { reflection: 'forbidden overwrite' } : undefined);
        check(`Other learner ${method} exposes or changes no private rows`, attempt.status === 200 && Array.isArray(attempt.body) && attempt.body.length === 0, attempt.status);
      }
    }
    const forged = requiredHttp(REST_PORT, '/reading_records', 'POST', b.token, { user_id: a.id, book_id: bookB, status: 'finished', reflection: 'forbidden forged owner' });
    check('Forged owner insertion is rejected by RLS', forged.status === 403 && (forged.body as { code?: string } | null)?.code === '42501', forged.status);
    const reassign = requiredHttp(REST_PORT, path(b, bookB), 'PATCH', b.token, { user_id: a.id });
    check('Owner reassignment is rejected by RLS', reassign.status === 403 && (reassign.body as { code?: string } | null)?.code === '42501', reassign.status);
    for (const [actor, book, marker] of [[a, bookA, updatedMarker], [b, bookB, markerB]] as const) {
      const own = requiredHttp(REST_PORT, path(actor, book), 'GET', actor.token);
      check('Owner data remains intact after cross-account attacks', own.status === 200 && Array.isArray(own.body) && own.body.length === 1 && own.body[0].reflection === marker, own.status);
    }
    const rpc = (name: string, actor: Actor | undefined, body: Record<string, unknown> = {}) => requiredHttp(REST_PORT, `/rpc/${name}`, 'POST', actor?.token, body);
    const anonPrivate = requiredHttp(REST_PORT, path(a, bookA));
    check('Anonymous private reading is denied', [401, 403].includes(anonPrivate.status), anonPrivate.status);
    const anonStaff = rpc('staff_get_student', undefined, { p_user_id: a.id });
    check('Anonymous staff access is denied', [401, 403].includes(anonStaff.status), anonStaff.status);
    for (const learner of [a, b]) {
      const staff = rpc('staff_get_student', learner, { p_user_id: a.id });
      check('Learner staff RPC is denied', staff.status === 403, staff.status);
      const administration = rpc('list_staff_members', learner);
      check('Learner administrator RPC is denied', administration.status === 403, administration.status);
      const escalation = rpc('set_staff_access', learner, { p_email: learner.email, p_role: 'administrator' });
      check('Learner cannot grant administrative access to its local fixture account', escalation.status === 403, escalation.status);
    }
    // Only the newly created synthetic administrator gets an out-of-band local bootstrap.
    sql(`INSERT INTO public.staff_members(user_id,role) VALUES('${admin.id}','administrator');`);
    const grant = rpc('set_staff_access', admin, { p_email: librarian.email, p_role: 'librarian' });
    check('Administrator grants new local librarian through the real RPC', grant.status === 200 && Array.isArray(grant.body) && grant.body[0]?.user_id === librarian.id && grant.body[0]?.role === 'librarian', grant.status);
    for (const staff of [librarian, admin]) {
      const student = rpc('staff_get_student', staff, { p_user_id: a.id });
      check('Authorized staff can inspect the local fixture student', student.status === 200 && (student.body as { user_id?: string } | null)?.user_id === a.id, student.status);
      const reading = rpc('staff_list_student_reading', staff, { p_user_id: a.id, p_page: 1, p_page_size: 25, p_status: 'all' });
      const items = (reading.body as { items?: Record<string, unknown>[] } | null)?.items;
      check('Staff reading oversight excludes private reflections', reading.status === 200 && Array.isArray(items) && items.length === 1 && items[0].book_id === bookA &&
        !Object.keys(items[0]).includes('reflection') && !JSON.stringify(reading.body).includes(updatedMarker), reading.status);
      const direct = requiredHttp(REST_PORT, path(a, bookA), 'GET', staff.token);
      check('Staff JWT cannot directly read a learner private reflection', direct.status === 200 && Array.isArray(direct.body) && direct.body.length === 0, direct.status);
    }
    const librarianAdmin = rpc('list_staff_members', librarian);
    check('Librarian administrator boundary remains denied', librarianAdmin.status === 403, librarianAdmin.status);
    const librarianGrant = rpc('set_staff_access', librarian, { p_email: a.email, p_role: 'librarian' });
    check('Librarian cannot grant staff access to another local fixture account', librarianGrant.status === 403, librarianGrant.status);
    const revoke = rpc('revoke_staff_access', admin, { p_email: librarian.email });
    check('Administrator revokes the new local librarian through the real RPC', revoke.status === 200 && Array.isArray(revoke.body) && revoke.body[0]?.user_id === librarian.id, revoke.status);
    const revoked = rpc('staff_get_student', librarian, { p_user_id: a.id });
    check('Revoked librarian is immediately denied with the unchanged JWT', revoked.status === 403, revoked.status);
    const parts = a.token.split('.');
    parts[2] = (parts[2].startsWith('a') ? 'b' : 'a') + parts[2].slice(1);
    const tampered = parts.join('.');
    const invalid = requiredHttp(REST_PORT, path(a, bookA), 'GET', tampered);
    check('REST rejects an invalid JWT signature', invalid.status === 401, invalid.status);
    check('Auth schema and migration history remain unchanged', authSchemaHash() === schemaBefore && migrationHash() === migrationsBefore);
    report.fixture_users_created = actors.length;
    report.original_auth_users_passwords_tested = false;
    report.status = 'offline_auth_rest_services_verified';
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : 'Offline service rehearsal failed.';
    for (const service of ['auth', 'rest'] as const) if (!cancellation && createdIds[service]) {
      const logs = invoke(['logs', '--tail', '250', createdIds[service]!], undefined, true);
      if (logs) writeFileSync(join(output, `${service}-failure.log`), logs, { mode: 0o600 });
    }
  } finally {
    cleaningUp = true;
    for (const path of envFiles) {
      try { if (existsSync(path)) unlinkSync(path); }
      catch { report.status = 'failed'; report.local_env_cleanup_error = 'Cannot confirm removal of a protected local service environment file.'; }
    }
    const cleanupServices = () => {
      for (const service of ['auth', 'rest'] as const) {
        const info = inspect('container', names[service]) as Container | undefined;
        if (!info) { report[`${service}_container_removed`] = true; continue; }
        if (info.Config?.Labels?.[SERVICE_OWNER] !== owner || !/^[a-f0-9]{64}$/.test(info.Id ?? '') || (createdIds[service] && info.Id !== createdIds[service])) {
          throw new Error('Service ownership changed; no unowned resource is removed.');
        }
        invoke(['rm', '--force', info.Id!]);
        report[`${service}_container_removed`] = !inspect('container', names[service]);
        if (report[`${service}_container_removed`] !== true) throw new Error('Owned service cleanup was not confirmed.');
      }
    };
    try { cleanupServices(); } catch {
      report.status = 'failed'; report.cleanup_error = 'Cannot confirm owned service cleanup. Database cleanup remains the caller’s responsibility.';
    }
    report.finished_at = new Date().toISOString();
    if (cancellation) report.cancelled_by = cancellation;
    save();
    process.removeListener('SIGINT', onInterrupt); process.removeListener('SIGTERM', onTerminate);
  }
  console.log(JSON.stringify({ status: report.status, passed_checks: checks.filter(c => c.passed).length, failed_checks: checks.filter(c => !c.passed).length,
    source_writes: false, auth_container_removed: report.auth_container_removed === true, rest_container_removed: report.rest_container_removed === true,
    database_cleanup_owned_by_caller: true, output }, null, 2));
  if (report.status !== 'offline_auth_rest_services_verified') process.exitCode = cancellation === 'SIGINT' ? 130 : cancellation === 'SIGTERM' ? 143 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => { console.error('Offline service rehearsal refused or failed. Review explicit options and the protected report if created. No hosted database or service is contacted.'); process.exitCode = 1; });
}
