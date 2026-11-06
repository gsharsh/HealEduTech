import { requestFailureMessage } from '../../lib/requestFeedback';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { addBook, CatalogueCoverSaveError, listBooks, removeUnusedBook, updateBook, type CatalogueBook, type NewBook } from '../library/catalogue';
import { recoverCatalogueEditorAfterCoverSave, type CatalogueEditorState } from './catalogueEditorRecovery';
import { PublicCatalogueLink } from './WorkspaceNavigation';
import { staffPageNumber } from '../circulation/followUpLogic';
import { notifyStaffDataChanged } from './staffData';
import { StaffActionDialog } from './StaffActionDialog';
import { teachingCopy } from './teachingCopy';
import './admin.css';

const emptyBook: NewBook = { title_en: '', title_vi: '', author: '', language: 'vi', topic: 'stories', description_en: '', description_vi: '', cover_url: '', copies: 1 };
type EditorState = CatalogueEditorState;

function editorFromBook(book: CatalogueBook): EditorState {
  const registeredCopies = book.book_copies[0]?.count ?? 0;
  return { mode: 'edit', id: book.id, registeredCopies, value: {
    title_en: book.title_en, title_vi: book.title_vi, author: book.author, language: book.language, topic: book.topic,
    description_en: book.description_en, description_vi: book.description_vi, cover_url: book.cover_url, totalCopies: Math.max(1, registeredCopies),
  } };
}

export function BookManagement() {
  const { user, staffRole } = useAccount();
  return <CatalogueManagement key={`${user?.id ?? 'guest'}:${staffRole ?? ''}`} />;
}

const catalogueCopy = {
  en: { search: 'Find a catalogue title', searchAction: 'Search', clear: 'Clear search', previous: 'Previous', next: 'Next', page: 'Page', of: 'of', titles: (count: number) => count === 1 ? 'title' : 'titles', noMatches: 'No titles match this search.', stockUnavailable: 'Stock could not be verified. Refresh before editing this title.', stockUnknown: 'Availability unavailable', stockTotal: 'registered copies', inventory: 'Catalogue pages' },
  vi: { search: 'Tìm tên sách trong danh mục', searchAction: 'Tìm', clear: 'Xóa tìm kiếm', previous: 'Trước', next: 'Sau', page: 'Trang', of: '/', titles: () => 'tựa sách', noMatches: 'Không có tựa sách phù hợp.', stockUnavailable: 'Chưa thể xác nhận số bản sách. Hãy tải lại trước khi sửa tựa sách này.', stockUnknown: 'Chưa có thông tin sách sẵn có', stockTotal: 'bản sách đã đăng ký', inventory: 'Các trang danh mục' },
};

function CatalogueManagement() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi' : 'en';
  const { user, loading, canManageBooks } = useAccount();
  const copy = catalogueCopy[locale];
  const teaching = teachingCopy[locale];
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const page = staffPageNumber(params.get('page')) - 1;
  const [total, setTotal] = useState(0);
  const viewKey = JSON.stringify([page, query]);
  const [loadedKey, setLoadedKey] = useState('');
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const [books, setBooks] = useState<CatalogueBook[]>([]);
  const [catalogueState, setCatalogueState] = useState<'loading' | 'ready' | 'error'>('loading');
  const viewState = loadedKey === viewKey ? catalogueState : 'loading';
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<CatalogueBook | null>(null);
  const [removalError, setRemovalError] = useState('');
  const [removalConflict, setRemovalConflict] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [saveFailure, setSaveFailure] = useState<unknown>(null);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error' | 'cover-error'>('idle');

  const refresh = useCallback(async (): Promise<CatalogueBook[] | null> => {
    if (!canManageBooks) return null;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setCatalogueState('loading');
    try {
      const result = await listBooks(page, controller.signal, query, 'all', { fresh: true });
      if (controller.signal.aborted) return null;
      const lastPage = Math.max(0, Math.ceil(result.total / 24) - 1);
      if (page > lastPage) {
        setParams(current => { const next = new URLSearchParams(current); next.set('page', String(lastPage + 1)); return next; }, { replace: true });
        return null;
      }
      setLoadedKey(viewKey); setBooks(result.books); setTotal(result.total); setCatalogueState('ready');
      return result.books;
    } catch {
      if (!controller.signal.aborted) { setLoadedKey(viewKey); setCatalogueState('error'); }
      return null;
    }
  }, [canManageBooks, page, query, viewKey, setParams]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void refresh(); });
    return () => { active = false; request.current?.abort(); };
  }, [refresh]);

  function focusEditor() { window.requestAnimationFrame(() => document.getElementById('catalogue-editor')?.focus()); }
  function beginAdd() { if (saving.current) return; setEditor({ mode: 'new', value: { ...emptyBook } }); setRequestId(crypto.randomUUID()); setStatus('idle'); focusEditor(); }
  function reloadCatalogue() { void refresh(); }
  async function confirmRemoval() {
    if (!removing || saving.current || removalConflict) return;
    saving.current = true; setBusy(true); setRemovalError(''); setRemoved(false);
    try {
      await removeUnusedBook(removing);
      if (editor?.mode === 'edit' && editor.id === removing.id) setEditor(null);
      setRemoving(null); setRemoved(true); setStatus('idle');
      notifyStaffDataChanged(); await refresh();
    } catch (error) {
      const failure = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
      setRemovalConflict(failure.code === 'PT409');
      setRemovalError(requestFailureMessage(error, locale, failure.code === 'PT409' ? teaching.changed : failure.message === 'EVG_BOOK_HAS_HISTORY' ? teaching.history : failure.code === 'PGRST202' ? teaching.unavailable : teaching.failed));
    } finally { saving.current = false; setBusy(false); }
  }
  function beginEdit(book: CatalogueBook) {
    if (saving.current || book.book_copies[0]?.count === undefined) return;
    setEditor(editorFromBook(book)); setStatus('idle'); focusEditor();
  }
  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setParams(value ? { q: value } : {});
  }
  function changePage(value: number) {
    const next = new URLSearchParams(params); next.set('page', String(value + 1)); setParams(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || !canManageBooks || !editor) return;
    setSaveFailure(null);
    const value = editor.value;
    const copyCount = editor.mode === 'new' ? editor.value.copies : editor.value.totalCopies;
    if (!value.title_en.trim() || !value.title_vi.trim() || !Number.isInteger(copyCount) || copyCount < 1 || copyCount > 100 || (value.cover_url.trim() !== '' && !/^https?:\/\//i.test(value.cover_url.trim()))) { setStatus('error'); return; }
    saving.current = true; setBusy(true); setStatus('idle');
    try {
      if (editor.mode === 'new') await addBook(requestId, editor.value);
      else await updateBook(editor.id, editor.value);
      await refresh(); notifyStaffDataChanged(); setStatus('saved'); setEditor(null);
    } catch (error) {
      setSaveFailure(error);
      if (error instanceof CatalogueCoverSaveError) {
        // The metadata/copy RPC already committed. Refresh before leaving the
        // editor open so retrying the cover cannot create a duplicate record.
        const refreshedBooks = await refresh();
        const committed = refreshedBooks?.find(book => book.id === error.bookId);
        setEditor(current => current ? recoverCatalogueEditorAfterCoverSave(current, error.bookId, committed) : current);
        setStatus('cover-error');
      } else setStatus('error');
    }
    finally { saving.current = false; setBusy(false); }
  }

  if (loading) return <p role="status">{t('auth.loading')}</p>;
  return <div className="admin-catalogue">
    <div className="admin-catalogue__heading"><div><span className="eyebrow">{t('catalogue.deskEyebrow')}</span><h1>{t('catalogue.manageTitle')}</h1><p>{t('catalogue.manageBody')}</p></div>
      {canManageBooks && <button className="primary" type="button" disabled={busy} onClick={beginAdd}>{t('catalogue.addAction')}</button>}
    </div>
    {!user ? <section className="staff-panel admin-access-state"><h2>{t('catalogue.signInTitle')}</h2><p>{t('catalogue.signInRequired')}</p><Link className="primary" to="/sign-in?next=/staff/catalogue">{t('auth.signIn')}</Link></section>
      : !canManageBooks ? <section className="staff-panel admin-access-state"><h2>{t('catalogue.noAccessTitle')}</h2><p>{t('catalogue.staffRequired')}</p><Link className="secondary" to="/library">{t('library')}</Link></section>
        : <>
          <PublicCatalogueLink />
          {removed && <p className="admin-notice" role="status">{teaching.removed}</p>}
          {removing && <StaffActionDialog tone="danger" title={teaching.confirm} confirmLabel={teaching.remove} confirmDisabled={removalConflict} cancelLabel={t('catalogue.cancel')} busy={busy} onConfirm={() => void confirmRemoval()} onCancel={() => setRemoving(null)}><p><strong>{locale === 'vi' ? removing.title_vi : removing.title_en}</strong></p><p>{teaching.removeBody}</p>{removalError && <p className="form-error" role="alert">{removalError}</p>}{removalConflict && <button type="button" className="secondary" onClick={() => { setRemoving(null); setRemovalConflict(false); void refresh(); }}>{teaching.refresh}</button>}</StaffActionDialog>}
          {editor && <section className="staff-panel admin-editor" aria-labelledby="catalogue-editor">
            <div className="admin-editor__heading"><div><span className="eyebrow">{t(editor.mode === 'new' ? 'catalogue.newEyebrow' : 'catalogue.editEyebrow')}</span><h2 id="catalogue-editor" tabIndex={-1}>{t(editor.mode === 'new' ? 'catalogue.addTitle' : 'catalogue.editTitle')}</h2></div><button className="text-link" type="button" disabled={busy} onClick={() => setEditor(null)}>{t('catalogue.cancel')}</button></div>
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
          {status === 'error' && <p role="alert" className="form-error admin-notice">{requestFailureMessage(saveFailure, i18n.language, t('catalogue.saveError'))}</p>}
          {status === 'cover-error' && <p role="alert" className="form-error admin-notice">{t('catalogue.coverSaveError')}</p>}
          <section className="admin-inventory" aria-labelledby="inventory-title"><div className="admin-inventory__heading"><div><span className="eyebrow">{t('catalogue.inventoryEyebrow')}</span><h2 id="inventory-title">{t('catalogue.inventoryTitle')}</h2></div><button className="secondary" type="button" disabled={busy || viewState === 'loading'} onClick={reloadCatalogue}>{t('catalogue.refresh')}</button></div>
            <form className="admin-inventory__search" onSubmit={applySearch} role="search">
              <label htmlFor="admin-catalogue-search">{copy.search}</label>
              <div><input key={query} id="admin-catalogue-search" type="search" name="q" defaultValue={query} maxLength={100} disabled={busy} /><button className="secondary" type="submit" disabled={busy}>{copy.searchAction}</button>{query && <button className="text-link" type="button" disabled={busy} onClick={() => setParams({})}>{copy.clear}</button>}</div>
            </form>
            {viewState === 'loading' ? <p role="status">{t('catalogue.loading')}</p> : viewState === 'error' ? <div role="alert"><p>{t('catalogue.loadError')}</p><button className="secondary" type="button" disabled={busy} onClick={reloadCatalogue}>{t('catalogue.retry')}</button></div> : books.length === 0 ? <div className="admin-inventory__empty"><p>{query ? copy.noMatches : t('catalogue.empty')}</p><button className="primary" type="button" disabled={busy} onClick={beginAdd}>{t('catalogue.addAction')}</button></div> : <div className="admin-book-list">{books.map(book => {
              const title = locale === 'vi' ? book.title_vi : book.title_en; const description = locale === 'vi' ? book.description_vi : book.description_en; const registered = book.book_copies[0]?.count;
              return <article className="admin-book-row" key={book.id}><div className="admin-book-row__cover" aria-hidden="true" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined}>{!book.cover_url && title.slice(0, 1)}</div><div className="admin-book-row__body"><h3>{title}</h3><p className="admin-book-row__meta">{book.author || t('catalogue.unknownAuthor')} · {t(`topics.${book.topic}`)}</p>{description && <p className="admin-book-row__description">{description}</p>}<p className="admin-book-row__stock">{registered === undefined ? copy.stockUnavailable : book.available_copies === undefined ? `${registered} ${copy.stockTotal} · ${copy.stockUnknown}` : t('catalogue.stockSummary', { available: book.available_copies, total: registered })}</p></div><div className="admin-book-row__actions"><button className="secondary" type="button" disabled={busy || registered === undefined} onClick={() => beginEdit(book)}>{t('catalogue.editAction')}</button><button className="text-link" type="button" disabled={busy || registered === undefined} onClick={() => { setRemoving(book); setRemovalError(''); setRemovalConflict(false); setRemoved(false); }}>{teaching.remove}</button></div></article>;
            })}</div>}
            {viewState === 'ready' && <nav className="admin-inventory__pagination" aria-label={copy.inventory}>
              <span role="status">{total.toLocaleString(locale)} {copy.titles(total)} · {copy.page} {page + 1} {copy.of} {Math.max(1, Math.ceil(total / 24))}</span>
              <div><button className="secondary" type="button" disabled={busy || page === 0} onClick={() => changePage(page - 1)}>{copy.previous}</button><button className="secondary" type="button" disabled={busy || (page + 1) * 24 >= total} onClick={() => changePage(page + 1)}>{copy.next}</button></div>
            </nav>}
          </section>
        </>}
  </div>;
}
