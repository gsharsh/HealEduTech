import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { addBook, listBooks, updateBook, type BookUpdate, type CatalogueBook, type NewBook } from '../library/catalogue';
import { PublicCatalogueLink } from './WorkspaceNavigation';
import './admin.css';

const emptyBook: NewBook = { title_en: '', title_vi: '', author: '', language: 'vi', topic: 'stories', description_en: '', description_vi: '', cover_url: '', copies: 1 };
type EditorState = { mode: 'new'; value: NewBook } | { mode: 'edit'; id: string; registeredCopies: number; value: BookUpdate };

function editorFromBook(book: CatalogueBook): EditorState {
  const registeredCopies = book.book_copies[0]?.count ?? 0;
  return { mode: 'edit', id: book.id, registeredCopies, value: {
    title_en: book.title_en, title_vi: book.title_vi, author: book.author, language: book.language, topic: book.topic,
    description_en: book.description_en, description_vi: book.description_vi, cover_url: book.cover_url, totalCopies: Math.max(1, registeredCopies),
  } };
}

export function BookManagement() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const { user, loading, canManageBooks } = useAccount();
  const [books, setBooks] = useState<CatalogueBook[]>([]);
  const [catalogueState, setCatalogueState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!canManageBooks) return;
    try {
      const result = await listBooks(0, signal ?? new AbortController().signal);
      setBooks(result.books); setCatalogueState('ready');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setCatalogueState('error');
    }
  }, [canManageBooks]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadInitialCatalogue() {
      if (!canManageBooks) return;
      try {
        const result = await listBooks(0, controller.signal);
        setBooks(result.books);
        setCatalogueState('ready');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCatalogueState('error');
      }
    }
    void loadInitialCatalogue();
    return () => controller.abort();
  }, [canManageBooks]);

  function beginAdd() { setEditor({ mode: 'new', value: { ...emptyBook } }); setRequestId(crypto.randomUUID()); setStatus('idle'); }
  function reloadCatalogue() { setCatalogueState('loading'); void refresh(); }
  function beginEdit(book: CatalogueBook) {
    setEditor(editorFromBook(book)); setStatus('idle');
    window.requestAnimationFrame(() => document.getElementById('catalogue-editor')?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !canManageBooks || !editor) return;
    const value = editor.value;
    const copyCount = editor.mode === 'new' ? editor.value.copies : editor.value.totalCopies;
    if (!value.title_en.trim() || !value.title_vi.trim() || !Number.isInteger(copyCount) || copyCount < 1 || copyCount > 100 || (value.cover_url.trim() !== '' && !/^https?:\/\//i.test(value.cover_url.trim()))) { setStatus('error'); return; }
    setBusy(true); setStatus('idle');
    try {
      if (editor.mode === 'new') await addBook(requestId, editor.value);
      else await updateBook(editor.id, editor.value);
      await refresh(); setStatus('saved'); setEditor(null);
    } catch { setStatus('error'); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status">{t('auth.loading')}</p>;
  return <div className="admin-catalogue">
    <div className="admin-catalogue__heading"><div><span className="eyebrow">{t('catalogue.deskEyebrow')}</span><h1>{t('catalogue.manageTitle')}</h1><p>{t('catalogue.manageBody')}</p></div>
      {canManageBooks && <button className="primary" type="button" onClick={beginAdd}>{t('catalogue.addAction')}</button>}
    </div>
    {!user ? <section className="staff-panel admin-access-state"><h2>{t('catalogue.signInTitle')}</h2><p>{t('catalogue.signInRequired')}</p><Link className="primary" to="/sign-in?next=/staff/catalogue">{t('auth.signIn')}</Link></section>
      : !canManageBooks ? <section className="staff-panel admin-access-state"><h2>{t('catalogue.noAccessTitle')}</h2><p>{t('catalogue.staffRequired')}</p><Link className="secondary" to="/library">{t('library')}</Link></section>
        : <>
          <PublicCatalogueLink />
          {editor && <section className="staff-panel admin-editor" aria-labelledby="catalogue-editor">
            <div className="admin-editor__heading"><div><span className="eyebrow">{t(editor.mode === 'new' ? 'catalogue.newEyebrow' : 'catalogue.editEyebrow')}</span><h2 id="catalogue-editor" tabIndex={-1}>{t(editor.mode === 'new' ? 'catalogue.addTitle' : 'catalogue.editTitle')}</h2></div><button className="text-link" type="button" onClick={() => setEditor(null)}>{t('catalogue.cancel')}</button></div>
            <form className="data-form" onSubmit={event => void submit(event)}><fieldset disabled={busy}>
              <div className="form-grid">{(['title_en', 'title_vi', 'author'] as const).map(field => <label key={field}>{t(`catalogue.${field}`)}<input value={editor.value[field]} onChange={event => setEditor(current => current ? ({ ...current, value: { ...current.value, [field]: event.target.value } } as EditorState) : current)} maxLength={200} required={field !== 'author'} /></label>)}
                <label>{t('catalogue.language')}<select value={editor.value.language} onChange={event => setEditor(current => current ? ({ ...current, value: { ...current.value, language: event.target.value as NewBook['language'] } } as EditorState) : current)}>{(['vi', 'en', 'bilingual'] as const).map(language => <option key={language} value={language}>{t(`catalogue.${language}`)}</option>)}</select></label>
                <label>{t('topic')}<select value={editor.value.topic} onChange={event => setEditor(current => current ? ({ ...current, value: { ...current.value, topic: event.target.value as NewBook['topic'] } } as EditorState) : current)}>{(['nature', 'stories', 'science'] as const).map(topic => <option key={topic} value={topic}>{t(`topics.${topic}`)}</option>)}</select></label>
                <label className="form-grid__wide">{t('catalogue.coverUrl')}<input type="url" value={editor.value.cover_url} onChange={event => setEditor(current => current ? ({ ...current, value: { ...current.value, cover_url: event.target.value } } as EditorState) : current)} maxLength={1000} placeholder="https://…" /></label>
                {editor.mode === 'new' ? <label>{t('catalogue.copies')}<input type="number" min={1} max={100} step={1} required value={editor.value.copies} onChange={event => setEditor(current => current?.mode === 'new' ? { ...current, value: { ...current.value, copies: Number(event.target.value) } } : current)} /></label>
                  : <label>{t('catalogue.totalCopies')}<input type="number" min={1} max={100} step={1} required value={editor.value.totalCopies} onChange={event => setEditor(current => current?.mode === 'edit' ? { ...current, value: { ...current.value, totalCopies: Number(event.target.value) } } : current)} /><small>{t('catalogue.registeredCopies', { count: editor.registeredCopies })}</small></label>}
              </div>
              {(['description_en', 'description_vi'] as const).map(field => <label key={field}>{t(`catalogue.${field}`)}<textarea value={editor.value[field]} onChange={event => setEditor(current => current ? ({ ...current, value: { ...current.value, [field]: event.target.value } } as EditorState) : current)} maxLength={2000} rows={4} /></label>)}
              {editor.mode === 'edit' && <p className="admin-editor__note">{t('catalogue.copySafety')}</p>}
              <div className="form-actions"><button type="submit" className="primary">{t(busy ? 'auth.working' : editor.mode === 'new' ? 'catalogue.save' : 'catalogue.saveChanges')}</button><button type="button" className="secondary" onClick={() => setEditor(null)}>{t('catalogue.cancel')}</button></div>
            </fieldset></form>
          </section>}
          {status === 'saved' && <p className="admin-notice" role="status">{t('catalogue.saved')}</p>}
          {status === 'error' && <p role="alert" className="form-error admin-notice">{t('catalogue.saveError')}</p>}
          <section className="admin-inventory" aria-labelledby="inventory-title"><div className="admin-inventory__heading"><div><span className="eyebrow">{t('catalogue.inventoryEyebrow')}</span><h2 id="inventory-title">{t('catalogue.inventoryTitle')}</h2></div><button className="secondary" type="button" onClick={reloadCatalogue}>{t('catalogue.refresh')}</button></div>
            {catalogueState === 'loading' ? <p role="status">{t('catalogue.loading')}</p> : catalogueState === 'error' ? <div role="alert"><p>{t('catalogue.loadError')}</p><button className="secondary" type="button" onClick={reloadCatalogue}>{t('catalogue.retry')}</button></div> : books.length === 0 ? <div className="admin-inventory__empty"><p>{t('catalogue.empty')}</p><button className="primary" type="button" onClick={beginAdd}>{t('catalogue.addAction')}</button></div> : <div className="admin-book-list">{books.map(book => {
              const title = locale === 'vi' ? book.title_vi : book.title_en; const description = locale === 'vi' ? book.description_vi : book.description_en; const total = book.book_copies[0]?.count ?? 0;
              return <article className="admin-book-row" key={book.id}><div className="admin-book-row__cover" aria-hidden="true" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined}>{!book.cover_url && title.slice(0, 1)}</div><div className="admin-book-row__body"><h3>{title}</h3><p className="admin-book-row__meta">{book.author || t('catalogue.unknownAuthor')} · {t(`topics.${book.topic}`)}</p>{description && <p className="admin-book-row__description">{description}</p>}<p className="admin-book-row__stock">{t('catalogue.stockSummary', { available: book.available_copies ?? total, total })}</p></div><button className="secondary" type="button" onClick={() => beginEdit(book)}>{t('catalogue.editAction')}</button></article>;
            })}</div>}
          </section>
        </>}
  </div>;
}
