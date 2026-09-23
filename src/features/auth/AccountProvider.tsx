import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AccountContext, type StaffRole } from './context';

const recoveryStorageKey = 'evg-auth-recovery-token';
type StaffRecord = { userId: string; role: StaffRole } | null;

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
  if (error) throw error;
  const role = data?.role;
  return data && (role === 'librarian' || role === 'administrator') ? { userId, role } : null;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(false);
  const [staffRecord, setStaffRecord] = useState<StaffRecord>(null);
  const [accessStatus, setAccessStatus] = useState<'loading' | 'ready' | 'error'>(supabase ? 'loading' : 'ready');
  const [staffAccessRevision, setStaffAccessRevision] = useState(0);
  const currentUserId = useRef<string | null>(null);

  const refreshStaffAccess = useCallback(async () => {
    if (!user) {
      setStaffRecord(null);
      setAccessStatus('ready');
      return;
    }
    const userId = user.id;
    setAccessStatus('loading');
    try {
      const record = await loadStaffRecord(userId);
      if (currentUserId.current !== userId) return;
      setStaffRecord(record);
      setAccessStatus('ready');
    } catch {
      if (currentUserId.current !== userId) return;
      setStaffRecord(null);
      setAccessStatus('error');
    }
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // INITIAL_SESSION is emitted by the subscription, avoiding a competing getSession request.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      if (currentUserId.current !== nextUserId) {
        currentUserId.current = nextUserId;
        setStaffRecord(null);
        setAccessStatus(nextUser ? 'loading' : 'ready');
      } else if (!nextUser) {
        setAccessStatus('ready');
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setAccessStatus('loading');
        setStaffAccessRevision(value => value + 1);
      }
      setUser(nextUser);
      if (event === 'PASSWORD_RECOVERY') rememberRecoveryToken(session?.access_token ?? null);
      if (event === 'SIGNED_OUT') rememberRecoveryToken(null);
      setRecovery(Boolean(session?.access_token && storedRecoveryToken() === session.access_token));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    let active = true;
    void loadStaffRecord(userId)
      .then(record => {
        if (!active || currentUserId.current !== userId) return;
        setStaffRecord(record);
        setAccessStatus('ready');
      })
      .catch(() => {
        if (!active || currentUserId.current !== userId) return;
        setStaffRecord(null);
        setAccessStatus('error');
      });
    return () => { active = false; };
  }, [userId, staffAccessRevision]);

  useEffect(() => {
    if (!supabase || !userId) return;
    function refreshOnFocus() {
      setAccessStatus('loading');
      setStaffAccessRevision(value => value + 1);
    }
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [userId]);

  function clearRecovery() {
    rememberRecoveryToken(null);
    setRecovery(false);
  }

  const staffRole = user && staffRecord?.userId === user.id ? staffRecord.role : null;
  const accountRole = !user ? 'public' : staffRole ?? 'student';

  return <AccountContext.Provider value={{ user, loading, accessStatus, accountRole, recovery, clearRecovery, refreshStaffAccess, canManageBooks: !!staffRole, staffRole }}>
    {children}
  </AccountContext.Provider>;
}
