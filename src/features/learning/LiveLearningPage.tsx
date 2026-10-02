import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../auth/context';
import { useTranslation } from 'react-i18next';
import { getMyReading, listBooksForReading, listMyReading, saveReading, type ReadingBook, type ReadingRecord, type ReadingStatus } from './reading';
import { readingTranslations } from './readingTranslations';
import { WeeklyGoalPrototype } from './WeeklyGoalPrototype';
import { getCoverImageSources } from '../library/coverImages';
import './reading.css';

type ReadingActionProps = { bookId: string; onSaved?: (record: ReadingRecord) => void };
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

function ReadingAction(props: ReadingActionProps) {
  const { user, loading } = useAccount();
  const { i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  if (loading) return <p role="status">{copy.loading}</p>;
  if (!user) return <Link className="reading-action-link" to="/sign-in?next=/library">{copy.signIn}</Link>;
  return <ReadingEditor key={`${user.id}:${props.bookId}`} {...props} userId={user.id} />;
}

function ReadingEditor({ bookId, userId, onSaved }: ReadingActionProps & { userId: string }) {
  const reflectionId = useId();
  const reviewBodyId = useId();
  const reviewPromptId = useId();
  const reviewCountId = useId();
  const { i18n } = useTranslation();
  const copy = readingTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const [record, setRecord] = useState<ReadingRecord | null>(null);
  const [status, setStatus] = useState<ReadingStatus>('currently_reading');
  const [reflection, setReflection] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void getMyReading(userId, bookId).then(value => {
      if (!active) return;
      setRecord(value); setStatus(value?.status ?? 'currently_reading');
      setReflection(value?.reflection ?? ''); setLoadState('ready');
    }).catch(() => { if (active) setLoadState('failed'); });
    return () => { active = false; };
  }, [bookId, userId, attempt]);
  if (loadState === 'loading') return <p role="status">{copy.loading}</p>;
  if (loadState === 'failed') return <div role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={() => { setLoadState('loading'); setAttempt(value => value + 1); }}>{copy.retry}</button></div>;
  // Keep a finished review intact while the learner reopens a book. The editor
  // stays hidden during reading, but changing status must not erase saved thinking.
  const nextReflection = reflection.trim();
  const clean = record?.status === status && (record?.reflection ?? '') === nextReflection;
  async function save() {
    if (saving) return;
    setSaving(true); setError(false);
    try {
      const saved = await saveReading(userId, { bookId, status, reflection: nextReflection });
      setRecord(saved); setReflection(saved.reflection ?? ''); onSaved?.(saved);
    } catch { setError(true); }
    finally { setSaving(false); }
  }
  return <div className="reading-action">
    <fieldset disabled={saving} className="reading-fields">
      <legend className="reading-private">{copy.private}</legend>
      <div className="reading-action-buttons">
        {status === 'currently_reading' ? <button type="button" className="secondary" onClick={() => setStatus('finished')}>{copy.markFinished}</button> : <button type="button" className="secondary" onClick={() => setStatus('currently_reading')}>{copy.stillReading}</button>}
      </div>
      {status === 'finished' && <div className="reading-review">
        <label className="reading-reflection-label" htmlFor={reflectionId}>{copy.review}</label>
        <p className="reading-action-muted" id={reviewBodyId}>{copy.reviewBody}</p>
        <p className="reading-review-prompt" id={reviewPromptId}>{copy.reviewPrompt}</p>
        <textarea id={reflectionId} aria-describedby={`${reviewBodyId} ${reviewPromptId} ${reviewCountId}`} value={reflection} maxLength={2000} onChange={event => setReflection(event.target.value)} placeholder={copy.reflectionPlaceholder} />
        <p className="reading-character-count" id={reviewCountId}>{reflection.length.toLocaleString()} / 2,000 {copy.reviewCount}</p>
      </div>}
      <button type="button" className="primary reading-save" disabled={saving || clean} onClick={() => void save()}>{saving ? copy.saving : clean ? copy.saved : copy.saveChanges}</button>
    </fieldset>
    {error && <p className="reading-error" role="alert">{copy.saveError}</p>}
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
    <div className="page-heading"><div><h1>{copy.title}</h1><p>{copy.intro}</p></div></div>
    <div className="reading-dashboard">
      <WeeklyGoalPrototype />
      {loading ? <div className="reading-empty" role="status"><p>{copy.loading}</p></div> : failed ? <div className="reading-empty" role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={() => { setFailed(false); setLoading(true); setAttempt(value => value + 1); }}>{copy.retry}</button></div> : records.length === 0 ? <div className="reading-empty"><h2>{copy.emptyTitle}</h2><p>{copy.empty}</p><Link className="secondary" to="/library">{copy.start}</Link></div> : records.map(record => {
        const book = bookById.get(record.book_id);
        const title = book ? (i18n.language === 'vi' ? book.title_vi : book.title_en) : copy.unavailableBook;
        return <article className="reading-card" key={record.book_id}>
          <span className="eyebrow">{record.status === 'finished' ? copy.finished : copy.reading}</span>
          <div className="reading-book">
            <ReadingCover book={book} title={title} />
            <div className="reading-book-copy"><h2>{title}</h2>{book?.author && <p className="reading-author">{book.author}</p>}{record.status === 'finished' && record.reflection && <p className="reading-reflection">“{record.reflection}”</p>}</div>
          </div>
          <ReadingAction bookId={record.book_id} onSaved={saved => setRecords(current => current.map(item => item.book_id === saved.book_id ? saved : item))} />
        </article>;
      })}
    </div>
  </section>;
}
