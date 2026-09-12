import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AccountContext } from './context';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [staffUserId, setStaffUserId] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // INITIAL_SESSION is emitted by the subscription, avoiding a competing getSession request.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
    void client.from('staff_members').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => { if (active) setStaffUserId(!error && data ? user.id : null); });
    return () => { active = false; };
  }, [user]);

  return <AccountContext.Provider value={{ user, loading, canManageBooks: !!user && staffUserId === user.id }}>
    {children}
  </AccountContext.Provider>;
}
