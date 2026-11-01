/** Protected database export and isolated restore drill. Neither mode writes to a hosted database. */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { backupConnectionEnvironment } from './backup-connection.ts';
import { verifiedSupabaseCA } from './backup-ca.ts';

const args = process.argv.slice(2);
const get = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const execute = args.includes('--execute');
const output = get('--output');
const archive = get('--restore-drill');
if (args.includes('--help') || !output) {
  console.log('Read-only source export: node scripts/backup-database.ts --database-url-env EVG_BACKUP_DATABASE_URL --output /protected/new-directory [--use-supabase-ca] [--execute]');
  console.log('New isolated local restore: node scripts/backup-database.ts --restore-drill /protected/backup/database.dump --output /protected/new-drill-directory [--execute]');
  console.log('The default is a plan. Never put credentials in arguments. Exports contain sensitive data; protect and encrypt the backup location.');
  process.exit(args.includes('--help') ? 0 : 2);
}
const destination = resolve(output);
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('PG')));
function command(tool: string, parameters: string[], environment: NodeJS.ProcessEnv = cleanEnv) {
  const result = spawnSync(tool, parameters, { env: environment, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    if (existsSync(destination)) writeFileSync(join(destination, `${tool}-failure.log`), result.stderr || String(result.error), { mode: 0o600 });
    throw new Error(`${tool} failed. Check connectivity, permissions, disk space and tool versions; credentials are intentionally omitted from this report. Protected diagnostic details are in the output directory.`);
  }
  return result.stdout;
}
function prepareDestination() {
  if (existsSync(destination)) throw new Error('Choose a new output directory; existing backups are never overwritten.');
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  chmodSync(destination, 0o700);
}
function manifest(data: Record<string, unknown>) {
  writeFileSync(join(destination, 'manifest.json'), JSON.stringify({ created_at: new Date().toISOString(), ...data }, null, 2), { mode: 0o600 });
}
const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

if (!archive) {
  const variable = get('--database-url-env') ?? 'EVG_BACKUP_DATABASE_URL';
  if (!/^[A-Z][A-Z0-9_]*$/.test(variable)) throw new Error('Use a named environment variable for the database connection.');
  if (!execute) {
    console.log(JSON.stringify({ mode: 'plan', source_environment_variable: variable, output: destination, trust: args.includes('--use-supabase-ca') ? 'pinned official Supabase CA with verify-full' : 'system or explicit connection CA with verify-full', steps: ['Export database schema/data/ACLs using pg_dump custom format', 'Export role definitions without passwords', 'Record checksums and tool version'], source_writes: false, excluded: ['Storage file bytes', 'Auth provider/SMTP settings', 'JWT signing keys', 'Platform configuration'], next: 'Set the connection variable through your secret manager and repeat with --execute.' }, null, 2));
    process.exit(0);
  }
  const connection = process.env[variable];
  if (!connection) throw new Error(`Required connection variable ${variable} is not set.`);
  // Passwords are passed only through the child environment, with strict remote TLS.
  const environment = backupConnectionEnvironment(connection, cleanEnv);
  if (args.includes('--use-supabase-ca')) environment.PGSSLROOTCERT = verifiedSupabaseCA().path;
  const version = command('pg_dump', ['--version']).trim();
  prepareDestination();
  const dumpPath = join(destination, 'database.dump');
  const rolesPath = join(destination, 'roles.sql');
  try {
    command('pg_dump', ['--format=custom', '--file', dumpPath], environment);
    chmodSync(dumpPath, 0o600);
    const roles = command('pg_dumpall', ['--roles-only', '--no-role-passwords'], environment);
    writeFileSync(rolesPath, roles, { mode: 0o600 });
    command('pg_restore', ['--list', dumpPath]);
    manifest({ mode: 'backup', status: 'exported_not_yet_restore_verified', source_writes: false, pg_dump: version, files: { 'database.dump': hash(dumpPath), 'roles.sql': hash(rolesPath) }, excluded: ['Storage file bytes', 'Auth provider/SMTP settings', 'JWT signing keys', 'Platform configuration'], restore_drill: 'required in a compatible isolated environment' });
    console.log(JSON.stringify({ status: 'exported', output: destination, source_writes: false, restore_verified: false }, null, 2));
  } catch (error) {
    manifest({ mode: 'backup', status: 'incomplete', source_writes: false });
    throw error;
  }
} else {
  const dumpPath = resolve(archive);
  const backupDirectory = dirname(dumpPath);
  const rolesPath = join(backupDirectory, 'roles.sql');
  const backupManifestPath = join(backupDirectory, 'manifest.json');
  if (!existsSync(dumpPath) || !existsSync(rolesPath) || !existsSync(backupManifestPath)) throw new Error('The archive, roles.sql and backup manifest must be present together.');
  const backup = JSON.parse(readFileSync(backupManifestPath, 'utf8')) as { files?: Record<string, string> };
  if (backup.files?.['database.dump'] !== hash(dumpPath) || backup.files?.['roles.sql'] !== hash(rolesPath)) throw new Error('Backup checksum mismatch; do not restore this archive.');
  if (!execute) {
    console.log(JSON.stringify({ mode: 'plan', source_writes: false, archive: dumpPath, steps: ['Create a brand-new local PostgreSQL cluster with no TCP listener', 'Restore roles without passwords and restore schema/data/ACLs', 'Verify restore exits successfully and inspect app tables/RLS', 'Stop and remove the disposable cluster; retain a protected report'], output: destination, limitation: 'Requires a compatible PostgreSQL major version and all source extensions. A provider-compatible staging restore is still required for full Supabase/Auth validation.' }, null, 2));
    process.exit(0);
  }
  prepareDestination();
  const cluster = mkdtempSync(join(tmpdir(), 'evg-restore-drill-'));
  const data = join(cluster, 'data');
  const socket = join(cluster, 'socket');
  mkdirSync(socket, { mode: 0o700 });
  const localRole = `evg_drill_${Date.now()}`;
  let started = false;
  let restored = false;
  const report: Record<string, unknown> = { mode: 'restore_drill', source_writes: false, tcp_listener: false, status: 'started' };
  try {
    command('initdb', ['-D', data, '--username', localRole, '--auth=trust', '--encoding=UTF8', '--no-locale']);
    const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
    command('pg_ctl', ['-D', data, '-l', join(destination, 'postgres.log'), '-o', `-k ${quote(socket)} -p 6544 -c listen_addresses=''`, '-w', 'start']);
    started = true;
    const databaseArgs = ['-h', socket, '-p', '6544', '-U', localRole, '-d', 'postgres'];
    command('psql', [...databaseArgs, '-X', '-v', 'ON_ERROR_STOP=1', '-f', rolesPath]);
    command('pg_restore', [...databaseArgs, '--exit-on-error', dumpPath]);
    const inspected = command('psql', [...databaseArgs, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', "select json_build_object('public_tables', (select count(*) from pg_tables where schemaname='public'), 'rls_tables', (select count(*) from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relrowsecurity), 'books_present', to_regclass('public.books') is not null, 'auth_users_present', to_regclass('auth.users') is not null, 'book_count', (select count(*) from public.books), 'auth_user_count', (select count(*) from auth.users), 'books_anon_select', has_table_privilege('anon', 'public.books', 'SELECT'));"]);
    report.inspection = JSON.parse(inspected);
    report.status = 'restored';
    restored = true;
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : 'Restore failed';
  } finally {
    // No restored server is exposed on a network, and it is stopped even when restore fails.
    const status = spawnSync('pg_ctl', ['-D', data, 'status'], { env: cleanEnv, encoding: 'utf8' });
    if (started || status.status === 0) {
      const stopped = spawnSync('pg_ctl', ['-D', data, '-w', 'stop'], { env: cleanEnv, encoding: 'utf8', timeout: 30000 });
      if (stopped.status !== 0) { report.cleanup_error = 'Could not stop the disposable database; its directory was preserved.'; }
    }
    const finalStatus = spawnSync('pg_ctl', ['-D', data, 'status'], { env: cleanEnv, encoding: 'utf8' });
    if (finalStatus.status !== 0) { rmSync(cluster, { recursive: true, force: true }); report.cluster_removed = true; }
    else { report.cluster_removed = false; report.cluster_path = cluster; }
    manifest({ ...report, source_checksums: backup.files, limitations: ['Restoration requires separate sign-in/provider-setting checks', 'Storage files and platform settings are not in a database archive'] });
  }
  console.log(JSON.stringify({ status: report.status, source_writes: false, cluster_removed: report.cluster_removed, output: destination }, null, 2));
  if (!restored || report.cleanup_error || report.cluster_removed !== true) process.exitCode = 1;
}
