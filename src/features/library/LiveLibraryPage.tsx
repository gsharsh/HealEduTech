import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listBooks, type CatalogueBook } from './catalogue';
import { MyLoans } from '../circulation/MyLoans';
import { libraryTranslations } from './libraryTranslations';
import { CatalogueBookCard } from '../../components/ui/BookCard';
import './library.css';
export function LiveLibraryPage() {
  const { t, i18n } = useTranslation();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<'all' | CatalogueBook['topic']>('all');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ books: CatalogueBook[]; total: number; loading: boolean; failed: boolean }>({ books: [], total: 0, loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    void listBooks(page, controller.signal, query, topic).then(data => {
      if (!controller.signal.aborted) setResult({ ...data, loading: false, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ books: [], total: 0, loading: false, failed: true });
    });
    return () => controller.abort();
  }, [page, attempt, query, topic]);
  // Reset pagination with the filter interaction so this effect only fetches data.
  function changePage(next: number) { setResult(value => ({ ...value, loading: true })); setPage(next); }
  function changeQuery(next: string) { setResult(value => ({ ...value, loading: true })); setQuery(next); setPage(0); }
  function changeTopic(next: typeof topic) { setResult(value => ({ ...value, loading: true })); setTopic(next); setPage(0); }
  const hasFilters = query.trim().length > 0 || topic !== 'all';
  return <>
    <div className="page-heading"><div><span className="eyebrow">{t('library')}</span><h1>{t('libraryTitle')}</h1><p>{t('catalogue.body')}</p></div></div>
    <form className="library-filters" onSubmit={event => event.preventDefault()}>
      <label>{t('searchBooks')}<input type="search" value={query} onChange={event => changeQuery(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
      <label>{t('topic')}<select value={topic} onChange={event => changeTopic(event.target.value as typeof topic)}>{(['all', 'nature', 'stories', 'science'] as const).map(value => <option key={value} value={value}>{t(`topics.${value}`)}</option>)}</select></label>
      {(query || topic !== 'all') && <button type="button" className="secondary" onClick={() => { setResult(value => ({ ...value, loading: true })); setQuery(''); setTopic('all'); setPage(0); }}>{copy.clear}</button>}
    </form>
    {result.loading ? <p role="status">{t('catalogue.loading')}</p> : result.failed ? <div role="alert" className="empty-state">
      <p>{t('catalogue.loadError')}</p><button className="secondary" onClick={() => { setResult(value => ({ ...value, loading: true })); setAttempt(value => value + 1); }}>{t('catalogue.retry')}</button>
    </div> : <>
      {result.books.length > 0 && <p role="status">{t('results', { count: result.total })}</p>}
      {result.books.length === 0 && <div className="empty-state"><h2>{t(hasFilters ? 'catalogue.emptySearchTitle' : 'catalogue.emptyTitle')}</h2><p>{t(hasFilters ? 'catalogue.emptySearch' : 'catalogue.empty')}</p>
        {hasFilters ? <button type="button" className="secondary" onClick={() => { setResult(value => ({ ...value, loading: true })); setQuery(''); setTopic('all'); setPage(0); }}>{copy.clear}</button> : <Link className="secondary" to="/admin">{t('catalogue.addFirst')}</Link>}
      </div>}
      <div className="book-grid library-grid">{result.books.map(book => <CatalogueBookCard key={book.id} book={book} availabilityLabel={book.available_copies === undefined ? copy.availabilityUnknown : copy.availableLabel(book.available_copies)} />)}</div>
      {result.total > 24 && <div className="form-actions">
        <button className="secondary" disabled={page === 0} onClick={() => changePage(page - 1)}>{t('catalogue.previous')}</button>
        <span>{t('catalogue.page', { page: page + 1 })}</span>
        <button className="secondary" disabled={(page + 1) * 24 >= result.total} onClick={() => changePage(page + 1)}>{t('catalogue.next')}</button>
      </div>}
    </>}
    <MyLoans />
  </>;
}
