import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../auth/context';
import { useTranslation } from 'react-i18next';
import { listBooksForReading, listMyReading, saveReading, type ReadingBook, type ReadingRecord, type ReadingStatus } from './reading';
import { readingTranslations } from './readingTranslations';
import { getCoverImageSources } from '../library/coverImages';
import './reading.css';
import { requestFailureMessage } from '../../lib/requestFeedback';

type ReadingActionProps = { initialRecord: ReadingRecord; userId: string; onSaved: (record: ReadingRecord) => void };
// Verified public-domain cover for the seeded Peter Rabbit record:
// https://www.gutenberg.org/ebooks/14838
const PETER_RABBIT_BOOK_ID = '31000000-0000-4000-8000-000000000001';
const PETER_RABBIT_COVER_URL = 'https://www.gutenberg.org/cache/epub/14838/images/cover.jpg';

function ReadingCover({ book, title }: { book: ReadingBook | undefined; title: string }) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const coverUrl = book?.cover_url || (book?.id === PETER_RABBIT_BOOK_ID ? PETER_RABBIT_COVER_URL : null);
  const sources = coverUrl && failedCoverUrl !== coverUrl ? getCoverImageSources(coverUrl) : null;
  if (!sources) return <div className="reading-cover reading-cover--fallback" role="img" aria-label={title} />;
  return <img className="reading-cover" src={sources.src} srcSet={sources.srcSet} sizes="(max-width: 480px) 90px, 120px" loading="lazy" decoding="async" alt="" onError={() => setFailedCoverUrl(coverUrl)} />;
}

function ReadingEditor({ initialRecord, userId, onSaved }: ReadingActionProps) {
  const reflectionId = useId();
  const reviewBodyId = useId();
  const reviewPromptId = useId();
  const reviewCountId = useId();
  const { i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [record, setRecord] = useState(initialRecord);
  const [status, setStatus] = useState<ReadingStatus>(initialRecord.status);
  const [reflection, setReflection] = useState(initialRecord.reflection ?? '');
  const saveRequest = useRef(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => () => { saveRequest.current += 1; }, []);
  // Keep a finished review intact while the learner reopens a book. The editor
  // stays hidden during reading, but changing status must not erase saved thinking.
  const nextReflection = reflection.trim();
  const clean = record.status === status && (record.reflection ?? '') === nextReflection;
  async function save() {
    if (saving) return;
    const requestId = ++saveRequest.current;
    setSaving(true); setError(null);
    try {
      const saved = await saveReading(userId, { bookId: record.book_id, status, reflection: nextReflection });
      if (requestId !== saveRequest.current) return;
      setRecord(saved); setReflection(saved.reflection ?? ''); onSaved(saved);
    } catch (failure) { if (requestId === saveRequest.current) setError(failure); }
    finally { if (requestId === saveRequest.current) setSaving(false); }
  }
  return <div className="reading-action">
    <fieldset disabled={saving} className="reading-fields">
      <legend className="reading-private">{copy.private}</legend>
      <div className="reading-action-buttons">
        {status === 'currently_reading' ? <button type="button" className="secondary" onClick={() => { setStatus('finished'); setError(null); }}>{copy.markFinished}</button> : <button type="button" className="secondary" onClick={() => { setStatus('currently_reading'); setError(null); }}>{copy.stillReading}</button>}
      </div>
      {status === 'finished' && <div className="reading-review">
        <label className="reading-reflection-label" htmlFor={reflectionId}>{copy.review}</label>
        <p className="reading-action-muted" id={reviewBodyId}>{copy.reviewBody}</p>
        <p className="reading-review-prompt" id={reviewPromptId}>{copy.reviewPrompt}</p>
        <textarea id={reflectionId} aria-describedby={`${reviewBodyId} ${reviewPromptId} ${reviewCountId}`} value={reflection} maxLength={2000} onChange={event => { setReflection(event.target.value); setError(null); }} placeholder={copy.reflectionPlaceholder} />
        <p className="reading-character-count" id={reviewCountId}>{reflection.length.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-GB')} / {Number(2000).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-GB')} {copy.reviewCount}</p>
      </div>}
      <button type="button" className="primary reading-save" disabled={saving || clean} onClick={() => void save()}>{saving ? copy.saving : clean ? copy.saved : copy.saveChanges}</button>
      {!clean && <button type="button" className="secondary" onClick={() => { setStatus(record.status); setReflection(record.reflection ?? ''); setError(null); }}>{copy.cancelChanges}</button>}
      <span className="reading-save-state" role="status">{saving ? copy.saving : clean ? '' : copy.unsaved}</span>
    </fieldset>
    {error !== null && <p className="reading-error" role="alert">{requestFailureMessage(error, i18n.language, copy.saveError)}</p>}
  </div>;
}

export function LiveLearningPage() {
  const { user, loading } = useAccount();
  const { i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  if (loading) return <p role="status">{copy.loading}</p>;
  if (!user) return <section className="signed-out-reading">
    <div className="signed-out-reading__content">
      <h1>{copy.signedOutTitle}</h1>
      <p>{copy.signInBody}</p>
      <div className="signed-out-reading__actions">
        <Link className="primary" to="/sign-in?next=/learning">{copy.signIn}</Link>
        <Link className="secondary" to="/library">{copy.start}</Link>
      </div>
    </div>
  </section>;
  return <ReadingHistory key={user.id} userId={user.id} />;
}
function ReadingHistory({ userId }: { userId: string }) {
  const { i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void listMyReading(userId, controller.signal).then(async reading => {
      const catalogue = await listBooksForReading(reading.map(item => item.book_id), controller.signal);
      if (!controller.signal.aborted) { setRecords(reading); setBooks(catalogue); setLoading(false); }
    }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setLoading(false); } });
    return () => controller.abort();
  }, [attempt, userId]);
  const bookById = useMemo(() => new Map(books.map(book => [book.id, book])), [books]);
  return <section className="reading-page">
    <div className="page-heading"><div><h1>{copy.title}</h1><p>{copy.intro}</p></div><Link className="secondary" to="/library">{copy.start}</Link></div>
    <div className="reading-dashboard">
      {loading ? <div className="reading-empty" role="status"><p>{copy.loading}</p></div> : failed ? <div className="reading-empty" role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={() => { setFailed(false); setLoading(true); setAttempt(value => value + 1); }}>{copy.retry}</button></div> : records.length === 0 ? <div className="reading-empty"><h2>{copy.emptyTitle}</h2><p>{copy.empty}</p><Link className="secondary" to="/library">{copy.start}</Link></div> : records.map(record => {
        const book = bookById.get(record.book_id);
        const title = book ? (i18n.language === 'vi' ? book.title_vi : book.title_en) : copy.unavailableBook;
        return <article className="reading-card" key={record.book_id}>
          <span className="eyebrow">{record.status === 'finished' ? copy.finished : copy.reading}</span>
          <div className="reading-book">
            <ReadingCover book={book} title={title} />
            <div className="reading-book-copy"><h2>{book ? <Link to={`/library/${encodeURIComponent(record.book_id)}`}>{title}</Link> : title}</h2>{book?.author && <p className="reading-author">{book.author}</p>}{record.status === 'finished' && record.reflection && <p className="reading-reflection">“{record.reflection}”</p>}</div>
          </div>
          <ReadingEditor initialRecord={record} userId={userId} onSaved={saved => setRecords(current => current.map(item => item.book_id === saved.book_id ? saved : item))} />
        </article>;
      })}
    </div>
  </section>;
}
