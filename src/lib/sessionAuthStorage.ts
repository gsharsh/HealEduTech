type SessionStorageAccessor = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const browserSessionStorage: SessionStorageAccessor = () => window.sessionStorage;

/**
 * Keep Supabase auth tab-scoped when browser storage is available. If access is
 * denied, retain the session only in this page's memory; never use localStorage.
 */
export function createSessionAuthStorage(getStorage: SessionStorageAccessor = browserSessionStorage) {
  const memory = new Map<string, string>();
  let memoryOnly = false;
  const knownPersistedKeys = new Set<string>();

  return {
    getItem(key: string): string | null {
      if (memoryOnly) return memory.get(key) ?? null;
      try {
        const value = getStorage().getItem(key);
        if (value === null) {
          memory.delete(key);
          knownPersistedKeys.delete(key);
        } else {
          memory.set(key, value);
          knownPersistedKeys.add(key);
        }
        return value;
      } catch {
        memoryOnly = true;
        return memory.get(key) ?? null;
      }
    },

    setItem(key: string, value: string): void {
      memory.set(key, value);
      try {
        getStorage().setItem(key, value);
        knownPersistedKeys.add(key);
      } catch {
        memoryOnly = true;
        // Supabase can still use this session for the lifetime of the page.
      }
    },

    removeItem(key: string): void {
      memory.delete(key);
      try {
        getStorage().removeItem(key);
        knownPersistedKeys.delete(key);
      } catch {
        memoryOnly = true;
        if (knownPersistedKeys.has(key)) {
          throw new Error(`Could not remove persisted auth data for ${key}.`);
        }
        // Storage was unavailable from the start, so this session only lived in memory.
      }
    },
  };
}
