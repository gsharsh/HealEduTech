import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CatalogueBookCard, CatalogueBookCover } from '../../components/ui/BookCard';
import { useAccount } from '../auth/context';
import { getMyReading, saveReading, type ReadingRecord } from '../learning/reading';
import { getBook, listRelatedBooks, type CatalogueBook } from './catalogue';
import { libraryTranslations } from './libraryTranslations';
import { libraryReturnPath } from './libraryState';
import './library.css';

type DetailState = {
  bookId: string;
  book: CatalogueBook | null;
  related: CatalogueBook[];
  loading: boolean;
  failed: boolean;
};

function BookReadingAction({ bookId, returnTo }: { bookId: string; returnTo: string }) {
  const { user, loading } = useAccount();
  const { i18n } = useTranslation();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  if (loading) return <p className="muted" role="status">{copy.readingLoading}</p>;
  if (!user) {
    const bookPath = `/library/${encodeURIComponent(bookId)}?${new URLSearchParams({ returnTo }).toString()}`;
    const signInQuery = new URLSearchParams({ next: bookPath });
    return <Link className="primary" to={`/sign-in?${signInQuery.toString()}`}>{copy.signInToAdd}</Link>;
  }
  return <SignedInReadingAction key={`${user.id}:${bookId}`} bookId={bookId} userId={user.id} />;
}

function SignedInReadingAction({ bookId, userId }: { bookId: string; userId: string }) {
  const { i18n } = useTranslation();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [record, setRecord] = useState<ReadingRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'adding' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getMyReading(userId, bookId).then(value => {
      if (active) { setRecord(value); setState('ready'); }
    }).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [attempt, bookId, userId]);

  async function addToReading() {
    if (state === 'adding') return;
    setState('adding');
    try {
      const saved = await saveReading(userId, { bookId, status: 'currently_reading' });
      setRecord(saved);
      setState('ready');
    } catch {
      setState('failed');
    }
  }

  if (state === 'loading') return <p className="muted" role="status">{copy.readingLoading}</p>;
  if (state === 'failed') return <div className="book-reading-error" role="alert"><p>{copy.readingSaveError}</p><button type="button" className="secondary" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>{copy.tryAgain}</button></div>;
  if (record) return <div className="book-reading-saved"><p role="status">{record.status === 'finished' ? copy.finishedRecord : copy.readingRecord}</p><Link className="secondary" to="/learning">{copy.openMyReading}</Link></div>;
  return <button type="button" className="primary" disabled={state === 'adding'} onClick={() => void addToReading()}>{state === 'adding' ? copy.addingToReading : copy.addToReading}</button>;
}

export function BookDetailPage() {
  const { bookId = '' } = useParams();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DetailState>({ bookId: '', book: null, related: [], loading: true, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    void getBook(bookId, controller.signal).then(async book => {
      const related = book ? await listRelatedBooks(book, controller.signal).catch(() => []) : [];
      if (!controller.signal.aborted) setState({ bookId, book, related, loading: false, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ bookId, book: null, related: [], loading: false, failed: true });
    });
    return () => controller.abort();
  }, [attempt, bookId]);

  if (state.loading || state.bookId !== bookId) return <p role="status">{t('catalogue.loading')}</p>;
  if (state.failed) return <section className="empty-state" role="alert"><h1>{t('catalogue.loadError')}</h1><button className="secondary" onClick={() => { setState(value => ({ ...value, loading: true, failed: false })); setAttempt(value => value + 1); }}>{t('catalogue.retry')}</button></section>;
  if (!state.book) return <section className="empty-state"><h1>{copy.notFoundTitle}</h1><p>{copy.notFoundBody}</p><Link className="secondary" to="/library">{copy.back}</Link></section>;

  const book = state.book;
  const title = i18n.language === 'vi' ? book.title_vi : book.title_en;
  const description = (i18n.language === 'vi' ? book.description_vi : book.description_en).trim() || copy.noDescription;
  const availability = book.available_copies === undefined ? copy.availabilityUnknown : copy.availableLabel(book.available_copies);
  const deskMessage = book.available_copies === 0 ? copy.noCopies : copy.borrowAtDesk;
  const returnTo = libraryReturnPath(new URLSearchParams(location.search).get('returnTo'));
  return <article className="book-detail-page">
    <Link className="book-detail-back" to={returnTo}>← {copy.back}</Link>
    <div className="book-detail-hero">
      <div className="book-detail-cover"><CatalogueBookCover book={book} title={title} size="detail" /></div>
      <div className="book-detail-copy">
        <span className="eyebrow">{t(`topics.${book.topic}`)}</span>
        <h1>{title}</h1>
        {book.author && <p className="book-detail-author">{book.author}</p>}
        <section aria-labelledby="synopsis-heading"><h2 id="synopsis-heading">{copy.synopsis}</h2><p>{description}</p></section>
        <section className="book-find-panel" aria-labelledby="find-heading">
          <h2 id="find-heading">{copy.availabilityTitle}</h2>
          <p className="availability">{availability}</p>
          <p>{deskMessage}</p>
          <p className="muted">{copy.borrowingPaused}</p>
          <p className="book-reading-prompt">{copy.readingPrompt}</p>
          <BookReadingAction bookId={book.id} returnTo={returnTo} />
        </section>
      </div>
    </div>
    <section className="book-facts" aria-labelledby="details-heading">
      <h2 id="details-heading">{copy.details}</h2>
      <dl>
        {book.author && <div><dt>{copy.author}</dt><dd>{book.author}</dd></div>}
        <div><dt>{copy.language}</dt><dd>{t(`catalogue.${book.language}`)}</dd></div>
        <div><dt>{copy.topic}</dt><dd>{t(`topics.${book.topic}`)}</dd></div>
        <div><dt>{copy.copies}</dt><dd>{book.book_copies[0]?.count ?? copy.copiesUnknown}</dd></div>
      </dl>
    </section>
    {state.related.length > 0 && <section className="related-books" aria-labelledby="related-heading">
      <div className="section-heading"><div><h2 id="related-heading">{copy.relatedTitle}</h2><p>{copy.relatedBody}</p></div></div>
      <div className="book-grid">{state.related.map(related => <CatalogueBookCard key={related.id} book={related} returnTo={returnTo} availabilityLabel={related.available_copies === undefined ? copy.availabilityUnknown : copy.availableLabel(related.available_copies)} />)}</div>
    </section>}
  </article>;
}
