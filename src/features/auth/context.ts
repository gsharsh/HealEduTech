import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AccountState {
  user: User | null;
  loading: boolean;
  recovery: boolean;
  clearRecovery: () => void;
  canManageBooks: boolean;
  staffRole: 'librarian' | 'administrator' | null;
}
export const AccountContext = createContext<AccountState>({
  user: null,
  loading: true,
  recovery: false,
  clearRecovery: () => {},
  canManageBooks: false,
  staffRole: null,
});
export function useAccount() { return useContext(AccountContext); }
