import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionAuthStorage } from '../src/lib/sessionAuthStorage.ts';

test('session auth storage falls back to page memory when sessionStorage access is denied', () => {
  const storage = createSessionAuthStorage(() => { throw new DOMException('blocked', 'SecurityError'); });
  storage.setItem('sb-test-auth-token', 'session-token');
  assert.equal(storage.getItem('sb-test-auth-token'), 'session-token');
  storage.removeItem('sb-test-auth-token');
  assert.equal(storage.getItem('sb-test-auth-token'), null);
});

test('session auth storage catches failures from sessionStorage methods', () => {
  const denied = {
    getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
    setItem: () => { throw new DOMException('blocked', 'SecurityError'); },
    removeItem: () => { throw new DOMException('blocked', 'SecurityError'); },
  };
  const storage = createSessionAuthStorage(() => denied);
  storage.setItem('key', 'value');
  assert.equal(storage.getItem('key'), 'value');
  storage.removeItem('key');
  assert.equal(storage.getItem('key'), null);
});

test('session auth storage persists to tab storage and keeps a page-memory copy', () => {
  const values = new Map<string, string>();
  const storage = createSessionAuthStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  }));
  storage.setItem('key', 'value');
  assert.equal(values.get('key'), 'value');
  assert.equal(storage.getItem('key'), 'value');
  storage.removeItem('key');
  assert.equal(values.has('key'), false);
});

test('a successful storage read honors external clearing instead of restoring cached auth', () => {
  const values = new Map<string, string>();
  const storage = createSessionAuthStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  }));
  storage.setItem('key', 'session');
  values.clear();
  assert.equal(storage.getItem('key'), null);
});

test('a failed write switches to memory without reviving an old session', () => {
  const values = new Map<string, string>([['key', 'old-session']]);
  let failWrites = false;
  const storage = createSessionAuthStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new DOMException('blocked', 'SecurityError');
      values.set(key, value);
    },
    removeItem: () => { throw new DOMException('blocked', 'SecurityError'); },
  }));
  assert.equal(storage.getItem('key'), 'old-session');
  failWrites = true;
  storage.setItem('key', 'new-session');
  assert.equal(storage.getItem('key'), 'new-session');
  assert.throws(() => storage.removeItem('key'), /Could not remove persisted auth data/);
  assert.equal(storage.getItem('key'), null);
});

test('fresh memory-only sessions can sign out when browser storage was denied from the start', () => {
  const storage = createSessionAuthStorage(() => { throw new DOMException('blocked', 'SecurityError'); });
  storage.setItem('key', 'memory-session');
  assert.equal(storage.getItem('key'), 'memory-session');
  assert.doesNotThrow(() => storage.removeItem('key'));
  assert.equal(storage.getItem('key'), null);
});

test('failed removal of a known persisted session throws and a fresh adapter detects the retained token', () => {
  const values = new Map<string, string>();
  let failRemoval = false;
  const getStorage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => {
      if (failRemoval) throw new DOMException('blocked', 'SecurityError');
      values.delete(key);
    },
  });
  const storage = createSessionAuthStorage(getStorage);
  storage.setItem('sb-test-auth-token', 'persisted-session');
  failRemoval = true;

  assert.throws(() => storage.removeItem('sb-test-auth-token'), /Could not remove persisted auth data/);
  assert.equal(values.get('sb-test-auth-token'), 'persisted-session');
  assert.equal(createSessionAuthStorage(getStorage).getItem('sb-test-auth-token'), 'persisted-session');
});

test('a later removal retries native storage after it recovers', () => {
  const values = new Map<string, string>();
  let failRemoval = true;
  const getStorage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => {
      if (failRemoval) throw new DOMException('blocked', 'SecurityError');
      values.delete(key);
    },
  });
  const storage = createSessionAuthStorage(getStorage);
  storage.setItem('sb-test-auth-token', 'persisted-session');

  assert.throws(() => storage.removeItem('sb-test-auth-token'), /Could not remove persisted auth data/);
  assert.equal(values.get('sb-test-auth-token'), 'persisted-session');
  failRemoval = false;
  assert.doesNotThrow(() => storage.removeItem('sb-test-auth-token'));
  assert.equal(values.has('sb-test-auth-token'), false);
  assert.equal(createSessionAuthStorage(getStorage).getItem('sb-test-auth-token'), null);
});
