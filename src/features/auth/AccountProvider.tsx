import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import i18n from '../../i18n';
import { AccountContext, type StaffRole } from './context';
import { recoveryTokenMatches } from './validation';

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
  const recoveryTokenRef = useRef<string | null>(null);
  const accessStatusRef = useRef(accessStatus);
  const mountedRef = useRef(true);
  const sessionGenerationRef = useRef(0);
  const staffRequestRef = useRef(0);

  const updateAccessStatus = useCallback((next: 'loading' | 'ready' | 'error') => {
    accessStatusRef.current = next;
    setAccessStatus(next);
  }, []);

  useEffect(() => {
    // React StrictMode replays effects: restore liveness on the second setup.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionGenerationRef.current += 1;
      staffRequestRef.current += 1;
    };
  }, []);

  const requestStaffAccess = useCallback(async (userId: string, blocking: boolean) => {
    const generation = sessionGenerationRef.current;
    const request = staffRequestRef.current + 1;
    staffRequestRef.current = request;
    if (blocking) updateAccessStatus('loading');
    try {
      const record = await loadStaffRecord(userId);
      if (!mountedRef.current || currentUserId.current !== userId || sessionGenerationRef.current !== generation || staffRequestRef.current !== request) return;
      setStaffRecord(record);
      updateAccessStatus('ready');
    } catch {
      if (!mountedRef.current || currentUserId.current !== userId || sessionGenerationRef.current !== generation || staffRequestRef.current !== request) return;
      // Clear permissions before exposing the error so guards fail closed.
      setStaffRecord(null);
      updateAccessStatus('error');
    }
  }, [updateAccessStatus]);

  const refreshStaffAccess = useCallback(async () => {
    const userId = currentUserId.current;
    if (!userId) {
      staffRequestRef.current += 1;
      setStaffRecord(null);
      updateAccessStatus('ready');
      return;
    }
    await requestStaffAccess(userId, accessStatusRef.current !== 'ready');
  }, [requestStaffAccess, updateAccessStatus]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // INITIAL_SESSION is emitted by the subscription, avoiding a competing getSession request.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      if (currentUserId.current !== nextUserId) {
        const preferredLanguage = nextUser?.user_metadata?.preferred_language;
        if (preferredLanguage === 'en' || preferredLanguage === 'vi') void i18n.changeLanguage(preferredLanguage);
        currentUserId.current = nextUserId;
        sessionGenerationRef.current += 1;
        staffRequestRef.current += 1;
        // Also invalidate/restart when auth events are batched and the
        // rendered user id does not visibly change (A -> B -> A).
        setStaffAccessRevision(value => value + 1);
        setStaffRecord(null);
        updateAccessStatus(nextUser ? 'loading' : 'ready');
      } else if (!nextUser) {
        // SIGNED_OUT can arrive more than once; invalidate any pending query.
        sessionGenerationRef.current += 1;
        staffRequestRef.current += 1;
        setStaffRecord(null);
        updateAccessStatus('ready');
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // These are background revalidations. Keep a ready route mounted until
        // the latest permission result is known.
        setStaffAccessRevision(value => value + 1);
      }
      setUser(nextUser);
      if (event === 'PASSWORD_RECOVERY') recoveryTokenRef.current = session?.access_token ?? null;
      if (event === 'SIGNED_OUT') recoveryTokenRef.current = null;
      if (event === 'PASSWORD_RECOVERY') rememberRecoveryToken(session?.access_token ?? null);
      if (event === 'SIGNED_OUT') rememberRecoveryToken(null);
      setRecovery(recoveryTokenMatches(session?.access_token ?? null, recoveryTokenRef.current, storedRecoveryToken()));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [updateAccessStatus]);

  const userId = user?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    void requestStaffAccess(userId, accessStatusRef.current !== 'ready');
  }, [userId, staffAccessRevision, requestStaffAccess]);

  useEffect(() => {
    if (!supabase || !userId) return;
    function refreshOnFocus() {
      // Focus checks must not unmount an in-progress form or draft.
      setStaffAccessRevision(value => value + 1);
    }
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [userId]);

  function clearRecovery() {
    recoveryTokenRef.current = null;
    rememberRecoveryToken(null);
    setRecovery(false);
  }

  const staffRole = user && staffRecord?.userId === user.id ? staffRecord.role : null;
  const accountRole = !user ? 'public' : staffRole ?? 'student';

  return <AccountContext.Provider value={{ user, loading, accessStatus, accountRole, recovery, clearRecovery, refreshStaffAccess, canManageBooks: !!staffRole, staffRole }}>
    {children}
  </AccountContext.Provider>;
}
