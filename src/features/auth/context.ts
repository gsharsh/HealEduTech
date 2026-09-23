import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type StaffRole = 'librarian' | 'administrator';
export type AccountRole = 'public' | 'student' | StaffRole;
export type StaffAccessStatus = 'loading' | 'ready' | 'error';

export interface AccountState {
  user: User | null;
  loading: boolean;
  accessStatus: StaffAccessStatus;
  accountRole: AccountRole;
  recovery: boolean;
  clearRecovery: () => void;
  refreshStaffAccess: () => Promise<void>;
  canManageBooks: boolean;
  staffRole: StaffRole | null;
}
export const AccountContext = createContext<AccountState>({
  user: null,
  loading: true,
  accessStatus: 'loading',
  accountRole: 'public',
  recovery: false,
  clearRecovery: () => {},
  refreshStaffAccess: async () => {},
  canManageBooks: false,
  staffRole: null,
});
export function useAccount() { return useContext(AccountContext); }
