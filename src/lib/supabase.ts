import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./env";
import { buildAuthRedirectUrl } from "../features/auth/validation";
import { createTabScopedAuthStorage } from "./sessionAuthStorage";

const env = getPublicEnv();

export const supabase = env
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
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
