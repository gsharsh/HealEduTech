type SessionStorageAccessor = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StorageNamespace = { sdkKey: string; persistedKey: string };

const browserSessionStorage: SessionStorageAccessor = () => window.sessionStorage;

/**
 * Keep Supabase auth tab-scoped when browser storage is available. If access is
 * denied, retain the session only in this page's memory; never use localStorage.
 */
export function createSessionAuthStorage(getStorage: SessionStorageAccessor = browserSessionStorage, namespace?: StorageNamespace) {
  const memory = new Map<string, string>();
  let memoryOnly = false;
  const knownPersistedKeys = new Set<string>();
  const persistedKey = (key: string) => namespace && (key === namespace.sdkKey || key.startsWith(`${namespace.sdkKey}-`))
    ? `${namespace.persistedKey}${key.slice(namespace.sdkKey.length)}`
    : key;

  return {
    getItem(sdkKey: string): string | null {
      const key = persistedKey(sdkKey);
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

    setItem(sdkKey: string, value: string): void {
      const key = persistedKey(sdkKey);
      memory.set(key, value);
      try {
        getStorage().setItem(key, value);
        knownPersistedKeys.add(key);
      } catch {
        memoryOnly = true;
        // Supabase can still use this session for the lifetime of the page.
      }
    },

    removeItem(sdkKey: string): void {
      const key = persistedKey(sdkKey);
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

/**
 * Supabase uses auth.storageKey for both storage and its BroadcastChannel.
 * Give each document its own SDK namespace, while retaining the existing
 * sessionStorage names across reloads and auth redirects. Map every suffix so
 * PKCE flow/verifier and separate-user entries follow the same tab lifetime.
 * A browser's Duplicate Tab action can still clone sessionStorage; it creates
 * another copy of that session, rather than an independently signed-in user.
 */
export function createTabScopedAuthStorage(
  supabaseUrl: string,
  getStorage: SessionStorageAccessor = browserSessionStorage,
  pageId: string = crypto.randomUUID(),
) {
  // This matches supabase-js's default, preserving existing signed-in tabs.
  const persistedKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const storageKey = `${persistedKey}:page:${pageId}`;
  return { storageKey, storage: createSessionAuthStorage(getStorage, { sdkKey: storageKey, persistedKey }) };
}
