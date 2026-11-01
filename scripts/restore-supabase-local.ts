/**
 * Strict recovery of an existing export in a new, offline provider-compatible container.
 * This tool never connects to a source database. Plan mode does not read backup contents.
 * Root must review the protected report and complete Auth/API checks separately.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RESTORE_IMAGE = 'docker.io/supabase/postgres@sha256:f20491444ff7818267e652ced923991fdab24fc07e0eb2bacfba26ab72a45563';
const OWNER_LABEL = 'org.healedutech.restore-owner';
const DATA_PATH = '/restore/data';
const SOCKET_PATH = '/restore/socket';
const MAX_INPUT_BYTES = 256 * 1024 * 1024;

/** Shared normalized catalog objects. Detail-query results belong in private files. */
const CATALOG_SQL_CTES = `
SET search_path = pg_catalog;
SET timezone = 'UTC';
WITH scopes AS (
  SELECT oid, nspname, pg_get_userbyid(nspowner) AS owner FROM pg_namespace
  WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
), relations AS (
  SELECT n.nspname AS schema, c.relname AS name, c.relkind, c.relpersistence,
    pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity, c.relforcerowsecurity,
    c.relreplident, c.reloptions IS NULL AS reloptions_is_null,
    ARRAY(SELECT x FROM unnest(c.reloptions) x ORDER BY x COLLATE "C") AS reloptions,
    CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid, false) END AS view_definition
  FROM pg_class c JOIN scopes n ON n.oid=c.relnamespace
), columns AS (
  SELECT n.nspname AS schema, c.relname AS relation,
    row_number() OVER (PARTITION BY c.oid ORDER BY a.attnum) AS logical_ordinal, a.attname,
    format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull, a.attidentity,
    a.attgenerated, a.attstorage, a.attcompression, a.attstattarget,
    pg_get_expr(d.adbin,d.adrelid) AS default_expression,
    cn.nspname AS collation_schema, co.collname AS collation
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
  JOIN scopes n ON n.oid=c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
  LEFT JOIN pg_collation co ON co.oid=a.attcollation
  LEFT JOIN pg_namespace cn ON cn.oid=co.collnamespace
  WHERE a.attnum>0 AND NOT a.attisdropped
), constraints_catalog AS (
  SELECT n.nspname AS schema, c.conname AS name, t.relname AS relation,
    c.contype, c.condeferrable, c.condeferred, c.convalidated,
    pg_get_constraintdef(c.oid,false) AS definition
  FROM pg_constraint c JOIN scopes n ON n.oid=c.connamespace
  LEFT JOIN pg_class t ON t.oid=c.conrelid
), policies AS (
  SELECT schemaname,tablename,policyname,permissive,
    ARRAY(SELECT x::text FROM unnest(roles) x ORDER BY x::text COLLATE "C") AS roles,cmd,qual,with_check
  FROM pg_policies WHERE schemaname IN (SELECT nspname FROM scopes)
), routines AS (
  SELECT n.nspname AS schema, p.proname AS name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_userbyid(p.proowner) AS owner, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p JOIN scopes n ON n.oid=p.pronamespace WHERE p.prokind <> 'a'
), triggers_catalog AS (
  SELECT n.nspname AS schema,c.relname AS relation,t.tgname AS name,t.tgenabled,
    pg_get_triggerdef(t.oid,false) AS definition
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN scopes n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal
), indexes_catalog AS (
  SELECT n.nspname AS schema,c.relname AS relation,ic.relname AS name,
    i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS definition
  FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
  JOIN pg_class ic ON ic.oid=i.indexrelid JOIN scopes n ON n.oid=c.relnamespace
), types_catalog AS (
  SELECT n.nspname AS schema,t.typname AS name,t.typtype,t.typcategory,
    pg_get_userbyid(t.typowner) AS owner,t.typnotnull,t.typdefault,
    ARRAY(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid=t.oid ORDER BY e.enumsortorder) AS enum_labels
  FROM pg_type t JOIN scopes n ON n.oid=t.typnamespace
), acls AS (
  SELECT 'schema' AS kind,n.nspname AS object,
    ARRAY(SELECT x::text FROM unnest(p.nspacl) x ORDER BY x::text COLLATE "C") AS acl,p.nspacl IS NULL AS acl_is_null
  FROM pg_namespace p JOIN scopes n ON n.oid=p.oid
  UNION ALL
  SELECT 'relation',format('%I.%I',n.nspname,c.relname),
    ARRAY(SELECT x::text FROM unnest(c.relacl) x ORDER BY x::text COLLATE "C"),c.relacl IS NULL
  FROM pg_class c JOIN scopes n ON n.oid=c.relnamespace
  UNION ALL
  SELECT 'routine',format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
    ARRAY(SELECT x::text FROM unnest(p.proacl) x ORDER BY x::text COLLATE "C"),p.proacl IS NULL
  FROM pg_proc p JOIN scopes n ON n.oid=p.pronamespace
  UNION ALL
  SELECT 'type',format('%I.%I',n.nspname,t.typname),
    ARRAY(SELECT x::text FROM unnest(t.typacl) x ORDER BY x::text COLLATE "C"),t.typacl IS NULL
  FROM pg_type t JOIN scopes n ON n.oid=t.typnamespace
  UNION ALL
  SELECT 'column',format('%I.%I.%I',n.nspname,c.relname,a.attname),
    ARRAY(SELECT x::text FROM unnest(a.attacl) x ORDER BY x::text COLLATE "C"),a.attacl IS NULL
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
  JOIN scopes n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped
), defaults_catalog AS (
  SELECT pg_get_userbyid(d.defaclrole) AS role,n.nspname AS schema,d.defaclobjtype,
    ARRAY(SELECT x::text FROM unnest(d.defaclacl) x ORDER BY x::text COLLATE "C") AS acl,d.defaclacl IS NULL AS acl_is_null
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
), roles_catalog AS (
  SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,
    rolreplication,rolconnlimit,rolvaliduntil,rolbypassrls,
    ARRAY(SELECT x FROM unnest(rolconfig) x ORDER BY x COLLATE "C") AS config
  FROM pg_roles
), memberships AS (
  SELECT r.rolname AS role,m.rolname AS member,g.rolname AS grantor,
    a.admin_option,a.inherit_option,a.set_option
  FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid
  JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor
), settings_catalog AS (
  SELECT COALESCE(r.rolname,'*') AS role,COALESCE(d.datname,'*') AS database,
    ARRAY(SELECT x FROM unnest(s.setconfig) x ORDER BY x COLLATE "C") AS config
  FROM pg_db_role_setting s LEFT JOIN pg_roles r ON r.oid=s.setrole
  LEFT JOIN pg_database d ON d.oid=s.setdatabase
  WHERE s.setdatabase=0 OR d.datname=current_database()
), sequences_catalog AS (
  SELECT n.nspname AS schema,c.relname AS name,format_type(s.seqtypid,NULL) AS type,s.seqstart,s.seqincrement,
    s.seqmax,s.seqmin,s.seqcache,s.seqcycle,
    ARRAY(SELECT format('%I.%I.%I:%s',rn.nspname,rc.relname,a.attname,d.deptype)
      FROM pg_depend d JOIN pg_class rc ON rc.oid=d.refobjid
      JOIN pg_namespace rn ON rn.oid=rc.relnamespace
      JOIN pg_attribute a ON a.attrelid=rc.oid AND a.attnum=d.refobjsubid
      WHERE d.classid='pg_class'::regclass AND d.objid=c.oid
        AND d.refclassid='pg_class'::regclass AND d.deptype IN ('a','i')
      ORDER BY rn.nspname COLLATE "C",rc.relname COLLATE "C",a.attname COLLATE "C",d.deptype::text COLLATE "C") AS owned_by
  FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid
  JOIN scopes n ON n.oid=c.relnamespace
), sequence_states_catalog AS (
  SELECT format('%I.%I',n.nspname,c.relname) AS sequence,
    md5(query_to_xml(format('SELECT last_value,is_called FROM %I.%I',n.nspname,c.relname),false,true,'')::text) AS state_md5
  FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid
  JOIN scopes n ON n.oid=c.relnamespace
), rows_catalog AS (
  SELECT format('%I.%I',n.nspname,c.relname) AS relation,
    ((xpath('/row/c/text()',query_to_xml(format('SELECT count(*) AS c FROM %I.%I',n.nspname,c.relname),false,true,'')))[1]::text)::bigint AS rows
  FROM pg_class c JOIN scopes n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p')
), database_properties_catalog AS (
  SELECT d.datname AS name,pg_get_userbyid(d.datdba) AS owner,
    d.datacl IS NULL AS acl_is_null,
    ARRAY(SELECT x::text FROM unnest(d.datacl) x ORDER BY x::text COLLATE "C") AS acl,
    COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY to_jsonb(s)::text COLLATE "C")
      FROM settings_catalog s WHERE s.database=d.datname),'[]'::jsonb) AS settings
  FROM pg_database d WHERE d.datname=current_database()
), documents AS (
  SELECT 'relations' AS category,to_jsonb(x) AS item FROM relations x
  UNION ALL SELECT 'schemas',jsonb_build_object('schema',nspname,'owner',owner) FROM scopes
  UNION ALL SELECT 'columns',to_jsonb(x) FROM columns x
  UNION ALL SELECT 'constraints',to_jsonb(x) FROM constraints_catalog x
  UNION ALL SELECT 'policies',to_jsonb(x) FROM policies x
  UNION ALL SELECT 'routines',to_jsonb(x) FROM routines x
  UNION ALL SELECT 'triggers',to_jsonb(x) FROM triggers_catalog x
  UNION ALL SELECT 'indexes',to_jsonb(x) FROM indexes_catalog x
  UNION ALL SELECT 'types',to_jsonb(x) FROM types_catalog x
  UNION ALL SELECT 'acls',to_jsonb(x) FROM acls x
  UNION ALL SELECT 'default_privileges',to_jsonb(x) FROM defaults_catalog x
  UNION ALL SELECT 'roles',to_jsonb(x) FROM roles_catalog x
  UNION ALL SELECT 'memberships',to_jsonb(x) FROM memberships x
  UNION ALL SELECT 'role_settings',to_jsonb(x) FROM settings_catalog x
  UNION ALL SELECT 'sequences',to_jsonb(x) FROM sequences_catalog x
  UNION ALL SELECT 'database_properties',to_jsonb(x) FROM database_properties_catalog x
)
`;

/** Compare this exact query on the source separately; no individual records/config values are returned. */
export const VERIFICATION_SQL = `${CATALOG_SQL_CTES}, fingerprints AS (
  SELECT category,count(*) AS objects,md5(jsonb_agg(item ORDER BY item::text COLLATE "C")::text) AS fingerprint
  FROM documents GROUP BY category
)
SELECT jsonb_build_object(
  'format',1,
  'metadata_revision',4,
  'catalog',COALESCE((SELECT jsonb_object_agg(category,jsonb_build_object('objects',objects,'md5',fingerprint)) FROM fingerprints),'{}'::jsonb),
  'rows',COALESCE((SELECT jsonb_object_agg(relation,rows) FROM rows_catalog),'{}'::jsonb),
  'sequence_states',COALESCE((SELECT jsonb_object_agg(sequence,state_md5) FROM sequence_states_catalog),'{}'::jsonb),
  'extensions',(SELECT jsonb_object_agg(e.extname,jsonb_build_object('version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner))) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
  'aggregate',jsonb_build_object(
    'auth_users',(SELECT count(*) FROM auth.users),
    'vault_secrets',(SELECT count(*) FROM vault.secrets),
    'storage_objects',(SELECT count(*) FROM storage.objects),
    'rls_tables',(SELECT count(*) FROM pg_class c JOIN scopes n ON n.oid=c.relnamespace WHERE c.relrowsecurity),
    'policies',(SELECT count(*) FROM policies),
    'postgres_superuser',(SELECT rolsuper FROM pg_roles WHERE rolname='postgres')),
  'database',jsonb_build_object('server_version',current_setting('server_version'),'encoding',current_setting('server_encoding'),
    'collation',(SELECT datcollate FROM pg_database WHERE datname=current_database()),
    'ctype',(SELECT datctype FROM pg_database WHERE datname=current_database()),
    'owner',(SELECT owner FROM database_properties_catalog),
    'acl_is_null',(SELECT acl_is_null FROM database_properties_catalog),
    'acl_md5',(SELECT md5(acl::text) FROM database_properties_catalog),
    'database_settings_md5',(SELECT md5(settings::text) FROM database_properties_catalog)),
  'provenance',jsonb_build_object(
    'canonicalization','All textual ordering uses COLLATE C; arrays and logical column ordinals are normalized before hashing; sequence definitions and current states are separate',
    'database_properties','Observed separately; pg_restore without CREATE DATABASE does not reproduce database owner, database ACL or per-database settings',
    'role_settings','Passwordless roles.sql carries global ALTER ROLE settings; per-database settings require separate comparison/restoration',
    'object_privileges','Object owners, ACLs and default privileges are restored from the archive and fingerprinted',
    'snapshot','Rows and sequence states describe capture time; compare archived data independently of later live activity')
);
`;

/**
 * Print SQL only. Its result includes definitions, role settings and ACL details;
 * capture it directly to a mode-0600 file, never to a terminal/public report.
 * It contains no application records. Summary and details use identical objects.
 */
export const CATALOG_DETAILS_SQL = `${CATALOG_SQL_CTES}
SELECT jsonb_build_object('format',1,'metadata_revision',4,'categories',
  COALESCE(jsonb_object_agg(category,objects),'{}'::jsonb),
  'sequence_states',COALESCE((SELECT jsonb_object_agg(sequence,state_md5) FROM sequence_states_catalog),'{}'::jsonb))
FROM (
  SELECT category,jsonb_agg(item ORDER BY item::text COLLATE "C") AS objects
  FROM documents GROUP BY category
) categorized;
`;

export type ProviderProfile = { format: 1; extension_owners: Record<string, 'postgres' | 'supabase_admin'>; bootstrap_sha256?: string };

export function validateProviderProfile(value: unknown): ProviderProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provider profile must be an explicit JSON object.');
  const profile = value as Partial<ProviderProfile>;
  if (Object.keys(profile).some(key => !['format', 'extension_owners', 'bootstrap_sha256'].includes(key)) || profile.format !== 1 || !profile.extension_owners || typeof profile.extension_owners !== 'object' || Array.isArray(profile.extension_owners) || Object.keys(profile.extension_owners).length === 0) throw new Error('Unsupported provider profile shape.');
  for (const [extension, owner] of Object.entries(profile.extension_owners)) {
    if (!/^[a-z_][a-z0-9_-]*$/.test(extension) || !['postgres', 'supabase_admin'].includes(owner)) throw new Error('Every extension requires an explicit supported source owner.');
  }
  if (profile.bootstrap_sha256 !== undefined && !/^[a-f0-9]{64}$/.test(profile.bootstrap_sha256)) throw new Error('Provider bootstrap SHA256 must be a lowercase hexadecimal digest.');
  return profile as ProviderProfile;
}

export function partitionRestoreToc(toc: string, profile: ProviderProfile) {
  const schemas: string[] = [];
  const extensions: { name: string; owner: 'postgres' | 'supabase_admin'; line: string }[] = [];
  const remaining: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const line of toc.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith(';')) continue;
    const entry = /^([1-9][0-9]*); [0-9]+ [0-9]+ (.+)$/.exec(line);
    if (!entry || ids.has(entry[1])) throw new Error('Unsupported or duplicate archive TOC entry; refuse partial recovery.');
    ids.add(entry[1]);
    const description = entry[2].trimEnd();
    if (description.startsWith('SCHEMA ')) schemas.push(line);
    else if (description.startsWith('EXTENSION ')) {
      const extension = /^EXTENSION - ([a-z_][a-z0-9_-]*)$/.exec(description);
      const name = extension?.[1];
      if (!name || !Object.hasOwn(profile.extension_owners, name) || names.has(name)) throw new Error('Archive extension is unknown, repeated or absent from the explicit provider profile.');
      names.add(name);
      extensions.push({ name, owner: profile.extension_owners[name], line });
    } else remaining.push(line);
  }
  const preexistingOnly = Object.keys(profile.extension_owners).filter(name => !names.has(name));
  if (preexistingOnly.some(name => name !== 'plpgsql')) throw new Error('Provider profile contains an extension absent from this archive.');
  if (schemas.length === 0 || extensions.length === 0 || remaining.length === 0 || schemas.length + extensions.length + remaining.length !== ids.size) throw new Error('Archive TOC cannot be partitioned completely into the required restore phases.');
  return { schemas, extensions, remaining, entries: ids.size, preexistingOnly };
}

export type CopyDataFingerprint = {
  format: 1;
  tables: Record<string, { rows: number; sha256: string }>;
  sequences: Record<string, { sha256: string }>;
};

/**
 * Parse only the data format actually used by the complete custom export. Text COPY
 * escapes remain untouched; sorting UTF-8 bytes ignores physical row order while
 * retaining duplicate rows, NULL markers, tabs and every escaped field byte.
 * Unsupported executable statements are a hard failure, never silently excluded.
 */
export function fingerprintCopyDataDump(sql: string): CopyDataFingerprint {
  if (sql.includes('\r')) throw new Error('Unsupported carriage-return data stream; refuse to normalize COPY bytes.');
  const tables: CopyDataFingerprint['tables'] = Object.create(null) as CopyDataFingerprint['tables'];
  const sequences: CopyDataFingerprint['sequences'] = Object.create(null) as CopyDataFingerprint['sequences'];
  const settings = new Set([
    'SET statement_timeout = 0;', 'SET lock_timeout = 0;',
    'SET idle_in_transaction_session_timeout = 0;', 'SET transaction_timeout = 0;',
    "SET client_encoding = 'UTF8';", 'SET standard_conforming_strings = on;',
    'SET check_function_bodies = false;', 'SET xmloption = content;',
    'SET client_min_messages = warning;', 'SET row_security = off;',
    "SET default_tablespace = '';", 'SET default_table_access_method = heap;',
    'SET default_with_oids = false;',
  ]);
  const identifier = '(?:"(?:[^"\\n]|"")+"|[a-z_][a-z0-9_$]*)';
  const copyHeader = new RegExp(`^COPY ${identifier}\\.${identifier} \\(${identifier}(?:, ${identifier})*\\) FROM stdin;$`);
  let header: string | undefined;
  let rows: Buffer[] = [];
  let complete = false;
  for (const line of sql.split('\n')) {
    if (header !== undefined) {
      if (line === '\\.') {
        rows.sort(Buffer.compare);
        const hash = createHash('sha256');
        for (const row of rows) { hash.update(row); hash.update('\n'); }
        tables[header] = { rows: rows.length, sha256: hash.digest('hex') };
        header = undefined;
        rows = [];
      } else rows.push(Buffer.from(line, 'utf8'));
      continue;
    }
    if (line === '-- PostgreSQL database dump complete') complete = true;
    if (line === '' || line.startsWith('--')) continue;
    if (/^\\(?:un)?restrict [A-Za-z0-9]+$/.test(line)) continue;
    if (settings.has(line)) continue;
    if (line === "SELECT pg_catalog.set_config('search_path', '', false);") continue;
    if (copyHeader.test(line)) {
      if (complete || Object.hasOwn(tables, line)) throw new Error('Duplicate or misplaced COPY block in data stream.');
      header = line;
      continue;
    }
    const sequence = /^SELECT pg_catalog\.setval\(('(?:[^']|'')+'), (-?[0-9]+), (true|false)\);$/.exec(line);
    if (sequence) {
      if (complete || Object.hasOwn(sequences, sequence[1])) throw new Error('Duplicate or misplaced sequence state in data stream.');
      sequences[sequence[1]] = { sha256: createHash('sha256').update(line).digest('hex') };
      continue;
    }
    throw new Error('Unsupported executable data format; complete COPY/sequence recovery cannot be claimed.');
  }
  if (header !== undefined || !complete || Object.keys(tables).length === 0) throw new Error('Incomplete or unsupported data stream; require terminated COPY blocks and a completed dump.');
  return { format: 1, tables, sequences };
}

export function compareCopyDataFingerprints(actual: CopyDataFingerprint, archived: CopyDataFingerprint): string[] {
  const differences: string[] = [];
  if (stable(actual.tables) !== stable(archived.tables)) differences.push('tables');
  if (stable(actual.sequences) !== stable(archived.sequences)) differences.push('sequences');
  return differences;
}

export function validateRestoreName(name: string): string {
  if (!/^evg-restore-[a-z0-9][a-z0-9-]{3,47}$/.test(name)) throw new Error('Use a new evg-restore- container name containing only lowercase letters, digits and hyphens.');
  return name;
}

/** Same temporary postgres capability used by released Supabase CLI v2.122.0. */
export function adaptRestoreRoles(source: string): { before: string; after: string } {
  const lines = source.split(/\r?\n/);
  let postgresCreated = 0;
  let bootstrapAsserted = 0;
  const deferred: string[] = [];
  const before = lines.map((line) => {
    if (/^CREATE ROLE (?:postgres|"postgres");$/.test(line)) {
      postgresCreated++;
      return 'CREATE ROLE postgres WITH SUPERUSER;';
    }
    if (/^CREATE ROLE (?:supabase_admin|"supabase_admin");$/.test(line)) {
      bootstrapAsserted++;
      return "DO $$ BEGIN IF current_user <> 'supabase_admin' OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin' AND rolsuper) THEN RAISE EXCEPTION 'Unexpected restore bootstrap role'; END IF; END $$;";
    }
    if (/^ALTER ROLE (?:postgres|"postgres") WITH .+;$/.test(line)) {
      deferred.push(line);
      return '-- Local restore only: postgres attributes are applied after all exported grants and objects.';
    }
    return line;
  }).join('\n');
  if (postgresCreated !== 1 || bootstrapAsserted !== 1 || deferred.length !== 1 || !/\bNOSUPERUSER\b/.test(deferred[0])) {
    throw new Error('Unexpected exported managed roles; refuse to guess a role adaptation.');
  }
  if (!/^ALTER ROLE (?:supabase_admin|"supabase_admin") WITH (?:(?!NOSUPERUSER).)*\bSUPERUSER\b.*;$/m.test(source)) {
    throw new Error('The exported bootstrap administrator must remain a superuser during recovery.');
  }
  // Keep psql restriction tokens balanced in each separate input stream.
  const restrictions = lines.filter(line => /^\\(?:un)?restrict [A-Za-z0-9]+$/.test(line));
  return { before, after: [...restrictions.filter(line => /^\\restrict /.test(line)), ...deferred,
    "DO $$ BEGIN IF (SELECT rolsuper FROM pg_roles WHERE rolname='postgres') THEN RAISE EXCEPTION 'postgres demotion failed'; END IF; END $$;",
    ...restrictions.filter(line => /^\\unrestrict /.test(line)), ''].join('\n') };
}

type Metadata = { format: number; metadata_revision?: number; catalog: Record<string, unknown>; rows: Record<string, number>; sequence_states?: Record<string, string>; extensions: Record<string, unknown>;
  aggregate: { auth_users: number; vault_secrets: number; storage_objects: number; postgres_superuser: boolean; [key: string]: unknown };
  database: Record<string, unknown> };

const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => {
  if (item && typeof item === 'object' && !Array.isArray(item)) return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
  return item;
});

export function compareRestoreMetadata(actual: Metadata, expected: Metadata): string[] {
  if (expected.format !== 1 || !expected.catalog || !expected.rows || !expected.extensions || !expected.aggregate || !expected.database) throw new Error('Expected metadata must be the JSON object returned by --print-verification-sql.');
  if (actual.metadata_revision !== expected.metadata_revision) throw new Error('Metadata query revisions differ; capture both sides with the current query instead of comparing incompatible fingerprints.');
  return ['catalog', 'rows', 'sequence_states', 'extensions', 'aggregate', 'database'].filter(key => stable(actual[key as keyof Metadata]) !== stable(expected[key as keyof Metadata]));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--print-verification-sql') { console.log(VERIFICATION_SQL); return; }
  if (args.length === 1 && args[0] === '--print-catalog-details-sql') { console.log(CATALOG_DETAILS_SQL); return; }
  if (args.includes('--help')) {
    console.log('Plan: DOCKER_HOST=unix:///explicit/local/docker.sock node scripts/restore-supabase-local.ts --container evg-restore-unique --archive /protected/export/database.dump --provider-profile /protected/provider-profile.json --output /protected/new-report [--provider-bootstrap-sql /protected/provider.sql] [--expected-auth-users 6] [--expected-metadata /protected/source-metadata.json]');
    console.log('Add --execute to create a NEW offline container/volume. Add --keep-for-service-checks only to retain a successful restore for subsequent local Auth/API rehearsal. Default removes owned resources.');
    console.log('Use --print-verification-sql to obtain the matching aggregate/catalog query; run it on the source separately. No source connection is accepted.');
    console.log('Use --print-catalog-details-sql for the matching detailed query. Capture its result directly to a protected mode-0600 file; it can contain definitions/role configuration and must never be printed to a terminal or public report.');
    console.log('Provider profile format: {"format":1,"extension_owners":{"extension_name":"postgres or supabase_admin"},"bootstrap_sha256":"optional separate trusted SQL SHA256"}. Files must be private and outside this repository. Bootstrap SQL runs after the archive and postgres demotion, in one transaction; omit transaction commands and psql metacommands.');
    return;
  }
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--execute', '--keep-for-service-checks'].includes(arg)) {
      if (switches.has(arg)) throw new Error('Duplicate option.');
      switches.add(arg);
    } else if (['--container', '--archive', '--output', '--expected-auth-users', '--expected-metadata', '--locale', '--provider-profile', '--provider-bootstrap-sql'].includes(arg)) {
      if (values.has(arg) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Each value option must appear once with its value.');
      values.set(arg, args[++i]);
    } else throw new Error('Unknown option; use --help. Source connection options are intentionally unsupported.');
  }
  const required = (flag: string) => { const v = values.get(flag); if (!v) throw new Error(`Required option ${flag} is missing.`); return v; };
  const name = validateRestoreName(required('--container'));
  const volume = `${name}-data`;
  const archive = resolve(required('--archive'));
  const output = resolve(required('--output'));
  const profilePath = resolve(required('--provider-profile'));
  const bootstrapPath = values.has('--provider-bootstrap-sql') ? resolve(required('--provider-bootstrap-sql')) : undefined;
  const expectedPath = values.has('--expected-metadata') ? resolve(required('--expected-metadata')) : undefined;
  const expectedAuthUsers = values.has('--expected-auth-users') ? Number(required('--expected-auth-users')) : undefined;
  if (expectedAuthUsers !== undefined && (!Number.isSafeInteger(expectedAuthUsers) || expectedAuthUsers < 0)) throw new Error('Expected Auth users must be a nonnegative integer.');
  const locale = values.get('--locale') ?? 'C.UTF-8';
  if (!/^[A-Za-z0-9_.@-]{1,64}$/.test(locale)) throw new Error('Invalid database locale.');
  const dockerHost = process.env.DOCKER_HOST;
  if (!dockerHost || !/^unix:\/\/\/[A-Za-z0-9_./-]+$/.test(dockerHost)) throw new Error('Set DOCKER_HOST explicitly to a local absolute unix:/// socket; remote Docker endpoints are refused.');
  const keep = switches.has('--keep-for-service-checks');
  if (!switches.has('--execute')) {
    console.log(JSON.stringify({ mode: 'plan', source_writes: false, image: RESTORE_IMAGE, container: name, volume,
      network: 'none', ports: [], host_binds: [], archive, output, keep_after_success: keep,
      provider_profile: profilePath, provider_bootstrap_sql: bootstrapPath, extension_ownership: 'Required explicit source profile; no assumed owners',
      archive_contents_read: false, expected_auth_users: expectedAuthUsers, source_catalog_baseline_supplied: Boolean(expectedPath),
      steps: ['Check checksums and resource absence', 'Create an owned blank provider-compatible cluster', 'Restore every role/grant with temporary local postgres capability', 'Strictly restore the complete custom archive with owners and ACLs', 'Compare all COPY row hashes/counts and sequence states against the exact archive', 'Apply exported postgres attributes and inspect aggregate/catalog metadata', keep ? 'Retain owned offline resources for local service checks' : 'Remove only resources carrying this run ownership label'],
      pending: ['Local GoTrue sign-in and JWT/PostgREST account isolation', 'Hosted Auth/provider configuration verification'],
      limits: ['Fresh local Vault key is valid only when copied Vault has zero rows', 'Storage bytes and platform settings are outside this archive'] }, null, 2));
    return;
  }
  const socket = dockerHost.slice('unix://'.length);
  if (!isAbsolute(socket) || !statSync(socket).isSocket()) throw new Error('DOCKER_HOST must identify an existing local Unix socket.');
  const repo = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  const inside = (parent: string, child: string) => { const rel = relative(parent, child); return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)); };
  const sourceDirectory = realpathSync(dirname(archive));
  if (inside(repo, sourceDirectory) || inside(repo, resolve(realpathSync(dirname(output)), 'placeholder'))) throw new Error('Keep sensitive backups and recovery reports outside the source repository.');
  if (inside(sourceDirectory, output)) throw new Error('The new report directory must be outside the backup directory.');
  if (existsSync(output)) throw new Error('Choose a new report directory; existing outputs are never overwritten.');
  const protectedRead = (path: string, max = MAX_INPUT_BYTES): Buffer => {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > max || (info.mode & 0o077) !== 0 || realpathSync(path) !== path) throw new Error('Input files must be bounded, private regular files with no symlinks.');
    return readFileSync(path);
  };
  if (archive !== join(sourceDirectory, 'database.dump')) throw new Error('Use the original database.dump alongside roles.sql and manifest.json.');
  const dump = protectedRead(archive);
  if (dump.subarray(0, 5).toString('ascii') !== 'PGDMP') throw new Error('Expected an original PostgreSQL custom archive.');
  const roles = protectedRead(join(sourceDirectory, 'roles.sql'), 16 * 1024 * 1024);
  const manifest = JSON.parse(protectedRead(join(sourceDirectory, 'manifest.json'), 1024 * 1024).toString('utf8')) as { mode?: string; status?: string; files?: Record<string, string> };
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  if (manifest.mode !== 'backup' || manifest.status !== 'exported_not_yet_restore_verified' || manifest.files?.['database.dump'] !== hash(dump) || manifest.files?.['roles.sql'] !== hash(roles)) throw new Error('The original completed export manifest and both SHA-256 checksums must match.');
  const adapted = adaptRestoreRoles(roles.toString('utf8'));
  if (inside(repo, realpathSync(profilePath)) || (bootstrapPath && inside(repo, realpathSync(bootstrapPath)))) throw new Error('Provider recovery inputs must remain outside the source repository.');
  const profileBytes = protectedRead(profilePath, 1024 * 1024);
  const profile = validateProviderProfile(JSON.parse(profileBytes.toString('utf8')));
  const bootstrapBytes = bootstrapPath ? protectedRead(bootstrapPath, 8 * 1024 * 1024) : undefined;
  if (profile.bootstrap_sha256 && (!bootstrapBytes || hash(bootstrapBytes) !== profile.bootstrap_sha256)) throw new Error('The explicitly pinned provider bootstrap SQL must be supplied and match its SHA256.');
  if (bootstrapBytes && /^\s*\\/m.test(bootstrapBytes.toString('utf8'))) throw new Error('Provider bootstrap accepts trusted SQL only, without psql metacommands.');
  const expected = expectedPath ? JSON.parse(protectedRead(expectedPath, 8 * 1024 * 1024).toString('utf8')) as Metadata : undefined;
  mkdirSync(output, { mode: 0o700 });
  chmodSync(output, 0o700);
  const config = join(output, 'docker-client');
  mkdirSync(config, { mode: 0o700 });
  const environment: NodeJS.ProcessEnv = { PATH: process.env.PATH, LANG: 'C.UTF-8', DOCKER_HOST: dockerHost, DOCKER_CONFIG: config };
  const ownership = randomUUID();
  let logNumber = 0;
  let success = false;
  let cancellation: NodeJS.Signals | undefined;
  let cleaningUp = false;
  const onInterrupt = () => { cancellation = 'SIGINT'; };
  const onTerminate = () => { cancellation = 'SIGTERM'; };
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  // Sync subprocesses have a bounded timeout. Yield between phases so an arriving
  // signal is handled before the next mutation, then use the ordinary cleanup path.
  const checkpoint = async () => {
    await new Promise<void>(done => setImmediate(done));
    if (cancellation) throw new Error('Recovery cancelled; owned resources must be cleaned up.');
  };
  const report: Record<string, unknown> = { format: 1, started_at: new Date().toISOString(), status: 'started', source_writes: false,
    image: RESTORE_IMAGE, container: name, volume, network: 'none', ports: [], host_binds: [],
    cleanup_ownership_label: `${OWNER_LABEL}=${ownership}`,
    source_checksums: manifest.files, exported_role_passwords: false,
    provider_recovery: { profile_sha256: hash(profileBytes), extension_owners: profile.extension_owners,
      bootstrap_sql_supplied: Boolean(bootstrapBytes), bootstrap_sha256: bootstrapBytes ? hash(bootstrapBytes) : null,
      bootstrap_hash_pinned: Boolean(profile.bootstrap_sha256), original_archive_contains_provider_inputs: false,
      provenance: 'Explicit separate recovery inputs; not part of this original offsite archive. Bootstrap SQL is trusted, transaction-scoped and content is omitted from reports.' },
    role_adaptation: 'Temporary local postgres SUPERUSER; apply its exact exported attributes after restoring all memberships/objects. Existing bootstrap supabase_admin is asserted.',
    vault_key: 'Fresh disposable local key; accepted only for an empty Vault',
    pending: ['Local GoTrue sign-in and JWT/PostgREST account isolation', 'Hosted Auth/provider configuration verification'],
    limitations: ['Logical backup excludes Storage object bytes, platform settings and original Vault root key', 'Raw archive does not contain database-level owner/ACL/settings; separate provider inputs must restore them before source metadata can match', 'Catalog MD5 fingerprints compare metadata; they are not backup authenticity signatures', 'Direct provider binaries and restored schema do not reproduce every hosted server setting'] };
  const invoke = (parameters: string[], input?: string | Buffer, allowFailure = false) => {
    if (cancellation && !cleaningUp) throw new Error('Recovery cancelled; owned resources must be cleaned up.');
    const result = spawnSync('docker', parameters, { env: environment, input, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      if (allowFailure) return undefined;
      writeFileSync(join(output, `${String(++logNumber).padStart(3, '0')}-failure.log`), `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error ? String(result.error) : ''}`, { mode: 0o600 });
      throw new Error('A local recovery command failed; sensitive diagnostics are retained only in the protected report directory.');
    }
    return result.stdout;
  };
  const inspect = (kind: 'container' | 'volume', resource: string): Record<string, unknown> | undefined => {
    // Only a successful daemon inventory can establish absence. An inaccessible engine
    // must never be treated as successful cleanup, including during the final checks.
    const inventory = invoke([kind, 'ls', ...(kind === 'container' ? ['--all'] : []), '--format', kind === 'container' ? '{{.Names}}' : '{{.Name}}']) ?? '';
    if (!inventory.split(/\r?\n/).includes(resource)) return undefined;
    return JSON.parse(invoke([kind, 'inspect', resource]) ?? '[]')[0] as Record<string, unknown>;
  };
  const labelMatches = (kind: 'container' | 'volume', resource: string): boolean => {
    const info = inspect(kind, resource);
    const labels = kind === 'volume' ? info?.Labels : (info?.Config as Record<string, unknown> | undefined)?.Labels;
    return (labels as Record<string, string> | undefined)?.[OWNER_LABEL] === ownership;
  };
  const exec = (parameters: string[], input?: string | Buffer, options: { root?: boolean; replica?: boolean } = {}) => invoke(['exec', '-i', '--user', options.root ? 'root' : 'postgres', ...(options.replica ? ['--env', 'PGOPTIONS=-c session_replication_role=replica'] : []), name, ...parameters], input);
  const psql = (sql: string) => exec(['psql', '-X', '--no-password', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--single-transaction', '-h', SOCKET_PATH, '-U', 'supabase_admin', '-d', 'postgres'], sql) ?? '';
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  try {
    // Read commands before any resource mutation; failed daemon access is never interpreted as absence.
    invoke(['version', '--format', '{{.Server.Version}}']);
    invoke(['container', 'ls', '--all', '--format', '{{.Names}}']);
    invoke(['volume', 'ls', '--format', '{{.Name}}']);
    await checkpoint();
    if (inspect('container', name) || inspect('volume', volume)) throw new Error('A requested container or volume already exists; nothing will be reused or erased.');
    const image = JSON.parse(invoke(['image', 'inspect', RESTORE_IMAGE]) ?? '[]')[0] as { Os?: string; Architecture?: string; Config?: { Volumes?: Record<string, unknown> } } | undefined;
    if (image?.Os !== 'linux' || image.Architecture !== 'arm64') throw new Error('The exact pinned linux/arm64 image must already be present. This tool never pulls images.');
    if (Object.keys(image.Config?.Volumes ?? {}).length > 0) throw new Error('The pinned image declares implicit volumes; refuse anonymous resource creation.');
    await checkpoint();
    invoke(['volume', 'create', '--label', `${OWNER_LABEL}=${ownership}`, volume]);
    await checkpoint();
    if (!labelMatches('volume', volume)) throw new Error('Volume ownership collision; refuse to use or remove this volume.');
    invoke(['create', '--pull=never', '--name', name, '--label', `${OWNER_LABEL}=${ownership}`, '--network=none', '--read-only', '--no-healthcheck', '--security-opt', 'no-new-privileges', '--pids-limit', '128', '--memory', '1g', '--cpus', '1', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--mount', `type=volume,source=${volume},target=/restore`, '--entrypoint', '/bin/sh', RESTORE_IMAGE, '-c', 'exec sleep infinity']);
    await checkpoint();
    if (!labelMatches('container', name)) throw new Error('Container ownership collision; refuse to use or remove this container.');
    const isolated = inspect('container', name) as { HostConfig?: { NetworkMode?: string; Binds?: unknown[]; PortBindings?: Record<string, unknown> }; Mounts?: { Type?: string; Name?: string; Destination?: string }[] };
    if (isolated.HostConfig?.NetworkMode !== 'none' || (isolated.HostConfig.Binds?.length ?? 0) > 0 || Object.keys(isolated.HostConfig.PortBindings ?? {}).length > 0 || isolated.Mounts?.length !== 1 || isolated.Mounts[0].Type !== 'volume' || isolated.Mounts[0].Name !== volume || isolated.Mounts[0].Destination !== '/restore') throw new Error('Container isolation does not match the requested local-only restore.');
    invoke(['start', name]);
    await checkpoint();
    exec(['/bin/sh', '-eu', '-c', 'test -z "$(ls -A /restore)"; mkdir /restore/data /restore/socket /restore/config; chown -R postgres:postgres /restore; chmod 700 /restore /restore/data /restore/socket /restore/config'], undefined, { root: true });
    exec(['/bin/sh', '-eu', '-c', 'umask 077; cat > /restore/config/root.key'], `${randomBytes(32).toString('hex')}\n`);
    exec(['/bin/sh', '-eu', '-c', 'umask 077; cat > /restore/config/getkey.sh; chmod 700 /restore/config/getkey.sh'], '#!/bin/sh\nexec cat /restore/config/root.key\n');
    exec(['initdb', '-D', DATA_PATH, '--username=supabase_admin', '--auth=trust', '--encoding=UTF8', `--locale=${locale}`]);
    await checkpoint();
    const postgresOptions = `-c listen_addresses='' -c unix_socket_directories=${SOCKET_PATH} -c shared_preload_libraries=pg_stat_statements,pg_cron,pg_net,pgsodium,supabase_vault,supautils -c pgsodium.getkey_script=/restore/config/getkey.sh -c vault.getkey_script=/restore/config/getkey.sh -c cron.launch_active_jobs=off -c wal_level=logical -c max_wal_senders=2 -c max_replication_slots=2 -c shared_buffers=32MB -c max_connections=20`;
    exec(['pg_ctl', '-D', DATA_PATH, '-l', '/restore/postgres.log', '-o', postgresOptions, '-w', 'start']);
    await checkpoint();
    const blank = JSON.parse(psql("SELECT json_build_object('roles',(SELECT count(*) FROM pg_roles WHERE rolname !~ '^pg_' AND rolname <> 'supabase_admin'),'schemas',(SELECT count(*) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')),'tables',(SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')));")) as { roles: number; schemas: number; tables: number };
    if (blank.roles !== 0 || blank.schemas !== 0 || blank.tables !== 0) throw new Error('The new cluster is not blank; refuse to restore.');
    psql(adapted.before);
    await checkpoint();
    const toc = partitionRestoreToc(exec(['pg_restore', '--list'], dump) ?? '', profile);
    const initialExtensions = JSON.parse(psql("SELECT COALESCE(json_object_agg(extname,pg_get_userbyid(extowner)),'{}'::json) FROM pg_extension;")) as Record<string, string>;
    if (Object.keys(initialExtensions).some(name => name !== 'plpgsql')) throw new Error('The blank cluster contains unexpected initial extensions.');
    if (initialExtensions.plpgsql && (!Object.hasOwn(profile.extension_owners, 'plpgsql') || profile.extension_owners.plpgsql !== initialExtensions.plpgsql)) throw new Error('Preexisting plpgsql ownership does not match the explicit provider profile.');
    for (const name of toc.preexistingOnly) if (initialExtensions[name] !== profile.extension_owners[name]) throw new Error('A profile-only extension is not present with its expected owner in the blank pinned image.');
    const listPath = (name: string, lines: string[]) => {
      const path = `/restore/${name}.list`;
      exec(['/bin/sh', '-eu', '-c', `umask 077; cat > ${path}`], `${lines.join('\n')}\n`);
      return path;
    };
    const restoreList = (path: string, role: string, clean: boolean) => exec(['pg_restore', '--exit-on-error', '--single-transaction', ...(clean ? ['--clean', '--if-exists'] : []), '--use-list', path, '--role', role, '-h', SOCKET_PATH, '-U', 'supabase_admin', '-d', 'postgres'], dump, { replica: true });
    restoreList(listPath('schemas', toc.schemas), 'supabase_admin', true);
    await checkpoint();
    for (const [index, extension] of toc.extensions.entries()) {
      restoreList(listPath(`extension-${index}`, [extension.line]), extension.owner, false);
      const actualOwner = JSON.parse(psql(`SELECT json_build_object('owner',pg_get_userbyid(extowner)) FROM pg_extension WHERE extname='${extension.name}';`)) as { owner?: string };
      if (actualOwner.owner !== extension.owner) throw new Error('An extension was not created under its explicit source owner.');
      await checkpoint();
    }
    restoreList(listPath('remaining', toc.remaining), 'supabase_admin', false);
    report.archive_restore_phases = { all_entries_preserved: true, total_entries: toc.entries, schema_entries: toc.schemas.length,
      extension_entries: toc.extensions.length, remaining_entries: toc.remaining.length, preexisting_profile_extensions_verified: toc.preexistingOnly,
      clean_scope: 'SCHEMA entries only on the verified blank target; every other TOC entry is restored once without clean' };
    await checkpoint();
    psql(adapted.after);
    await checkpoint();
    if (bootstrapBytes) { psql(bootstrapBytes.toString('utf8')); await checkpoint(); }
    const archivedData = fingerprintCopyDataDump(exec(['pg_restore', '--data-only', '--file', '-'], dump) ?? '');
    await checkpoint();
    const restoredData = fingerprintCopyDataDump(exec(['pg_dump', '--data-only', '--format=plain', '-h', SOCKET_PATH, '-U', 'supabase_admin', '-d', 'postgres']) ?? '');
    await checkpoint();
    const dataDifferences = compareCopyDataFingerprints(restoredData, archivedData);
    report.archive_data_comparison = { passed: dataDifferences.length === 0, differing_sections: dataDifferences,
      archived_tables: Object.keys(archivedData.tables).length, restored_tables: Object.keys(restoredData.tables).length,
      archived_rows: Object.values(archivedData.tables).reduce((total, table) => total + table.rows, 0),
      restored_rows: Object.values(restoredData.tables).reduce((total, table) => total + table.rows, 0),
      archived_sequences: Object.keys(archivedData.sequences).length, restored_sequences: Object.keys(restoredData.sequences).length,
      archived_fingerprints: archivedData, restored_fingerprints: restoredData };
    if (dataDifferences.length) throw new Error('Restored COPY rows or sequence states differ from the exact archive snapshot; refuse retention.');
    const metadata = JSON.parse(psql(VERIFICATION_SQL)) as Metadata;
    writeFileSync(join(output, 'local-metadata.json'), JSON.stringify(metadata, null, 2), { mode: 0o600 });
    report.local_metadata = metadata;
    for (const [name, owner] of Object.entries(profile.extension_owners)) {
      if ((metadata.extensions[name] as { owner?: string } | undefined)?.owner !== owner) throw new Error('Final extension ownership differs from the explicit provider profile.');
    }
    if (metadata.aggregate.postgres_superuser !== false) throw new Error('The exported postgres demotion was not restored.');
    if (metadata.aggregate.vault_secrets !== 0) throw new Error('Copied Vault has encrypted payloads; a fresh local key cannot prove recovery.');
    if (metadata.aggregate.storage_objects !== 0) throw new Error('Copied Storage has objects; this archive does not contain their file bytes.');
    if (expectedAuthUsers !== undefined && metadata.aggregate.auth_users !== expectedAuthUsers) throw new Error('The restored Auth user count differs from the explicit source aggregate.');
    const differences = expected ? compareRestoreMetadata(metadata, expected) : undefined;
    report.source_metadata_comparison = expected ? { passed: differences?.length === 0, differing_sections: differences } : { passed: false, reason: 'No source catalog baseline supplied; compare local-metadata.json separately before claiming equivalence.' };
    if (differences?.length) throw new Error('Restored aggregate/catalog metadata differs from the supplied source baseline; no differences are ignored.');
    report.status = expected ? 'database_verified_services_pending' : 'strict_restore_complete_catalog_baseline_pending';
    report.strict_restore_passed = true;
    await checkpoint();
    success = true;
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : 'Local recovery failed.';
  } finally {
    cleaningUp = true;
    const cleanup = () => { try {
      // Recover ownership even when a create acknowledgement was interrupted. A
      // competing resource cannot carry this unpredictable per-run label.
      const containerOwned = labelMatches('container', name);
      const volumeOwned = labelMatches('volume', volume);
      report.owned_container_created = containerOwned;
      report.owned_volume_created = volumeOwned;
      if (containerOwned) {
        const logs = invoke(['exec', '--user', 'postgres', name, 'cat', '/restore/postgres.log'], undefined, true);
        if (logs) writeFileSync(join(output, 'postgres.log'), logs, { mode: 0o600 });
      }
      if (success && keep && containerOwned && volumeOwned) {
        report.resources_retained_for_service_checks = true;
        report.cleanup_pending = true;
      } else {
        if (containerOwned) {
          const info = inspect('container', name);
          const id = info?.Id;
          if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id) || !labelMatches('container', name)) throw new Error('Cannot confirm the exact owned container for removal.');
          invoke(['rm', '--force', id]);
        }
        if (volumeOwned && !inspect('container', name)) {
          if (!labelMatches('volume', volume)) throw new Error('Volume ownership changed; refuse removal.');
          invoke(['volume', 'rm', volume]);
        }
        report.container_removed = containerOwned ? !inspect('container', name) : null;
        report.volume_removed = volumeOwned ? !inspect('volume', volume) : null;
        if ((containerOwned && report.container_removed !== true) || (volumeOwned && report.volume_removed !== true) || (success && keep)) {
          throw new Error('Owned resources remain or ownership changed; use the protected ownership label to inspect them.');
        }
      }
    } catch {
      report.status = 'failed';
      report.cleanup_error = 'Resource cleanup/ownership could not be confirmed. Do not assume the restored server or volume was removed.';
      report.resources_retained_for_service_checks = false;
      success = false;
    } };
    cleanup();
    report.finished_at = new Date().toISOString();
    if (cancellation) report.cancelled_by = cancellation;
    writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
  }
  console.log(JSON.stringify({ status: report.status, source_writes: false, strict_restore_passed: report.strict_restore_passed === true,
    source_catalog_compared: Boolean(expected) && success, resources_retained_for_service_checks: report.resources_retained_for_service_checks === true,
    provider_service_checks_pending: true, output }, null, 2));
  if (!success) process.exitCode = cancellation === 'SIGINT' ? 130 : cancellation === 'SIGTERM' ? 143 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => { console.error('Local restore refused before execution completed. Check the explicit options, private input permissions/checksums and protected report, if created. No source database is contacted.'); process.exitCode = 1; });
}
