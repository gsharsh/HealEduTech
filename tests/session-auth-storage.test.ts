import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionAuthStorage, createTabScopedAuthStorage } from '../src/lib/sessionAuthStorage.ts';

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

test('page-specific auth namespaces preserve the existing tab session across reloads', () => {
  const stableKey = 'sb-example-auth-token';
  const values = new Map<string, string>([[stableKey, 'existing-tab-session']]);
  const getStorage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  const firstPage = createTabScopedAuthStorage('https://example.supabase.co', getStorage);
  const nextPage = createTabScopedAuthStorage('https://example.supabase.co', getStorage);
  assert.notEqual(firstPage.storageKey, nextPage.storageKey);
  assert.equal(firstPage.storage.getItem(firstPage.storageKey), 'existing-tab-session');
  firstPage.storage.setItem(firstPage.storageKey, 'refreshed-session');
  assert.equal(nextPage.storage.getItem(nextPage.storageKey), 'refreshed-session');
  assert.deepEqual([...values.keys()], [stableKey]);
  nextPage.storage.removeItem(nextPage.storageKey);
  assert.equal(firstPage.storage.getItem(firstPage.storageKey), null);
});

test('PKCE callback state and separate user storage survive a new page namespace and clear correctly', () => {
  const stableKey = 'sb-example-auth-token';
  const values = new Map<string, string>();
  const getStorage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  const firstPage = createTabScopedAuthStorage('https://example.supabase.co', getStorage);
  const callbackPage = createTabScopedAuthStorage('https://example.supabase.co', getStorage);
  const suffixes = ['-code-verifier', '-flows-code-verifier', '-flow-0123456789abcdef-code-verifier', '-user'];
  for (const suffix of suffixes) {
    firstPage.storage.setItem(`${firstPage.storageKey}${suffix}`, `synthetic${suffix}`);
    assert.equal(values.get(`${stableKey}${suffix}`), `synthetic${suffix}`);
    assert.equal(callbackPage.storage.getItem(`${callbackPage.storageKey}${suffix}`), `synthetic${suffix}`);
    callbackPage.storage.removeItem(`${callbackPage.storageKey}${suffix}`);
    assert.equal(values.has(`${stableKey}${suffix}`), false);
  }
  assert.equal(values.size, 0);
});

test('tab namespaces isolate page memory when sessionStorage is denied', () => {
  const denied = () => { throw new DOMException('blocked', 'SecurityError'); };
  const firstTab = createTabScopedAuthStorage('https://example.supabase.co', denied);
  const otherTab = createTabScopedAuthStorage('https://example.supabase.co', denied);
  firstTab.storage.setItem(firstTab.storageKey, 'synthetic-A-session');
  otherTab.storage.setItem(otherTab.storageKey, 'synthetic-B-session');
  assert.equal(firstTab.storage.getItem(firstTab.storageKey), 'synthetic-A-session');
  assert.equal(otherTab.storage.getItem(otherTab.storageKey), 'synthetic-B-session');
  firstTab.storage.removeItem(firstTab.storageKey);
  assert.equal(firstTab.storage.getItem(firstTab.storageKey), null);
  assert.equal(otherTab.storage.getItem(otherTab.storageKey), 'synthetic-B-session');
});
