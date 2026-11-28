import { supabase } from '../../lib/supabase';
import { isValidBookId } from './libraryState';
import { CatalogueCoverSaveError } from './catalogueErrors';
import { createReadCache } from '../../lib/readCache';
export { CatalogueCoverSaveError } from './catalogueErrors';
export interface CatalogueBook {
  id: string; title_en: string; title_vi: string; author: string;
  language: 'en' | 'vi' | 'bilingual'; topic: 'nature' | 'stories' | 'science';
  description_en: string; description_vi: string;
  cover_url: string;
  book_copies: { count?: number }[];
  available_copies?: number;
}
export interface NewBook {
  title_en: string; title_vi: string; author: string;
  language: CatalogueBook['language']; topic: CatalogueBook['topic'];
  description_en: string; description_vi: string; cover_url: string; copies: number;
}
export interface BookUpdate extends Omit<NewBook, 'copies'> {
  totalCopies: number;
}
type CataloguePage = { books: CatalogueBook[]; total: number };
const hasAvailability = (book: CatalogueBook) => typeof book.available_copies === 'number' && typeof book.book_copies[0]?.count === 'number';
const cacheOptions = { ttlMs: 15_000, clone: <T,>(value: T): T => structuredClone(value) };
const pageCache = createReadCache<CataloguePage>({ ...cacheOptions, maxEntries: 24, cacheable: value => value.books.every(hasAvailability) });
const bookCache = createReadCache<CatalogueBook | null>({ ...cacheOptions, maxEntries: 48, cacheable: value => value !== null && hasAvailability(value) });
const relatedCache = createReadCache<CatalogueBook[]>({ ...cacheOptions, maxEntries: 24, cacheable: value => value.every(hasAvailability) });

/** Public snapshots only; mutations invalidate even when a later cover step fails. */
export function invalidateCatalogue() {
  pageCache.clear();
  bookCache.clear();
  relatedCache.clear();
}
if (typeof window !== 'undefined') {
  window.addEventListener('staff-data-changed', invalidateCatalogue);
  import.meta.hot?.dispose(() => window.removeEventListener('staff-data-changed', invalidateCatalogue));
}

export function listBooks(page: number, signal: AbortSignal, query = '', topic: CatalogueBook['topic'] | 'all' = 'all', options: { fresh?: boolean } = {}) {
  const requestedPage = Number.isInteger(page) && page >= 0 ? Math.min(page, 10_000) : 0;
  const trimmedQuery = query.trim().slice(0, 100);
  return pageCache.read(JSON.stringify([requestedPage, trimmedQuery, topic]), async sharedSignal => {
    if (!supabase) throw new Error('Database is not configured');
    const client = supabase;
    const columns = 'id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url,created_at';
    async function fetchPage(index: number) {
      let request = trimmedQuery
        ? client.rpc('search_books', { p_query: trimmedQuery }, { count: 'exact' }).select(columns)
        : client.from('books').select(columns, { count: 'exact' });
      if (topic !== 'all') request = request.eq('topic', topic);
      return request.order('created_at', { ascending: false }).order('id')
        .range(index * 24, index * 24 + 23).abortSignal(sharedSignal);
    }
    let response = await fetchPage(requestedPage);
    if (requestedPage > 0 && response.error?.code === 'PGRST103' && !sharedSignal.aborted) response = await fetchPage(0);
    const { data, error, count } = response;
    if (error) throw error;
    const books = ((data ?? []) as unknown as Omit<CatalogueBook, 'book_copies' | 'available_copies'>[])
      .map(book => ({ ...book, book_copies: [] })) as CatalogueBook[];
    await addAvailability(books, sharedSignal);
    return { books, total: count ?? 0 };
  }, signal, options);
}

async function addAvailability(books: CatalogueBook[], signal?: AbortSignal) {
  if (!supabase || books.length === 0) return books;
  const request = supabase.from('book_availability')
    .select('book_id,total_copies,available_copies').in('book_id', books.map(book => book.id));
  const availability = signal ? await request.abortSignal(signal) : await request;
  // Older deployments can still show catalogue details while circulation awaits release.
  if (!availability.error) {
    const counts = new Map(availability.data.map(row => [row.book_id, { total: row.total_copies as number, available: row.available_copies as number }]));
    books.forEach(book => {
      const count = counts.get(book.id);
      if (typeof count?.available === 'number') book.available_copies = count.available;
      if (typeof count?.total === 'number') book.book_copies = [{ count: count.total }];
    });
  }
  return books;
}

export async function getBook(bookId: string, signal?: AbortSignal): Promise<CatalogueBook | null> {
  if (!isValidBookId(bookId)) return null;
  return bookCache.read(bookId, async sharedSignal => {
    if (!supabase) throw new Error('Database is not configured');
    const { data, error } = await supabase.from('books')
      .select('id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url')
      .eq('id', bookId).abortSignal(sharedSignal).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (await addAvailability([{ ...data, book_copies: [] } as CatalogueBook], sharedSignal))[0];
  }, signal);
}

export function listRelatedBooks(book: CatalogueBook, signal?: AbortSignal): Promise<CatalogueBook[]> {
  return relatedCache.read(JSON.stringify([book.id, book.topic]), async sharedSignal => {
    if (!supabase) throw new Error('Database is not configured');
    const { data, error } = await supabase.from('books')
      .select('id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url')
      .eq('topic', book.topic).neq('id', book.id).order('title_en').limit(3).abortSignal(sharedSignal);
    if (error) throw error;
    return addAvailability((data ?? []).map(item => ({ ...item, book_copies: [] })) as CatalogueBook[], sharedSignal);
  }, signal);
}
export async function addBook(id: string, book: NewBook) {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('add_book_with_copies', {
    p_id: id, p_title_en: book.title_en.trim(), p_title_vi: book.title_vi.trim(),
    p_author: book.author.trim(), p_language: book.language, p_topic: book.topic,
    p_description_en: book.description_en.trim(), p_description_vi: book.description_vi.trim(),
    p_copy_count: book.copies,
  });
  if (error) throw error;
  invalidateCatalogue();
  if (book.cover_url.trim()) {
    try { await updateBookCover(id, book.cover_url); }
    catch (error) { throw new CatalogueCoverSaveError(id, error); }
  }
  return data as string;
}

export async function updateBook(id: string, book: BookUpdate) {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('set_book_copy_count', {
    p_id: id,
    p_title_en: book.title_en.trim(),
    p_title_vi: book.title_vi.trim(),
    p_author: book.author.trim(),
    p_language: book.language,
    p_topic: book.topic,
    p_description_en: book.description_en.trim(),
    p_description_vi: book.description_vi.trim(),
    p_total_copies: book.totalCopies,
  });
  if (error) throw error;
  invalidateCatalogue();
  try { await updateBookCover(id, book.cover_url); }
  catch (error) { throw new CatalogueCoverSaveError(id, error); }
  return data as string;
}

export async function removeUnusedBook(book: CatalogueBook): Promise<boolean> {
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase.rpc('remove_unused_catalogue_book', { p_book_id: book.id, p_expected: {
    title_en: book.title_en, title_vi: book.title_vi, author: book.author, language: book.language, topic: book.topic,
    description_en: book.description_en, description_vi: book.description_vi, cover_url: book.cover_url || '', total_copies: book.book_copies[0]?.count,
  } });
  if (error) throw error;
  invalidateCatalogue();
  return data === true;
}

async function updateBookCover(id: string, coverUrl: string) {
  if (!supabase) throw new Error('Database is not configured');
  const { error } = await supabase.rpc('update_book_cover', { p_id: id, p_cover_url: coverUrl.trim() });
  if (error) throw error;
  invalidateCatalogue();
}
