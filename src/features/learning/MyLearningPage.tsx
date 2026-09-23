import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books, type DemoBook } from '../../demo/catalogue';
import { useDemo } from '../../demo/context';
import { BookCard, BookCover } from '../../components/ui/BookCard';
import { BookDialog } from '../../components/ui/BookDialog';
export function MyLearningPage() {
  const { t, i18n } = useTranslation();
  const { reading, goalDone, toggleGoal } = useDemo();
  const [selected, setSelected] = useState<DemoBook | null>(null);
  const current = books.find(book => reading[book.id] === 'reading');
  const finished = books.filter(book => reading[book.id] === 'finished');
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('myLearning')}</span>
        <h1>{t('homeTitle')}</h1>
        <p>{t('homeBody')}</p>
      </div>
      <span className="welcome-mark" aria-hidden="true">✳</span>
    </div>
    <div className="learning-grid">
      <section className="continue-panel">
        <div className="continue-copy">
          <span className="eyebrow">{t(current ? 'continueReading' : 'nextChapter')}</span>
          <h2>{current ? current.title[i18n.language === 'vi' ? 'vi' : 'en'] : t('findBook')}</h2>
          <p>{t('atYourPace')}</p>{current ? <button className="primary" onClick={() => setSelected(current)}>{t('openReading')} <span aria-hidden="true">→</span>
          </button> : <Link className="primary" to="/library">{t('library')} →</Link>}<span className="quiet-note">{t('physicalReading')}</span>
        </div>{current && <div className="featured-cover">
          <BookCover book={current} />
        </div>}</section>
      <section className="goal-panel">
        <div className="section-kicker">
          <span>{t('thisWeek')}</span>
          <span aria-hidden="true">◷</span>
        </div>
        <h2>{t('oneSmallDiscovery')}</h2>
        <p>{t('goalBody')}</p>
        <label className={`goal-check ${goalDone ? 'is-done' : ''}`}>
          <input type="checkbox" checked={goalDone} onChange={toggleGoal} />
          <span>{t('goalTask')}</span>
        </label>
        <p className="goal-result" role="status">{t(goalDone ? 'goalDone' : 'goalEncourage')}</p>
      </section>
    </div>
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h2>{t('shelfTitle')}</h2>
          <p>{t('educatorPicks')}</p>
        </div>
        <Link className="text-link" to="/library">{t('allBooks')} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="book-grid">{books.slice(1, 5).map(book => <BookCard book={book} key={book.id} onOpen={setSelected} />)}</div>
    </section>
    <section className="reading-summary">
      <div className="summary-icon" aria-hidden="true">✓</div>
      <div>
        <h2>{t('yourJourney')}</h2>
        <p>{t('finishedCount', { count: finished.length })} {t('noRush')}</p>
      </div>
      <Link className="text-link" to="/learning">{t('myReading')} →</Link>
    </section>{selected && <BookDialog book={selected} onClose={() => setSelected(null)} />}</>;
}
