import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BookCard } from '../../components/ui/BookCard';
import { BookDialog } from '../../components/ui/BookDialog';
import { books as sampleBooks, type DemoBook } from '../../demo/catalogue';
import { useDemo } from '../../demo/context';
import { LearningJourney } from './LearningJourney';
import { exploreCopy } from './exploreCopy';
import { exploreTopics, readExploreTopic, recommendBooks, startingTopic, type RecentExploreReading } from './exploration';

export function ExplorePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const copy = exploreCopy[locale];
  const { interests, toggleInterest, reading } = useDemo();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<DemoBook | null>(null);
  const records: RecentExploreReading[] = Object.entries(reading).reverse().map(([id, status]) => {
    const book = sampleBooks.find(book => book.id === id);
    return { book_id: id, status: status === 'reading' ? 'currently_reading' : 'finished', updated_at: '', books: book ? { title_en: book.title.en, title_vi: book.title.vi, topic: book.topic } : null };
  });
  const topic = readExploreTopic(params.get('topic')) ?? startingTopic(interests, records);
  const recommendations = recommendBooks(sampleBooks.map(book => ({ ...book, language: 'bilingual' as const, title_en: book.title.en })), topic, interests, records, locale);
  return <><LearningJourney demo topic={topic} onTopic={value => setParams({ topic: value }, { preventScrollReset: true })} books={recommendations.length ? <div className="explore-book-grid">{recommendations.map(({ book, reason }) => <div className="explore-book-suggestion" key={book.id}><BookCard book={book} onOpen={setSelected} /><p className="explore-reason"><span>{copy.suggested}</span>{copy.reasons[reason]}</p></div>)}</div> : <div className="explore-empty"><h3>{copy.noBooks}</h3><p>{copy.noBooksBody}</p></div>} preferences={<section className="interests-panel">
    <h2>{t('yourInterests')}</h2><p>{copy.demoBody}</p><div className="interest-options" role="group" aria-label={t('yourInterests')}>{exploreTopics.map(item => <button type="button" key={item} className={interests.includes(item) ? 'selected' : ''} aria-pressed={interests.includes(item)} onClick={() => toggleInterest(item)}>{interests.includes(item) ? '✓ ' : '+ '}{t(`topics.${item}`)}</button>)}</div>
  </section>} />{selected && <BookDialog book={selected} onClose={() => setSelected(null)} />}</>;
}
