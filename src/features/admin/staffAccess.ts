import { supabase } from '../../lib/supabase';

export type StaffRole = 'librarian' | 'administrator';

export interface StaffAccessStatus {
  current_user_email: string | null;
  current_staff_role: StaffRole | null;
  has_administrator: boolean;
  can_claim_initial_admin: boolean;
}

export interface StaffMember {
  user_id: string;
  email: string;
  role: StaffRole;
  created_at: string;
  updated_at: string;
  granted_by: string | null;
  granted_by_email: string | null;
}

export async function getStaffAccessStatus() {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('staff_access_status').single();
  if (error) throw error;
  return data as StaffAccessStatus;
}

export async function claimInitialAdmin() {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('claim_initial_admin').single();
  if (error) throw error;
  return data as StaffMember;
}

export async function listStaffMembers() {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('list_staff_members');
  if (error) throw error;
  return data as StaffMember[];
}

export async function setStaffAccess(email: string, role: StaffRole) {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('set_staff_access', { p_email: email, p_role: role }).single();
  if (error) throw error;
  return data as StaffMember;
}

export async function revokeStaffAccess(email: string) {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('revoke_staff_access', { p_email: email }).single();
  if (error) throw error;
  return data as StaffMember;
}
