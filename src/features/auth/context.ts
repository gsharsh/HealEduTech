import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AccountState {
  user: User | null;
  loading: boolean;
  canManageBooks: boolean;
}
export const AccountContext = createContext<AccountState>({ user: null, loading: true, canManageBooks: false });
export function useAccount() { return useContext(AccountContext); }
