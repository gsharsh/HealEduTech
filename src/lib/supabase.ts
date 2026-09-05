import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./env";

const env = getPublicEnv();

export const supabase = env
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
