import assert from 'node:assert/strict';
import test from 'node:test';
import { backupConnectionEnvironment } from '../scripts/backup-connection.ts';

const remote = 'postgresql://synthetic-user:synthetic-pass@db.example.invalid/postgres';

test('remote backups default to hostname-verified TLS using system trust', () => {
  const environment = backupConnectionEnvironment(remote, { PGSSLMODE: 'disable', PGHOST: 'wrong.invalid', PGOPTIONS: '-c default_transaction_read_only=off', PATH: '/synthetic/bin' });
  assert.equal(environment.PGHOST, 'db.example.invalid');
  assert.equal(environment.PGSSLMODE, 'verify-full');
  assert.equal(environment.PGSSLROOTCERT, 'system');
  assert.equal(environment.PGOPTIONS, '-c default_transaction_read_only=on');
  assert.equal(environment.PATH, '/synthetic/bin');
});

test('remote backups reject weaker supplied TLS instead of downgrading', () => {
  for (const mode of ['require', 'verify-ca', 'prefer', 'allow', 'disable']) assert.throws(() => backupConnectionEnvironment(`${remote}?sslmode=${mode}`), /verify-full/);
  const environment = backupConnectionEnvironment(`${remote}?sslmode=verify-full&sslrootcert=%2Fprotected%2Fprovider-ca.pem&channel_binding=require`);
  assert.equal(environment.PGSSLMODE, 'verify-full');
  assert.equal(environment.PGSSLROOTCERT, '/protected/provider-ca.pem');
  assert.equal(environment.PGCHANNELBINDING, 'require');
});

test('private sockets and loopback keep disposable-cluster connection behaviour', () => {
  const socket = backupConnectionEnvironment('postgresql://synthetic@localhost/postgres?host=%2Fprivate%2Ftmp%2Fsocket&port=6545');
  assert.equal(socket.PGHOST, '/private/tmp/socket');
  assert.equal(socket.PGPORT, '6545');
  assert.equal(socket.PGSSLMODE, undefined);
  assert.equal(backupConnectionEnvironment('postgresql://synthetic@[::1]/postgres').PGSSLMODE, undefined);
  assert.equal(backupConnectionEnvironment('postgresql://synthetic@127.0.0.1/postgres?sslmode=disable').PGSSLMODE, 'disable');
});

test('secret connection parsing rejects unsupported options without echoing the connection', () => {
  assert.throws(() => backupConnectionEnvironment('invalid synthetic connection'), /must be a PostgreSQL URL/);
  assert.throws(() => backupConnectionEnvironment(`${remote}?options=-c%20default_transaction_read_only=off`), /Unsupported database URL option: options/);
});
