import type { Topic } from '../../demo/catalogue';

export const exploreTopics: Topic[] = ['nature', 'stories', 'science'];
export const RECENT_READING_LIMIT = 24;

export interface RecentExploreReading {
  book_id: string;
  status: 'currently_reading' | 'finished';
  updated_at: string;
  books: { title_en: string; title_vi: string; topic: Topic } | null;
}

export interface ExplorationCandidate {
  id: string;
  topic: Topic;
  language: 'en' | 'vi' | 'bilingual';
  title_en: string;
  available_copies?: number;
}

export function readExploreTopic(value: string | null): Topic | null {
  return exploreTopics.includes(value as Topic) ? value as Topic : null;
}

/** Explicit interests come first; a recent book gives newcomers a starting point. */
export function startingTopic(interests: Topic[], reading: RecentExploreReading[]): Topic {
  return interests.find(topic => exploreTopics.includes(topic)) ?? reading.find(row => row.books)?.books?.topic ?? 'nature';
}

export type RecommendationReason = 'interest-and-reading' | 'interest' | 'reading' | 'topic';

/** Small, deterministic topic matching. No text analysis or external AI service. */
export function recommendBooks<T extends ExplorationCandidate>(
  candidates: T[], topic: Topic, interests: Topic[], reading: RecentExploreReading[], language: 'en' | 'vi',
): { book: T; reason: RecommendationReason; recentBook: RecentExploreReading['books'] }[] {
  const alreadyReading = new Set(reading.map(row => row.book_id));
  const recentBook = reading.find(row => row.books?.topic === topic)?.books ?? null;
  const interested = interests.includes(topic);
  const reason: RecommendationReason = interested && recentBook ? 'interest-and-reading' : interested ? 'interest' : recentBook ? 'reading' : 'topic';
  const score = (book: T) => (book.language === language || book.language === 'bilingual' ? 2 : 0) + (typeof book.available_copies === 'number' && book.available_copies > 0 ? 1 : 0);
  const unique = new Map(candidates.filter(book => book.topic === topic && !alreadyReading.has(book.id)).map(book => [book.id, book]));
  return [...unique.values()]
    .sort((left, right) => score(right) - score(left) || left.title_en.localeCompare(right.title_en, 'en') || left.id.localeCompare(right.id))
    .slice(0, 3)
    .map(book => ({ book, reason, recentBook }));
}
