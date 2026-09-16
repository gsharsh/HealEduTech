import { supabase } from '../../lib/supabase';
import { buildBookSearchFilter } from './search';
export interface CatalogueBook {
  id: string; title_en: string; title_vi: string; author: string;
  language: 'en' | 'vi' | 'bilingual'; topic: 'nature' | 'stories' | 'science';
  description_en: string; description_vi: string;
  book_copies: { count: number }[];
  available_copies?: number;
}
export interface NewBook {
  title_en: string; title_vi: string; author: string;
  language: CatalogueBook['language']; topic: CatalogueBook['topic'];
  description_en: string; description_vi: string; copies: number;
}
export async function listBooks(page: number, signal: AbortSignal, query = '', topic: CatalogueBook['topic'] | 'all' = 'all') {
  if (!supabase) throw new Error('Database is not configured');
  let request = supabase.from('books')
    .select('id,title_en,title_vi,author,language,topic,description_en,description_vi,book_copies(count)', { count: 'exact' });
  const searchFilter = buildBookSearchFilter(query);
  if (searchFilter) request = request.or(searchFilter);
  if (topic !== 'all') request = request.eq('topic', topic);
  const { data, error, count } = await request
    .order('created_at', { ascending: false }).order('id')
    .range(page * 24, page * 24 + 23).abortSignal(signal);
  if (error) throw error;
  const books = data as CatalogueBook[];
  if (books.length) {
    const availability = await supabase.from('book_availability')
      .select('book_id,available_copies').in('book_id', books.map(book => book.id)).abortSignal(signal);
    // Older deployments can still browse books while the circulation migration awaits release.
    if (!availability.error) {
      const counts = new Map(availability.data.map(row => [row.book_id, row.available_copies as number]));
      books.forEach(book => { book.available_copies = counts.get(book.id); });
    }
  }
  return { books, total: count ?? 0 };
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
  return data as string;
}
