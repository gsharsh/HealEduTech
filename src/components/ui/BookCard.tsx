import { useTranslation } from 'react-i18next';
import type { DemoBook } from '../../demo/catalogue';
export function BookCover({ book }: {
  book: DemoBook;
}) {
  const { t, i18n } = useTranslation();
  return <div className={`book-cover ${book.color}`} aria-hidden="true">
    <span className="cover-edition">{t('coverEdition')}</span>
    <strong>{book.title[i18n.language === 'vi' ? 'vi' : 'en']}</strong>
    <span className="cover-symbol">{book.symbol}</span>
    <span className="cover-foot">{t('coverCollection')}</span>
  </div>;
}
export function BookCard({ book, onOpen }: {
  book: DemoBook;
  onOpen: (book: DemoBook) => void;
}) {
  const { t, i18n } = useTranslation();
  return <button className="book-card" onClick={() => onOpen(book)}>
    <BookCover book={book} />
    <span className="book-meta">{t(`topics.${book.topic}`)} · {t('minutes', { count: book.minutes })}</span>
    <span className="book-title">{book.title[i18n.language === 'vi' ? 'vi' : 'en']}</span>
    <span className="text-link">{t('viewBook')} <span aria-hidden="true">↗</span>
    </span>
  </button>;
}
