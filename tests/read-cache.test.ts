import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache, createRefreshGate } from '../src/lib/readCache.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('ten simultaneous public readers share one load and each receives a separate snapshot', async () => {
  const cache = createReadCache<{ count: number }>({ ttlMs: 15_000, maxEntries: 4, clone: structuredClone });
  const work = deferred<{ count: number }>();
  let calls = 0;
  const load = async () => { calls += 1; return work.promise; };
  const readers = Array.from({ length: 10 }, () => cache.read('catalogue', load));
  await Promise.resolve();
  assert.equal(calls, 1);
  work.resolve({ count: 6 });
  const snapshots = await Promise.all(readers);
  snapshots[0].count = 99;
  assert.equal(snapshots[1].count, 6);
  assert.deepEqual(await cache.read('catalogue', load), { count: 6 });
  assert.equal(calls, 1);
});

test('cancelling one subscriber leaves shared work alive for the other subscriber', async () => {
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 4 });
  const work = deferred<number>();
  const cancelled = new AbortController();
  let upstream!: AbortSignal;
  const load = (signal: AbortSignal) => { upstream = signal; return work.promise; };
  const first = cache.read('book', load, cancelled.signal);
  const second = cache.read('book', load);
  await Promise.resolve();
  cancelled.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(upstream.aborted, false);
  work.resolve(7);
  assert.equal(await second, 7);
});

test('cancelling the final subscriber aborts upstream and never poisons the next read', async () => {
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 4 });
  const work = deferred<number>();
  const cancelled = new AbortController();
  let upstream!: AbortSignal;
  const first = cache.read('book', signal => { upstream = signal; return work.promise; }, cancelled.signal);
  await Promise.resolve();
  cancelled.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(upstream.aborted, true);
  assert.equal(await cache.read('book', async () => 12), 12);
  work.resolve(3); // Deliberately uncooperative old loader resolves after cancellation.
  await Promise.resolve();
  assert.equal(await cache.read('book', async () => 999), 12);
});

test('already cancelled callers do not start any network work', async () => {
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 4 });
  const cancelled = new AbortController();
  cancelled.abort();
  let calls = 0;
  await assert.rejects(cache.read('book', async () => ++calls, cancelled.signal), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('TTL is measured from completion, expires exactly, and failed reads are retriable', async () => {
  let time = 0;
  let calls = 0;
  const cache = createReadCache<number>({ ttlMs: 15, maxEntries: 4, now: () => time });
  const load = async () => ++calls;
  assert.equal(await cache.read('book', load), 1);
  time = 14;
  assert.equal(await cache.read('book', load), 1);
  time = 15;
  assert.equal(await cache.read('book', load), 2);
  await assert.rejects(cache.read('failure', async () => { throw new Error('offline'); }), /offline/);
  assert.equal(await cache.read('failure', load), 3);
});

test('partial availability snapshots are delivered but not cached', async () => {
  let calls = 0;
  const cache = createReadCache<{ complete: boolean }>({ ttlMs: 100, maxEntries: 4, cacheable: result => result.complete });
  const load = async () => ({ complete: ++calls > 1 });
  assert.equal((await cache.read('book', load)).complete, false);
  assert.equal((await cache.read('book', load)).complete, true);
  await cache.read('book', load);
  assert.equal(calls, 2);
});

test('explicit freshness skips completed snapshots and still coalesces current network reads', async () => {
  let calls = 0;
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 4 });
  await cache.read('book', async () => ++calls);
  const work = deferred<number>();
  const load = async () => { calls += 1; return work.promise; };
  const first = cache.read('book', load, undefined, { fresh: true });
  const second = cache.read('book', load, undefined, { fresh: true });
  await Promise.resolve();
  assert.equal(calls, 2);
  work.resolve(2);
  assert.deepEqual(await Promise.all([first, second]), [2, 2]);
});

test('capacity evicts the least recently used completed key', async () => {
  let calls = 0;
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 2 });
  const load = async () => ++calls;
  await cache.read('a', load);
  await cache.read('b', load);
  assert.equal(await cache.read('a', load), 1);
  await cache.read('c', load);
  assert.equal(await cache.read('a', load), 1);
  assert.equal(await cache.read('b', load), 4);
});

test('mutation invalidation rejects stale flights without replacing the fresh cache', async () => {
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 2 });
  const work = deferred<number>();
  const old = cache.read('book', () => work.promise);
  await Promise.resolve();
  cache.clear();
  assert.equal(await cache.read('book', async () => 2), 2);
  work.resolve(1);
  await assert.rejects(old, { name: 'AbortError' });
  assert.equal(await cache.read('book', async () => 3), 2);
});

test('a saturated cache does not retain extra keys and still invalidates uncached flights', async () => {
  const cache = createReadCache<number>({ ttlMs: 100, maxEntries: 1 });
  const a = deferred<number>();
  const b = deferred<number>();
  const first = cache.read('a', () => a.promise);
  const overflow = cache.read('b', () => b.promise);
  await Promise.resolve();
  cache.clear();
  a.resolve(1);
  b.resolve(2);
  await assert.rejects(first, { name: 'AbortError' });
  await assert.rejects(overflow, { name: 'AbortError' });
  assert.equal(await cache.read('b', async () => 3), 3);
});

test('incidental focus bursts coalesce while explicit retry and mutation refresh stay immediate', () => {
  let time = 0;
  const gate = createRefreshGate(5_000, () => time);
  assert.equal(gate(true), true);
  for (let i = 0; i < 20; i++) assert.equal(gate(), false);
  time = 4_999;
  assert.equal(gate(), false);
  assert.equal(gate(true), true);
  time = 9_999;
  assert.equal(gate(), true);
  assert.equal(gate(), false);
});
