import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./env";

const env = getPublicEnv();

export const supabase = env
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        // Tab-scoped sessions reduce accidental account sharing on centre devices.
        persistSession: true,
        storage: window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function authRedirectUrl() {
  return new URL('/sign-in', window.location.origin).toString();
}

export function passwordResetRedirectUrl() {
  // Keep recovery on the existing allowlisted auth URL; the PASSWORD_RECOVERY
  // event switches the form into the new-password state after the link lands.
  return new URL('/sign-in?mode=recovery', window.location.origin).toString();
}
