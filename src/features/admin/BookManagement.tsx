import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { addBook, type NewBook } from '../library/catalogue';
import { libraryTranslations } from '../library/libraryTranslations';
const emptyBook: NewBook = { title_en: '', title_vi: '', author: '', language: 'vi', topic: 'stories', description_en: '', description_vi: '', copies: 1 };
export function BookManagement() {
  const { t, i18n } = useTranslation();
  const copy = libraryTranslations[i18n.language === 'vi' ? 'vi' : 'en'];
  const { user, loading, canManageBooks } = useAccount();
  const [book, setBook] = useState<NewBook>(emptyBook);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !canManageBooks) return;
    if (!book.title_en.trim() || !book.title_vi.trim() || !Number.isInteger(book.copies) || book.copies < 1 || book.copies > 100) { setStatus('error'); return; }
    setBusy(true); setStatus('idle');
    try {
      await addBook(requestId, book);
      setStatus('saved'); setBook(emptyBook); setRequestId(crypto.randomUUID());
    } catch { setStatus('error'); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">{t('auth.loading')}</p>;
  return <>
    <div className="page-heading"><div><span className="eyebrow">{t('staff')}</span><h1>{t('catalogue.addTitle')}</h1><p>{t('catalogue.staffBody')}</p></div></div>
    {canManageBooks && <nav className="form-actions"><Link className="secondary" to="/admin/circulation">{copy.desk} →</Link></nav>}
    {!user ? <section className="staff-panel"><p>{t('catalogue.signInRequired')}</p><Link className="primary" to="/sign-in">{t('auth.account')}</Link></section> : !canManageBooks ? <section className="staff-panel"><p>{t('catalogue.staffRequired')}</p><Link className="secondary" to="/library">{t('library')}</Link></section> : <section className="staff-panel">
      <form className="data-form" onSubmit={event => void submit(event)}><fieldset disabled={busy}>
        <div className="form-grid">{(['title_en', 'title_vi', 'author'] as const).map(field => <label key={field}>{t(`catalogue.${field}`)}<input value={book[field]} onChange={event => setBook(value => ({ ...value, [field]: event.target.value }))} maxLength={200} required={field !== 'author'} /></label>)}
          <label>{t('catalogue.language')}<select value={book.language} onChange={event => setBook(value => ({ ...value, language: event.target.value as NewBook['language'] }))}>{(['vi', 'en', 'bilingual'] as const).map(language => <option key={language} value={language}>{t(`catalogue.${language}`)}</option>)}</select></label>
          <label>{t('topic')}<select value={book.topic} onChange={event => setBook(value => ({ ...value, topic: event.target.value as NewBook['topic'] }))}>{(['nature', 'stories', 'science'] as const).map(topic => <option key={topic} value={topic}>{t(`topics.${topic}`)}</option>)}</select></label>
          <label>{t('catalogue.copies')}<input type="number" min={1} max={100} step={1} required value={book.copies} onChange={event => setBook(value => ({ ...value, copies: Number(event.target.value) }))} /></label>
        </div>
        {(['description_en', 'description_vi'] as const).map(field => <label key={field}>{t(`catalogue.${field}`)}<textarea value={book[field]} onChange={event => setBook(value => ({ ...value, [field]: event.target.value }))} maxLength={2000} rows={3} /></label>)}
        <button type="submit" className="primary">{t(busy ? 'auth.working' : 'catalogue.save')}</button>
      </fieldset></form>
      {status === 'saved' && <p role="status">{t('catalogue.saved')} <Link className="text-link" to="/library">{t('library')} →</Link></p>}
      {status === 'error' && <p role="alert" className="form-error">{t('catalogue.saveError')}</p>}
    </section>}
  </>;
}
