import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { DemoBook } from '../../demo/catalogue';
import type { CatalogueBook } from '../../features/library/catalogue';
import { libraryTranslations } from '../../features/library/libraryTranslations';
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

export function CatalogueBookCover({ book, title, synopsis, synopsisLabel }: { book: CatalogueBook; title: string; synopsis?: string; synopsisLabel?: string }) {
  return <div className={`book-cover ${book.topic === 'nature' ? 'sage' : book.topic === 'science' ? 'blue' : 'clay'}${book.cover_url ? ' has-cover-image' : ''}`} aria-hidden="true" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined}>
    {book.cover_url && <span className="cover-image-wash" />}
    <span className="cover-edition">EVG</span>
    <strong>{title}</strong>
    <span className="cover-symbol">{book.topic === 'nature' ? '✳' : book.topic === 'science' ? '△' : '≈'}</span>
    {synopsis && <span className="catalogue-synopsis-preview">
      <span className="catalogue-synopsis-label">{synopsisLabel}</span>
      <span>{synopsis}</span>
    </span>}
  </div>;
}

export function CatalogueBookCard({ book, availabilityLabel }: { book: CatalogueBook; availabilityLabel: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const title = locale === 'vi' ? book.title_vi : book.title_en;
  const synopsis = (locale === 'vi' ? book.description_vi : book.description_en).trim();
  const copy = libraryTranslations[locale];
  return <article className="catalogue-book catalogue-book-card">
    <Link className="catalogue-book-link" to={`/library/${encodeURIComponent(book.id)}`}>
      <CatalogueBookCover book={book} title={title} synopsis={synopsis || undefined} synopsisLabel={copy.synopsis} />
      <span className="book-meta">{t(`topics.${book.topic}`)} · {t(`catalogue.${book.language}`)}</span>
      <span className="book-title">{title}</span>
      {book.author && <span className="catalogue-author">{book.author}</span>}
      <span className="availability">{availabilityLabel}</span>
      <span className="text-link">{t('viewBook')} <span aria-hidden="true">→</span></span>
    </Link>
  </article>;
}
