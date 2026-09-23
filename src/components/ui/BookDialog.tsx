import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { DemoBook } from '../../demo/catalogue';
import { useDemo } from '../../demo/context';
import { BookCover } from './BookCard';
export function BookDialog({ book, onClose }: {
  book: DemoBook;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t, i18n } = useTranslation();
  const { borrowed } = useDemo();
  const language = i18n.language === 'vi' ? 'vi' : 'en';
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.isConnected)
        trigger.focus();
      else
        document.getElementById('main-content')?.focus();
    };
  }, []);
  return <dialog ref={ref} onCancel={onClose} aria-labelledby="book-dialog-title">
    <button className="dialog-close secondary" onClick={onClose}>{t('close')} ×</button>
    <div className="book-detail">
      <BookCover book={book} />
      <div>
        <span className="eyebrow">{t(`topics.${book.topic}`)}</span>
        <h2 id="book-dialog-title">{book.title[language]}</h2>
        <p>{book.description[language]}</p>
        <p className="availability">{t('available', { count: book.copies - (book.id === 'garden' && borrowed ? 1 : 0) })}</p>
        <p className="muted">{t('sampleBook')}</p>
        <p role="status">{t('askStaff')}</p>
        <p className="muted">{t('catalogue.circulationLater')}</p>
      </div>
    </div>
  </dialog>;
}
