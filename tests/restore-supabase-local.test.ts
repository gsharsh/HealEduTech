import assert from 'node:assert/strict';
import test from 'node:test';
import { compareCopyDataFingerprints, compareRestoreMetadata, fingerprintCopyDataDump, partitionRestoreToc, validateProviderProfile, VERIFICATION_SQL } from '../scripts/restore-supabase-local.ts';

const profile = validateProviderProfile({ format: 1, extension_owners: { pgcrypto: 'postgres', plpgsql: 'supabase_admin' } });
const toc = [
  '; Archive metadata',
  '1; 2615 2200 SCHEMA - public postgres',
  '2; 3079 16384 EXTENSION - pgcrypto ',
  '3; 0 0 COMMENT - EXTENSION pgcrypto ',
  '4; 1259 16385 TABLE public.books postgres',
  '5; 0 16385 TABLE DATA public books postgres',
  '6; 0 0 ACL - SCHEMA public postgres',
  '7; 0 0 SEQUENCE SET public books_id_seq postgres',
].join('\n');

test('TOC phases retain every original entry exactly once and distinguish extension comments', () => {
  const phases = partitionRestoreToc(toc, profile);
  assert.equal(phases.entries, 7);
  assert.equal(phases.schemas.length, 1);
  assert.deepEqual(phases.extensions.map(item => [item.name, item.owner]), [['pgcrypto', 'postgres']]);
  assert.deepEqual(phases.preexistingOnly, ['plpgsql']);
  assert.equal(phases.remaining.length, 5);
  const retained = [...phases.schemas, ...phases.extensions.map(item => item.line), ...phases.remaining];
  assert.equal(new Set(retained).size, 7);
  assert.deepEqual(retained.sort(), toc.split('\n').filter(line => !line.startsWith(';')).sort());
});

test('TOC phases reject unknown extensions, duplicate IDs and silently omitted profile entries', () => {
  assert.throws(() => partitionRestoreToc(toc.replace('EXTENSION - pgcrypto ', 'EXTENSION - unexpected '), profile), /unknown/);
  assert.throws(() => partitionRestoreToc(`${toc}\n${toc.split('\n')[1]}`, profile), /duplicate/);
  assert.throws(() => partitionRestoreToc(`${toc}\n8; 3079 16386 EXTENSION - pgcrypto`, profile), /repeated/);
  assert.throws(() => partitionRestoreToc(toc, validateProviderProfile({ format: 1, extension_owners: { pgcrypto: 'postgres', unaccent: 'supabase_admin' } })), /absent/);
  assert.throws(() => partitionRestoreToc(toc.replace('1; 2615 2200 SCHEMA - public postgres\n', ''), profile), /partitioned completely/);
});

test('provider profile requires explicit supported owners and permits only separately pinned bootstrap SQL', () => {
  for (const value of [null, {}, { format: 1, extension_owners: {} }, { format: 1, extension_owners: { pgcrypto: 'unknown' } }, { format: 1, extension_owners: { pgcrypto: 'postgres' }, post_restore_sql: 'untrusted inline SQL' }, { format: 1, extension_owners: { pgcrypto: 'postgres' }, bootstrap_sha256: 'bad' }]) assert.throws(() => validateProviderProfile(value));
  assert.equal(validateProviderProfile({ format: 1, extension_owners: { pgcrypto: 'postgres' }, bootstrap_sha256: 'a'.repeat(64) }).bootstrap_sha256, 'a'.repeat(64));
});

const dataDump = (rows: string[], sequence = '9007199254740993') => ['SET row_security = off;', 'COPY public.books (id, title) FROM stdin;', ...rows, '\\.', `SELECT pg_catalog.setval('public.books_id_seq', ${sequence}, true);`, '-- PostgreSQL database dump complete', ''].join('\n');

test('data comparison preserves exact rows and sequence state while ignoring physical row order', () => {
  const rows = ['1\t\\N', '2\tline\\ntext', '2\tline\\ntext'];
  const expected = fingerprintCopyDataDump(dataDump(rows));
  assert.deepEqual(compareCopyDataFingerprints(fingerprintCopyDataDump(dataDump([...rows].reverse())), expected), []);
  assert.deepEqual(compareCopyDataFingerprints(fingerprintCopyDataDump(dataDump(rows, '9007199254740992')), expected), ['sequences']);
  assert.deepEqual(compareCopyDataFingerprints(fingerprintCopyDataDump(dataDump(rows.slice(1))), expected), ['tables']);
  assert.ok(!JSON.stringify(expected).includes('line\\ntext'));
});

test('unsupported data formats and hidden statements fail instead of producing partial proof', () => {
  for (const data of [dataDump([]).replace('SET row_security = off;', 'SET statement_timeout = 0; DELETE FROM public.books;'), dataDump([]).replace('COPY public.books (id, title) FROM stdin;', 'INSERT INTO public.books VALUES (1);'), dataDump([]).replace('\\.\n', ''), dataDump([]).replace('-- PostgreSQL database dump complete', '')]) assert.throws(() => fingerprintCopyDataDump(data));
});

test('extension owner and separate sequence state remain strict metadata comparison fields', () => {
  assert.ok(VERIFICATION_SQL.includes('pg_get_userbyid(e.extowner)'));
  const metadata = { format: 1, metadata_revision: 4, catalog: {}, rows: {}, sequence_states: { seq: 'snapshot' }, extensions: { pgcrypto: { owner: 'postgres' } }, aggregate: { auth_users: 6, vault_secrets: 0, storage_objects: 0, postgres_superuser: false }, database: {} };
  assert.deepEqual(compareRestoreMetadata(metadata, { ...metadata, extensions: { pgcrypto: { owner: 'supabase_admin' } } }), ['extensions']);
  assert.deepEqual(compareRestoreMetadata(metadata, { ...metadata, sequence_states: { seq: 'advanced' } }), ['sequence_states']);
  assert.throws(() => compareRestoreMetadata(metadata, { ...metadata, metadata_revision: 3 }), /revisions differ/);
});
