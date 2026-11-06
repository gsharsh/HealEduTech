import { listBooksForReading, listMyReading, type ReadingBook, type ReadingRecord } from '../learning/reading';
import { deduplicateRecords, summarizeReadingRecords } from './accountSummaryLogic';

export { deduplicateRecords, summarizeReadingRecords } from './accountSummaryLogic';

export type { AccountReadingSummary } from './accountSummaryLogic';

/** Account and My Reading share the same complete, bounded data access. */
export async function listAllMyReading(userId: string, signal?: AbortSignal): Promise<ReadingRecord[]> {
  return deduplicateRecords(await listMyReading(userId, signal));
}

export async function listBooksForAccountReading(bookIds: string[], signal?: AbortSignal): Promise<ReadingBook[]> {
  return listBooksForReading(bookIds, signal);
}

export async function loadAccountReading(userId: string, signal?: AbortSignal) {
  const records = await listAllMyReading(userId, signal);
  const summary = summarizeReadingRecords(records);
  const books = await listBooksForAccountReading(summary.records.map(record => record.book_id), signal);
  return { ...summary, books };
}
