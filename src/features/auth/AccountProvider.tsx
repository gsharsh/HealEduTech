import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AccountContext } from './context';

const recoveryStorageKey = 'evg-auth-recovery-token';
type StaffRecord = { userId: string; role: 'librarian' | 'administrator' } | null;

function storedRecoveryToken() {
  try {
    return window.sessionStorage.getItem(recoveryStorageKey);
  } catch {
    return null;
  }
}

function rememberRecoveryToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(recoveryStorageKey, token);
    else window.sessionStorage.removeItem(recoveryStorageKey);
  } catch {
    // Session storage is best-effort; the live PASSWORD_RECOVERY event still works.
  }
}

async function loadStaffRecord(userId: string): Promise<StaffRecord> {
  const client = supabase;
  if (!client) return null;
  const { data, error } = await client.from('staff_members').select('user_id,role').eq('user_id', userId).maybeSingle();
  const role = data?.role;
  return !error && data && (role === 'librarian' || role === 'administrator') ? { userId, role } : null;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(false);
  const [staffRecord, setStaffRecord] = useState<StaffRecord>(null);

  const refreshStaffAccess = useCallback(async () => {
    if (!user) {
      setStaffRecord(null);
      return;
    }
    setStaffRecord(await loadStaffRecord(user.id));
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // INITIAL_SESSION is emitted by the subscription, avoiding a competing getSession request.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') rememberRecoveryToken(session?.access_token ?? null);
      if (event === 'SIGNED_OUT') rememberRecoveryToken(null);
      setRecovery(Boolean(session?.access_token && storedRecoveryToken() === session.access_token));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) {
      return;
    }
    let active = true;
    void loadStaffRecord(user.id)
      .then(record => {
        if (!active) return;
        setStaffRecord(record);
      });
    return () => { active = false; };
  }, [user]);

  function clearRecovery() {
    rememberRecoveryToken(null);
    setRecovery(false);
  }

  const staffRole = user && staffRecord?.userId === user.id ? staffRecord.role : null;

  return <AccountContext.Provider value={{ user, loading, recovery, clearRecovery, refreshStaffAccess, canManageBooks: !!staffRole, staffRole }}>
    {children}
  </AccountContext.Provider>;
}
