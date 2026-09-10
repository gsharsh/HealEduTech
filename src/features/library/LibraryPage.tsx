import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books, type DemoBook, type Topic } from '../../demo/catalogue';
import { useDemo } from '../../demo/context';
import { BookCard } from '../../components/ui/BookCard';
import { BookDialog } from '../../components/ui/BookDialog';
export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const { reading, borrowed } = useDemo();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [params, setParams] = useSearchParams();
  const mine = params.get('view') === 'reading';
  const setMine = (value: boolean) => setParams(value ? { view: 'reading' } : {});
  const [selected, setSelected] = useState<DemoBook | null>(null);
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const matches = books.filter(book => (!mine || reading[book.id]) && (topic === 'all' || book.topic === topic) && normalize(`${book.title.en} ${book.title.vi}`).includes(normalize(query.trim())));
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('library')}</span>
        <h1>{t('libraryTitle')}</h1>
        <p>{t('libraryBody')}</p>
      </div>
    </div>
    <div className="library-toolbar">
      <label className="search-field">
        <span>{t('searchBooks')}</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} />
      </label>
      <label className="filter-field">{t('topic')}<select value={topic} onChange={event => setTopic(event.target.value as Topic | 'all')}>{['all', 'nature', 'stories', 'science'].map(key => <option key={key} value={key}>{t(`topics.${key}`)}</option>)}</select>
      </label>
    </div>
    <div className="library-tabs">
      <button className={!mine ? 'selected' : ''} aria-pressed={!mine} onClick={() => setMine(false)}>{t('allBooks')}</button>
      <button className={mine ? 'selected' : ''} aria-pressed={mine} onClick={() => setMine(true)}>{t('myReading')}</button>
    </div>
    <p className="muted" role="status">{t('results', { count: matches.length })}</p>
    <div className="book-grid library-grid">{matches.map(book => <div key={book.id}>
      <BookCard book={book} onOpen={setSelected} />{mine && <p className="reading-status">{t(reading[book.id] === 'finished' ? 'finished' : 'currentlyReading')}</p>}</div>)}</div>{matches.length === 0 && <div className="empty-state">
        <h2>{t('noBooks')}</h2>
        <p>{t('trySearch')}</p>
        <button className="secondary" onClick={() => { setQuery(''); setTopic('all'); setMine(false); }}>{t('clearFilters')}</button>
      </div>}<section className="loan-panel">
      <div>
        <span className="eyebrow">{t('myLoans')}</span>
        <h2>{t(borrowed ? 'oneBorrowed' : 'noBorrowed')}</h2>
        <p>{borrowed ? books[0].title[i18n.language === 'vi' ? 'vi' : 'en'] : t('askStaff')}</p>
      </div>
      <p className="muted">{t('loanNote')}</p>
    </section>{selected && <BookDialog book={selected} onClose={() => setSelected(null)} />}</>;
}
