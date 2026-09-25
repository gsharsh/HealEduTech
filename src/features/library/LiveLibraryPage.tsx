import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listBooks, type CatalogueBook } from './catalogue';
import { MyLoans } from '../circulation/MyLoans';
import { libraryTranslations } from './libraryTranslations';
import { CatalogueBookCard } from '../../components/ui/BookCard';
import { useAccount } from '../auth/context';
import { readLibraryRouteState, writeLibraryRouteState } from './libraryState';
import './library.css';
export function LiveLibraryPage() {
  const { t, i18n } = useTranslation();
  const { staffRole } = useAccount();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { page, query, topic } = readLibraryRouteState(searchParams);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ books: CatalogueBook[]; total: number; loading: boolean; failed: boolean }>({ books: [], total: 0, loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    void listBooks(page, controller.signal, query, topic).then(data => {
      if (controller.signal.aborted) return;
      if (data.total > 0 && page * 24 >= data.total) {
        setSearchParams(writeLibraryRouteState({ page: Math.floor((data.total - 1) / 24), query, topic }), { replace: true });
        return;
      }
      setResult({ ...data, loading: false, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ books: [], total: 0, loading: false, failed: true });
    });
    return () => controller.abort();
  }, [page, attempt, query, topic, setSearchParams]);
  function updateRoute(next: { page?: number; query?: string; topic?: typeof topic }) {
    const nextParams = writeLibraryRouteState({
      page: next.page ?? page,
      query: next.query ?? query,
      topic: next.topic ?? topic,
    });
    if (nextParams.toString() === writeLibraryRouteState({ page, query, topic }).toString()) return;
    setResult(value => ({ ...value, loading: true }));
    setSearchParams(nextParams, { replace: true });
  }
  function changePage(next: number) { updateRoute({ page: next }); }
  function changeQuery(next: string) { updateRoute({ query: next, page: 0 }); }
  function changeTopic(next: typeof topic) { updateRoute({ topic: next, page: 0 }); }
  const hasFilters = query.trim().length > 0 || topic !== 'all';
  return <>
    <div className="page-heading"><div><span className="eyebrow">{t('library')}</span><h1>{t('libraryTitle')}</h1><p>{t('catalogue.body')}</p></div></div>
    <form className="library-filters" onSubmit={event => event.preventDefault()}>
      <label>{t('searchBooks')}<input type="search" maxLength={100} value={query} onChange={event => changeQuery(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
      <label>{t('topic')}<select value={topic} onChange={event => changeTopic(event.target.value as typeof topic)}>{(['all', 'nature', 'stories', 'science'] as const).map(value => <option key={value} value={value}>{t(`topics.${value}`)}</option>)}</select></label>
      {(query || topic !== 'all') && <button type="button" className="secondary" onClick={() => updateRoute({ query: '', topic: 'all', page: 0 })}>{copy.clear}</button>}
    </form>
    {result.loading ? <p role="status">{t('catalogue.loading')}</p> : result.failed ? <div role="alert" className="empty-state">
      <p>{t('catalogue.loadError')}</p><button className="secondary" onClick={() => { setResult(value => ({ ...value, loading: true })); setAttempt(value => value + 1); }}>{t('catalogue.retry')}</button>
    </div> : <>
      {result.books.length > 0 && <p role="status">{t('results', { count: result.total })}</p>}
      {result.books.length === 0 && <div className="empty-state"><h2>{t(hasFilters ? 'catalogue.emptySearchTitle' : 'catalogue.emptyTitle')}</h2><p>{t(hasFilters ? 'catalogue.emptySearch' : 'catalogue.empty')}</p>
        {hasFilters ? <button type="button" className="secondary" onClick={() => updateRoute({ query: '', topic: 'all', page: 0 })}>{copy.clear}</button> : staffRole ? <Link className="secondary" to="/staff/catalogue">{t('catalogue.addFirst')}</Link> : null}
      </div>}
      <div className="book-grid library-grid">{result.books.map(book => <CatalogueBookCard key={book.id} book={book} returnTo={`${location.pathname}${location.search}`} availabilityLabel={book.available_copies === undefined ? copy.availabilityUnknown : copy.availableLabel(book.available_copies)} />)}</div>
      {result.total > 24 && <div className="form-actions">
        <button className="secondary" disabled={page === 0} onClick={() => changePage(page - 1)}>{t('catalogue.previous')}</button>
        <span>{t('catalogue.page', { page: page + 1 })}</span>
        <button className="secondary" disabled={(page + 1) * 24 >= result.total} onClick={() => changePage(page + 1)}>{t('catalogue.next')}</button>
      </div>}
    </>}
    <MyLoans />
  </>;
}
