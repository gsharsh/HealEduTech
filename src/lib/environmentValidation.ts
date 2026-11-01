/// <reference lib="dom" />

export interface PublicEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

type EnvironmentValues = Record<string, string | boolean | undefined>;

function publicKeyIsSafe(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch {
    return false;
  }
}

/** Validate before bundling: Vite public variables are shipped to every visitor. */
export function resolvePublicEnvironment(values: EnvironmentValues, production: boolean): PublicEnvironment | null {
  const appMode = String(values.VITE_APP_MODE ?? '').trim();
  if (appMode && appMode !== 'demo' && appMode !== 'live') {
    throw new Error('VITE_APP_MODE must be "live" or "demo".');
  }
  // An explicit demo must never pick up a developer's configured live backend.
  if (appMode === 'demo') return null;

  const supabaseUrl = String(values.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = String(values.VITE_SUPABASE_PUBLISHABLE_KEY || values.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl && !supabaseAnonKey && !production && appMode !== 'live') return null;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Live builds require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY). Use VITE_APP_MODE=demo only for an intentional demo.');
  }

  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid backend URL.');
  }
  const localDevelopment = !production && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('VITE_SUPABASE_URL must be an HTTPS origin (local HTTP is permitted only during development).');
  }
  if (!publicKeyIsSafe(supabaseAnonKey)) {
    throw new Error('Use a Supabase publishable key or legacy anon key in public Vite settings. Secret and service-role keys must never be included.');
  }
  return { supabaseUrl: url.origin, supabaseAnonKey };
}
