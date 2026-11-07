import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogueBookCard } from '../../components/ui/BookCard';
import { useAccount } from '../auth/context';
import { InterestPicker } from '../learning/InterestPicker';
import type { InterestTopic } from '../learning/reading';
import { listBooks, type CatalogueBook } from '../library/catalogue';
import { libraryTranslations } from '../library/libraryTranslations';
import { LearningJourney } from './LearningJourney';
import { recentExploreReading } from './exploreData';
import { exploreCopy } from './exploreCopy';
import { readExploreTopic, recommendBooks, startingTopic, type RecentExploreReading } from './exploration';
import '../learning/reading.css';

export function LiveExplorePage() {
  const { user } = useAccount();
  // Every identity owns its own state and request lifecycle. No private cache survives it.
  return <ExploreForIdentity key={user?.id ?? 'guest'} userId={user?.id} />;
}

function ExploreForIdentity({ userId }: { userId?: string }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = exploreCopy[locale];
  const libraryCopy = libraryTranslations[locale];
  const [params, setParams] = useSearchParams();
  const [interests, setInterests] = useState<InterestTopic[]>([]);
  const [interestsLoaded, setInterestsLoaded] = useState(!userId);
  const [interestsFailed, setInterestsFailed] = useState(false);
  const [reading, setReading] = useState<{ loaded: boolean; failed: boolean; records: RecentExploreReading[] }>({ loaded: !userId, failed: false, records: [] });
  const [readingAttempt, setReadingAttempt] = useState(0);
  const [bookAttempt, setBookAttempt] = useState(0);
  const [shelf, setShelf] = useState<{ topic: string; books: CatalogueBook[]; failed: boolean }>({ topic: '', books: [], failed: false });
  const onInterests = useCallback((values: InterestTopic[] | null) => {
    setInterests(values ?? []);
    setInterestsLoaded(true);
    setInterestsFailed(values === null);
  }, []);
  const topic = readExploreTopic(params.get('topic')) ?? startingTopic(interests, reading.records);
  const ready = interestsLoaded && reading.loaded;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void recentExploreReading(userId, controller.signal).then(records => {
      if (!controller.signal.aborted) setReading({ loaded: true, failed: false, records });
    }).catch(() => {
      if (!controller.signal.aborted) setReading({ loaded: true, failed: true, records: [] });
    });
    return () => controller.abort();
  }, [userId, readingAttempt]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    void listBooks(0, controller.signal, '', topic).then(value => {
      if (!controller.signal.aborted) setShelf({ topic, books: value.books, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setShelf({ topic, books: [], failed: true });
    });
    return () => controller.abort();
  }, [topic, ready, bookAttempt]);

  const recommendations = recommendBooks(shelf.books, topic, interests, reading.records, locale);
  const loading = !ready || shelf.topic !== topic;
  const books = <>
    {reading.failed && <div className="explore-reading-error"><p>{copy.readingError}</p><button className="text-button" type="button" onClick={() => { setReading({ loaded: false, failed: false, records: [] }); setReadingAttempt(value => value + 1); }}>{copy.retryReading}</button></div>}
    <div aria-busy={loading}>
      {loading ? <p className="explore-loading" role="status">{copy.loading}</p> : shelf.failed ? <div className="explore-empty" role="alert"><p>{copy.booksError}</p><button type="button" className="secondary" onClick={() => { setShelf({ topic: '', books: [], failed: false }); setBookAttempt(value => value + 1); }}>{copy.retryBooks}</button></div> : recommendations.length ? <div className="explore-book-grid">{recommendations.map(({ book, reason, recentBook }) => <div className="explore-book-suggestion" key={book.id}>
        <CatalogueBookCard headingLevel={3} book={book} returnTo={`/library?topic=${topic}`} availabilityLabel={book.available_copies === undefined ? libraryCopy.availabilityUnknown : libraryCopy.availableLabel(book.available_copies)} />
        {reason !== 'topic' && <p className="explore-reason">{copy.reasons[reason]}{recentBook && <small>{copy.connection}: {locale === 'vi' ? recentBook.title_vi : recentBook.title_en}</small>}</p>}
      </div>)}</div> : <div className="explore-empty"><h3>{copy.noBooks}</h3><p>{copy.noBooksBody}</p></div>}
    </div>
    {userId && <details className="explore-explanation"><summary>{copy.how}</summary><p>{copy.howBody}</p></details>}
  </>;

  return <LearningJourney topic={topic} onTopic={value => setParams(current => { const next = new URLSearchParams(current); next.set('topic', value); return next; }, { preventScrollReset: true })} books={books} preferencesLabel={userId ? copy.preferences : undefined} preferencesAttention={interestsFailed} preferences={userId
    ? <InterestPicker onLoaded={onInterests} onSaved={onInterests} />
    : <aside className="explore-account-note"><Link to={`/sign-in?${new URLSearchParams({ next: `/explore?topic=${topic}` }).toString()}`}>{copy.signIn}</Link><p>{copy.guestBody}</p></aside>} />;
}
