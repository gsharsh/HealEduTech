import { supabase } from '../../lib/supabase';
import { RECENT_READING_LIMIT, type RecentExploreReading } from './exploration';

/** One bounded, owner-scoped read. Private reflection text is deliberately omitted. */
export async function recentExploreReading(userId: string, signal: AbortSignal): Promise<RecentExploreReading[]> {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.from('reading_records')
    .select('book_id,status,updated_at,books(title_en,title_vi,topic)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false }).order('book_id')
    .limit(RECENT_READING_LIMIT).abortSignal(signal);
  if (error) throw error;
  return (data ?? []) as unknown as RecentExploreReading[];
}
