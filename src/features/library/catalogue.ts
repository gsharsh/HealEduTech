import { supabase } from '../../lib/supabase';
import { isValidBookId } from './libraryState';
import { CatalogueCoverSaveError } from './catalogueErrors';
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
export async function listBooks(page: number, signal: AbortSignal, query = '', topic: CatalogueBook['topic'] | 'all' = 'all') {
  if (!supabase) throw new Error('Database is not configured');
  const columns = 'id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url,created_at';
  const trimmedQuery = query.trim();
  async function fetchPage(requestedPage: number) {
    let request = trimmedQuery
      ? supabase!.rpc('search_books', { p_query: trimmedQuery }, { count: 'exact' }).select(columns)
      : supabase!.from('books').select(columns, { count: 'exact' });
    if (topic !== 'all') request = request.eq('topic', topic);
    return request.order('created_at', { ascending: false }).order('id')
      .range(requestedPage * 24, requestedPage * 24 + 23).abortSignal(signal);
  }
  let response = await fetchPage(page);
  if (page > 0 && response.error?.code === 'PGRST103' && !signal.aborted) response = await fetchPage(0);
  const { data, error, count } = response;
  if (error) throw error;
  const books = ((data ?? []) as unknown as Omit<CatalogueBook, 'book_copies' | 'available_copies'>[])
    .map(book => ({ ...book, book_copies: [] })) as CatalogueBook[];
  if (books.length) {
    const availability = await supabase.from('book_availability')
      .select('book_id,total_copies,available_copies').in('book_id', books.map(book => book.id)).abortSignal(signal);
    // Older deployments can still browse books while the circulation migration awaits release.
    if (!availability.error) {
      const counts = new Map(availability.data.map(row => [row.book_id, { total: row.total_copies as number, available: row.available_copies as number }]));
      books.forEach(book => {
        const count = counts.get(book.id);
        if (typeof count?.available === 'number') book.available_copies = count.available;
        if (typeof count?.total === 'number') book.book_copies = [{ count: count.total }];
      });
    }
  }
  return { books, total: count ?? 0 };
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
  if (!supabase) throw new Error('Database is not configured');
  let request = supabase.from('books')
    .select('id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url')
    .eq('id', bookId);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await addAvailability([{ ...data, book_copies: [] } as CatalogueBook], signal))[0];
}

export async function listRelatedBooks(book: CatalogueBook, signal?: AbortSignal): Promise<CatalogueBook[]> {
  if (!supabase) throw new Error('Database is not configured');
  let request = supabase.from('books')
    .select('id,title_en,title_vi,author,language,topic,description_en,description_vi,cover_url')
    .eq('topic', book.topic).neq('id', book.id).order('title_en').limit(3);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return addAvailability((data ?? []).map(item => ({ ...item, book_copies: [] })) as CatalogueBook[], signal);
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
  try { await updateBookCover(id, book.cover_url); }
  catch (error) { throw new CatalogueCoverSaveError(id, error); }
  return data as string;
}

async function updateBookCover(id: string, coverUrl: string) {
  if (!supabase) throw new Error('Database is not configured');
  const { error } = await supabase.rpc('update_book_cover', { p_id: id, p_cover_url: coverUrl.trim() });
  if (error) throw error;
}
