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
