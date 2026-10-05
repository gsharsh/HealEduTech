import { supabase } from '../../lib/supabase';
import { listBooksForReading, type ReadingBook, type ReadingRecord } from '../learning/reading';
import { deduplicateRecords, summarizeReadingRecords } from './accountSummaryLogic';

export { deduplicateRecords, summarizeReadingRecords } from './accountSummaryLogic';

const READING_PAGE_SIZE = 1000;
const BOOK_BATCH_SIZE = 100;

export type { AccountReadingSummary } from './accountSummaryLogic';

function requireClient() {
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

/** Fetch every row in stable pages so a large private reading history is not silently truncated. */
export async function listAllMyReading(userId: string, signal?: AbortSignal): Promise<ReadingRecord[]> {
  const client = requireClient();
  const records: ReadingRecord[] = [];
  let lastBookId = '';
  for (;;) {
    let request = client
      .from('reading_records')
      .select('book_id,status,reflection,updated_at')
      .eq('user_id', userId)
      .order('book_id', { ascending: true })
      .limit(READING_PAGE_SIZE);
    if (lastBookId) request = request.gt('book_id', lastBookId);
    const { data, error } = await request.abortSignal(signal ?? new AbortController().signal);
    if (error) throw error;
    const page = (data ?? []) as ReadingRecord[];
    records.push(...page);
    if (page.length < READING_PAGE_SIZE) return deduplicateRecords(records);
    const nextBookId = page.at(-1)?.book_id;
    if (!nextBookId || nextBookId === lastBookId) return deduplicateRecords(records);
    lastBookId = nextBookId;
  }
}

export async function listBooksForAccountReading(bookIds: string[], signal?: AbortSignal): Promise<ReadingBook[]> {
  const books: ReadingBook[] = [];
  for (let start = 0; start < bookIds.length; start += BOOK_BATCH_SIZE) {
    const batch = bookIds.slice(start, start + BOOK_BATCH_SIZE);
    books.push(...await listBooksForReading(batch, signal));
  }
  return books;
}

export async function loadAccountReading(userId: string, signal?: AbortSignal) {
  const records = await listAllMyReading(userId, signal);
  const summary = summarizeReadingRecords(records);
  const books = await listBooksForAccountReading(summary.records.map(record => record.book_id), signal);
  return { ...summary, books };
}
