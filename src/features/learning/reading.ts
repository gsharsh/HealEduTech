import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type ReadingStatus = 'currently_reading' | 'finished';
export type InterestTopic = 'nature' | 'stories' | 'science';

export interface ReadingRecord {
  book_id: string;
  status: ReadingStatus;
  reflection: string | null;
  updated_at: string;
}

export interface ReadingRecordInput {
  bookId: string;
  status: ReadingStatus;
  reflection?: string;
}

export interface ReadingBook {
  id: string;
  title_en: string;
  title_vi: string;
  author: string | null;
  cover_url: string | null;
}

const MAX_REFLECTION_LENGTH = 2000;

function requireClient() {
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

function cleanReflection(value: string | undefined) {
  const reflection = (value ?? '').trim();
  if (reflection.length > MAX_REFLECTION_LENGTH) {
    throw new Error('Reflection is too long');
  }
  return reflection || null;
}

export async function listMyReading(userId: string, signal?: AbortSignal): Promise<ReadingRecord[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('reading_records')
    .select('book_id,status,reflection,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;
  return (data ?? []) as ReadingRecord[];
}

export async function getMyReading(userId: string, bookId: string): Promise<ReadingRecord | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('reading_records')
    .select('book_id,status,reflection,updated_at')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();
  if (error) throw error;
  return data as ReadingRecord | null;
}

export async function listBooksForReading(bookIds: string[], signal?: AbortSignal): Promise<ReadingBook[]> {
  if (bookIds.length === 0) return [];
  const client = requireClient();
  const { data, error } = await client.from('books').select('id,title_en,title_vi,author,cover_url').in('id', bookIds).abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;
  return (data ?? []) as ReadingBook[];
}

export async function saveReading(userId: string, input: ReadingRecordInput): Promise<ReadingRecord> {
  const client = requireClient();
  const { data, error } = await client
    .from('reading_records')
    .upsert({
      user_id: userId,
      book_id: input.bookId,
      status: input.status,
      reflection: cleanReflection(input.reflection),
    }, { onConflict: 'user_id,book_id' })
    .select('book_id,status,reflection,updated_at')
    .single();
  if (error) throw error;
  return data as ReadingRecord;
}

export async function listMyInterests(userId: string, signal?: AbortSignal): Promise<InterestTopic[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('learner_interests')
    .select('topic')
    .eq('user_id', userId)
    .order('topic')
    .abortSignal(signal ?? new AbortController().signal);
  if (error) throw error;
  return (data ?? []).map(row => row.topic as InterestTopic);
}

export async function replaceMyInterests(topics: InterestTopic[], client: SupabaseClient = requireClient()): Promise<InterestTopic[]> {
  const uniqueTopics = [...new Set(topics)];
  const { data, error } = await client.rpc('replace_my_interests', { p_topics: uniqueTopics });
  if (error) throw error;
  return (data ?? []).map((row: { topic: string }) => row.topic as InterestTopic);
}
