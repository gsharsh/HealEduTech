import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./env";
import { buildAuthRedirectUrl } from "../features/auth/validation";
import { createTabScopedAuthStorage } from "./sessionAuthStorage";
import { backendRequestTimeoutMs, createBackendFetch } from './backendRequestPolicy';

const env = getPublicEnv();

export const supabase = env
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      // Retry is explicit in each screen: no hidden retry storms or replay of
      // an operation whose acknowledgement was lost during a slow connection.
      db: { timeout: backendRequestTimeoutMs, retry: false },
      global: { fetch: createBackendFetch((input, init) => fetch(input, init)) },
      auth: {
        // Isolate SDK auth broadcasts as well as persisted sessions by tab.
        ...createTabScopedAuthStorage(env.supabaseUrl),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function authRedirectUrl(nextPath?: string | null) {
  return buildAuthRedirectUrl(window.location.origin, nextPath);
}

export function passwordResetRedirectUrl(nextPath?: string | null) {
  // Keep recovery on the existing allowlisted auth URL; the PASSWORD_RECOVERY
  // event switches the form into the new-password state after the link lands.
  return buildAuthRedirectUrl(window.location.origin, nextPath, 'recovery');
}
