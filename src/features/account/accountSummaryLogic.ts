import type { ReadingRecord } from '../learning/reading';

export type AccountReadingSummary = {
  records: ReadingRecord[];
  finishedCount: number;
  currentCount: number;
  reviewCount: number;
};

export function deduplicateRecords(records: ReadingRecord[]) {
  const unique = new Map<string, ReadingRecord>();
  for (const record of records) {
    const current = unique.get(record.book_id);
    if (!current || isNewerRecord(record, current)) unique.set(record.book_id, record);
  }
  return [...unique.values()].sort((left, right) => {
    const updatedDifference = Date.parse(right.updated_at) - Date.parse(left.updated_at);
    return Number.isNaN(updatedDifference) || updatedDifference === 0 ? left.book_id.localeCompare(right.book_id) : updatedDifference;
  });
}

function isNewerRecord(candidate: ReadingRecord, current: ReadingRecord) {
  const candidateTime = Date.parse(candidate.updated_at);
  const currentTime = Date.parse(current.updated_at);
  if (Number.isNaN(candidateTime) || Number.isNaN(currentTime)) return Boolean(candidate.reflection?.trim()) && !current.reflection?.trim();
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return Boolean(candidate.reflection?.trim()) && !current.reflection?.trim();
}

export function summarizeReadingRecords(records: ReadingRecord[]): AccountReadingSummary {
  const uniqueRecords = deduplicateRecords(records);
  return {
    records: uniqueRecords,
    finishedCount: uniqueRecords.filter(record => record.status === 'finished').length,
    currentCount: uniqueRecords.filter(record => record.status === 'currently_reading').length,
    reviewCount: uniqueRecords.filter(record => Boolean(record.reflection?.trim())).length,
  };
}
