import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books as demoBooks, type DemoBook, type Topic } from '../../demo/catalogue';
import { CatalogueBookCard } from '../../components/ui/BookCard';
import { listBooks, type CatalogueBook } from '../library/catalogue';
import { libraryTranslations } from '../library/libraryTranslations';
import { supabase } from '../../lib/supabase';
import { homeCopy, type HomeLanguage } from './homeCopy';
import './home.css';

const topics: Topic[] = ['nature', 'stories', 'science'];

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

function BookTrio({ language }: { language: HomeLanguage }) {
  const labels = homeCopy[language].topics;
  return (
    <div className="home-art" aria-label={homeCopy[language].artCaption}>
      <div className="home-book-trio" aria-hidden="true">
        {(['nature', 'science', 'stories'] as const).map(topic => <div key={topic} className={`home-trio-book home-trio-book--${topic}`}><i className="home-cover-mark"><i /><i /><i /></i><span>EVG</span><strong>{labels[topic]}</strong></div>)}
      </div>
      <span className="home-art-caption">{homeCopy[language].artCaption}</span>
    </div>
  );
}

export function HomePage() {
  const { i18n } = useTranslation();
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
          <h1>{copy.heroTitle}<br /><em>{copy.heroTitleAccent}</em></h1>
          <p>{copy.heroBody}</p>
          <div className="home-actions">
            <Link className="home-button home-button--primary" to="/library">{copy.browse}</Link>
            <Link className="home-button home-button--secondary" to="/start">{copy.guide}</Link>
          </div>
        </div>
        <BookTrio language={language} />
      </section>

      <section className="home-section home-topics" aria-labelledby="home-topics-title">
        <div className="home-section-heading"><div><span className="home-eyebrow">{copy.topicsKicker}</span><h2 id="home-topics-title">{copy.topicsTitle}</h2></div><Link to="/library">{copy.allTopics} <span aria-hidden="true">→</span></Link></div>
        <div className="home-topic-grid">
          {topics.map(topic => <Link key={topic} className={`home-topic home-topic--${topic}`} to={`/library?topic=${topic}`}><span className="home-topic-line" aria-hidden="true" /><strong>{copy.topics[topic]}</strong><span>{copy.topicDescription[topic]}</span><b aria-hidden="true">↗</b></Link>)}
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
