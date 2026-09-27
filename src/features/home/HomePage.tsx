import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books as demoBooks, type DemoBook, type Topic } from '../../demo/catalogue';
import { CatalogueBookCard } from '../../components/ui/BookCard';
import { listBooks, type CatalogueBook } from '../library/catalogue';
import { libraryTranslations } from '../library/libraryTranslations';
import { supabase } from '../../lib/supabase';
import { homeCopy, type HomeLanguage } from './homeCopy';
import './home.css';

const topics: Topic[] = ['nature', 'stories', 'science'];

function TopicIllustration({ topic }: { topic: Topic }) {
  if (topic === 'nature') {
    return <svg className="home-topic__illustration" viewBox="0 0 180 120" fill="none" aria-hidden="true">
      <path d="M88 105c-1-25 1-51 14-77" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M101 42C77 38 61 25 57 8c20 1 38 10 44 28M94 59c21-2 37-12 44-28-18-4-35 2-45 17M90 76C70 75 55 65 47 50c19-1 35 7 44 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39 104h101" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".45" />
      <circle cx="52" cy="91" r="4" fill="currentColor" opacity=".5" /><circle cx="133" cy="83" r="3" fill="currentColor" opacity=".45" />
    </svg>;
  }
  if (topic === 'stories') {
    return <svg className="home-topic__illustration" viewBox="0 0 180 120" fill="none" aria-hidden="true">
      <path d="M90 91c-17-12-34-14-54-9V35c20-5 37-2 54 10v46Z" fill="currentColor" opacity=".17" />
      <path d="M90 91c17-12 34-14 54-9V35c-20-5-37-2-54 10v46Z" fill="currentColor" opacity=".11" />
      <path d="M90 91c-17-12-34-14-54-9V35c20-5 37-2 54 10m0 55c17-12 34-14 54-9V35c-20-5-37-2-54 10m0 0v46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m126 15 2.5 6 6.5.5-5 4.2 1.6 6.3-5.6-3.5-5.6 3.5 1.6-6.3-5-4.2 6.5-.5 2.5-6Z" fill="currentColor" opacity=".75" />
      <path d="M47 54h28M47 64h25M105 54h28M105 64h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".45" />
    </svg>;
  }
  return <svg className="home-topic__illustration" viewBox="0 0 180 120" fill="none" aria-hidden="true">
    <ellipse cx="90" cy="60" rx="58" ry="24" stroke="currentColor" strokeWidth="2" opacity=".55" transform="rotate(-18 90 60)" />
    <ellipse cx="90" cy="60" rx="58" ry="24" stroke="currentColor" strokeWidth="2" opacity=".35" transform="rotate(42 90 60)" />
    <circle cx="90" cy="60" r="13" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="140" cy="44" r="5" fill="currentColor" /><circle cx="53" cy="76" r="4" fill="currentColor" opacity=".75" />
    <path d="M87 32v-8M87 96v-8M58 44l-6-5M120 84l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
  </svg>;
}

function DemoFeaturedCard({ book, language }: { book: DemoBook; language: HomeLanguage }) {
  return (
    <article className="home-demo-book">
      <Link to={`/library?topic=${book.topic}`} className="home-demo-book__link">
        <div className={`home-demo-cover ${book.color}`} aria-hidden="true">
          <span>EVG · {language === 'vi' ? 'sách ví dụ' : 'example book'}</span>
          <strong>{book.title[language]}</strong>
          <b>{book.symbol}</b>
        </div>
        <span className="home-book-meta">{homeCopy[language].topics[book.topic]} · {book.minutes} {language === 'vi' ? 'phút' : 'min'}</span>
        <span className="home-book-title">{book.title[language]}</span>
        <span className="home-text-link">{language === 'vi' ? 'Xem chủ đề' : 'Browse topic'} <span aria-hidden="true">↗</span></span>
      </Link>
    </article>
  );
}

export function HomePage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const language: HomeLanguage = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = homeCopy[language];
  const [result, setResult] = useState<{ books: CatalogueBook[]; loading: boolean; failed: boolean }>({ books: [], loading: Boolean(supabase), failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    const controller = new AbortController();
    void listBooks(0, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ books: data.books.slice(0, 4), loading: false, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ books: [], loading: false, failed: true });
    });
    return () => controller.abort();
  }, [attempt]);

  const availability = libraryTranslations[language];

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="home-eyebrow">{copy.kicker}</span>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <form className="home-search" role="search" onSubmit={event => {
            event.preventDefault();
            const query = search.trim();
            navigate(query ? `/library?${new URLSearchParams({ q: query })}` : '/library');
          }}>
            <label className="evg-sr-only" htmlFor="home-book-search">{copy.searchLabel}</label>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input id="home-book-search" type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} placeholder={copy.searchPlaceholder} />
            <button type="submit" className="home-button home-button--primary">{copy.searchAction}</button>
          </form>
          <div className="home-actions">
            <Link to="/library">{copy.browse} <span aria-hidden="true">→</span></Link>
            <Link to="/start">{copy.guide}</Link>
          </div>
        </div>
      </section>

      <section className="home-section home-topics" aria-labelledby="home-topics-title">
        <div className="home-section-heading"><div><h2 id="home-topics-title">{copy.topicsTitle}</h2></div><Link to="/library">{copy.allTopics} <span aria-hidden="true">→</span></Link></div>
        <div className="home-topic-grid">
          {topics.map(topic => <Link key={topic} className={`home-topic home-topic--${topic}`} to={`/library?topic=${topic}`}>
            <span className="home-topic__art"><TopicIllustration topic={topic} /></span>
            <span className="home-topic__content"><strong>{copy.topics[topic]}</strong><span>{copy.topicDescription[topic]}</span></span>
            <b aria-hidden="true">↗</b>
          </Link>)}
        </div>
      </section>

      <section className="home-section home-shelf" aria-labelledby="home-featured-title">
        <div className="home-section-heading"><div><span className="home-eyebrow">{supabase ? copy.featuredKicker : copy.demoLabel}</span><h2 id="home-featured-title">{copy.featuredTitle}</h2>{!supabase && <p className="home-section-note">{copy.demoBody}</p>}</div><Link to="/library">{copy.featuredAll} <span aria-hidden="true">→</span></Link></div>
        {supabase && result.loading && <p className="home-status" role="status">{copy.loading}</p>}
        {supabase && result.failed && <div className="home-status home-status--error" role="alert"><p>{copy.loadError}</p><button type="button" className="home-button home-button--secondary" onClick={() => { setResult({ books: [], loading: true, failed: false }); setAttempt(value => value + 1); }}>{copy.retry}</button></div>}
        {supabase && !result.loading && !result.failed && result.books.length === 0 && <div className="home-status"><h3>{copy.emptyTitle}</h3><p>{copy.emptyBody}</p><Link className="home-button home-button--secondary" to="/library">{copy.openLibrary}</Link></div>}
        {supabase && result.books.length > 0 && <div className="home-book-grid">{result.books.map(book => <CatalogueBookCard key={book.id} book={book} availabilityLabel={book.available_copies === undefined ? availability.availabilityUnknown : availability.availableLabel(book.available_copies)} />)}</div>}
        {!supabase && <div className="home-book-grid">{demoBooks.slice(0, 4).map(book => <DemoFeaturedCard key={book.id} book={book} language={language} />)}</div>}
      </section>
    </div>
  );
}

export function QuickGuidePage() {
  const { i18n } = useTranslation();
  const language: HomeLanguage = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = homeCopy[language];
  return <section className="home-guide">
    <span className="home-eyebrow">{language === 'vi' ? 'Hướng dẫn nhanh' : 'Quick guide'}</span>
    <h1>{language === 'vi' ? 'Bắt đầu bằng một câu hỏi nhỏ' : 'Start with a small question'}</h1>
    <p>{language === 'vi' ? 'Chọn một chủ đề rồi xem sách theo cách của em. Không cần tài khoản để xem sách.' : 'Pick a topic, then browse at your own pace. You do not need an account to browse.'}</p>
    <div className="home-guide-topics">{topics.map(topic => <Link key={topic} to={`/library?topic=${topic}`}><span className={`home-topic-dot home-topic-dot--${topic}`} aria-hidden="true" />{copy.topics[topic]}</Link>)}</div>
    <Link className="home-guide-skip" to="/library">{language === 'vi' ? 'Bỏ qua hướng dẫn' : 'Skip guide'} →</Link>
    <p className="home-guide-note">{language === 'vi' ? 'Muốn lưu sách và ghi chú riêng? ' : 'Want to save books and private notes? '}<Link to="/sign-in">{language === 'vi' ? 'Đăng nhập hoặc tạo tài khoản' : 'Sign in or create an account'}</Link>{language === 'vi' ? '. Em cần hộp thư email. Đăng xuất khi dùng xong thiết bị chung.' : '. You will need an email inbox. Sign out when you finish on a shared device.'}</p>
  </section>;
}

export default HomePage;
