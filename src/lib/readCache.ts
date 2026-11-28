type Loader<T> = (signal: AbortSignal) => Promise<T>;
type Entry<T> = {
  controller: AbortController;
  promise: Promise<T>;
  readers: number;
  settled: boolean;
  expiresAt: number;
};

function aborted(signal?: AbortSignal) {
  return signal?.reason ?? new DOMException('The read was cancelled.', 'AbortError');
}

/**
 * Bounded, page-memory cache for public reads. Each caller owns its cancellation;
 * cancelling one reader must not cancel another reader's shared network work.
 * Callers must not put private/account data in a globally shared instance.
 */
export function createReadCache<T>({
  ttlMs, maxEntries, now = Date.now, cacheable = () => true, clone = (value: T) => value,
}: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
  cacheable?: (value: T) => boolean;
  clone?: (value: T) => T;
}) {
  if (!Number.isFinite(ttlMs) || ttlMs < 0 || !Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error('Read cache requires a non-negative TTL and positive capacity.');
  }
  const entries = new Map<string, Entry<T>>();
  let generation = 0;

  function remove(key: string, entry: Entry<T>) {
    if (entries.get(key) === entry) entries.delete(key);
  }

  function read(key: string, load: Loader<T>, signal?: AbortSignal, { fresh = false }: { fresh?: boolean } = {}): Promise<T> {
    if (signal?.aborted) return Promise.reject(aborted(signal));
    let entry = entries.get(key);
    if (entry?.settled && (fresh || entry.expiresAt <= now())) {
      entries.delete(key);
      entry = undefined;
    }
    if (!entry) {
      // Expired/least-recently-used completed reads go first. A saturated cache
      // can still perform an uncached read without retaining unbounded keys.
      for (const [storedKey, candidate] of entries) {
        if (candidate.settled && (candidate.expiresAt <= now() || entries.size >= maxEntries)) entries.delete(storedKey);
      }
      const controller = new AbortController();
      const startedGeneration = generation;
      const created: Entry<T> = { controller, promise: undefined!, readers: 0, settled: false, expiresAt: 0 };
      if (entries.size < maxEntries) entries.set(key, created);
      created.promise = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw aborted(controller.signal);
        return load(controller.signal);
      }).then(value => {
        if (controller.signal.aborted || startedGeneration !== generation) throw aborted(controller.signal);
        created.settled = true;
        created.expiresAt = now() + ttlMs;
        if (!cacheable(value)) remove(key, created);
        return value;
      }).catch(error => {
        created.settled = true;
        remove(key, created);
        throw error;
      });
      entry = created;
    } else {
      // Map iteration order provides a small LRU without an additional index.
      entries.delete(key);
      entries.set(key, entry);
    }

    const current = entry;
    current.readers += 1;
    return new Promise<T>((resolve, reject) => {
      let finished = false;
      const finish = () => {
        if (finished) return false;
        finished = true;
        signal?.removeEventListener('abort', onAbort);
        current.readers -= 1;
        if (!current.settled && current.readers === 0) {
          remove(key, current);
          current.controller.abort();
        }
        return true;
      };
      const onAbort = () => { if (finish()) reject(aborted(signal)); };
      signal?.addEventListener('abort', onAbort, { once: true });
      current.promise.then(value => {
        if (!finish()) return;
        try { resolve(clone(value)); } catch (error) { reject(error); }
      }, error => { if (finish()) reject(error); });
      // A signal can be aborted by synchronous caller code during setup.
      if (signal?.aborted) onAbort();
    });
  }

  function clear() {
    generation += 1;
    for (const entry of entries.values()) if (!entry.settled) entry.controller.abort();
    entries.clear();
  }

  return { read, clear };
}

/** Collapse incidental focus/visibility bursts; explicit actions bypass this gate. */
export function createRefreshGate(intervalMs: number, now = Date.now) {
  let lastStarted = -Infinity;
  return (force = false) => {
    const time = now();
    if (!force && time - lastStarted < intervalMs) return false;
    lastStarted = time;
    return true;
  };
}
