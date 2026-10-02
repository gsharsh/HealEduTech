import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { DemoBook } from '../../demo/catalogue';
import type { CatalogueBook } from '../../features/library/catalogue';
import { getCoverImageSources, type CoverSize } from '../../features/library/coverImages';
import './book-card.css';
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
  return <button type="button" className="book-card" onClick={() => onOpen(book)}>
    <BookCover book={book} />
    <span className="book-meta">{t(`topics.${book.topic}`)} · {t('minutes', { count: book.minutes })}</span>
    <span className="book-title">{book.title[i18n.language === 'vi' ? 'vi' : 'en']}</span>
    <span className="text-link">{t('viewBook')} <span aria-hidden="true">↗</span>
    </span>
  </button>;
}

export function CatalogueBookCover({ book, title, size = 'card' }: { book: CatalogueBook; title: string; size?: CoverSize }) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const coverUrl = book.cover_url.trim();
  const imageSources = coverUrl && failedCoverUrl !== coverUrl ? getCoverImageSources(coverUrl, size) : null;
  const hasCoverImage = imageSources !== null;

  return <div className={`book-cover ${book.topic === 'nature' ? 'sage' : book.topic === 'science' ? 'blue' : 'clay'}${hasCoverImage ? ' has-cover-image' : ''}`} aria-hidden="true">
    {hasCoverImage ? <>
      <img
        className="book-cover-image"
        src={imageSources.src}
        srcSet={imageSources.srcSet}
        sizes={size === 'detail' ? '(max-width: 760px) min(70vw, 230px), min(330px, 32vw)' : '(max-width: 430px) calc(100vw - 32px), (max-width: 760px) calc((100vw - 56px) / 2), 25vw'}
        loading="lazy"
        decoding="async"
        alt=""
        onError={() => setFailedCoverUrl(coverUrl)}
      />
      <span className="cover-image-wash" />
    </> : <>
      <strong>{title}</strong>
      <span className="cover-symbol">{book.topic === 'nature' ? '✳' : book.topic === 'science' ? '△' : '≈'}</span>
    </>}
  </div>;
}

export function CatalogueBookCard({ book, availabilityLabel, returnTo = '/library' }: { book: CatalogueBook; availabilityLabel: string; returnTo?: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const title = locale === 'vi' ? book.title_vi : book.title_en;
  return <article className="catalogue-book catalogue-book-card">
    <Link className="catalogue-book-link" to={`/library/${encodeURIComponent(book.id)}?${new URLSearchParams({ returnTo }).toString()}`}>
      <CatalogueBookCover book={book} title={title} />
      <span className="book-meta">{t(`topics.${book.topic}`)} · {t(`catalogue.${book.language}`)}</span>
      <span className="book-title">{title}</span>
      {book.author && <span className="catalogue-author">{book.author}</span>}
      <span className="availability">{availabilityLabel}</span>
      <span className="text-link">{t('viewBook')} <span aria-hidden="true">→</span></span>
    </Link>
  </article>;
}
