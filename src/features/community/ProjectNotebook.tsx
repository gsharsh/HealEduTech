import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { requestFailureMessage } from '../../lib/requestFeedback';
import { changeProjectVisibility, deleteProject, isProjectConflict, listMyProjects, saveProject } from './togetherData';
import { emptyProject, isReadyToShare, projectLimits, projectText, sameProject, type LearningProject, type ProjectFormat, type ProjectInput } from './togetherModel';
import { togetherCopy } from './togetherCopy';

export interface NotebookHandle { startTemplate: (format: ProjectFormat) => void }
type NotebookProps = { initialFormat: ProjectFormat; onPublicChange: () => void; startWithNew?: boolean };
export function ProjectNotebook({ initialFormat, onPublicChange, startWithNew = false, ref }: NotebookProps & { ref?: Ref<NotebookHandle> }) {
  const { i18n } = useTranslation();
  const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [projects, setProjects] = useState<LearningProject[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [locked, setLocked] = useState(false);
  const [newKey, setNewKey] = useState(0);
  const [newFormat, setNewFormat] = useState(initialFormat);
  const newDraftRequested = useRef(startWithNew);
  const [templateNotice, setTemplateNotice] = useState('');
  useImperativeHandle(ref, () => ({ startTemplate(format) {
    if (locked) { setTemplateNotice(i18n.language === 'vi' ? 'Lưu hoặc bỏ thay đổi trước khi bắt đầu dàn ý mới. Nội dung đang viết vẫn được giữ nguyên.' : 'Save or discard your changes before starting a new outline. Your current writing is unchanged.'); return; }
    if (projects.length >= 25) { setTemplateNotice(copy.draftLimit); return; }
    newDraftRequested.current = loading; setSelected(''); setNewFormat(format); setNewKey(value => value + 1); setTemplateNotice('');
  } }));
  useEffect(() => {
    const controller = new AbortController();
    void listMyProjects(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setProjects(value);
      setSelected(newDraftRequested.current && value.length < 25 ? '' : value[0]?.id ?? '');
      newDraftRequested.current = false;
      setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [revision]);
  function reload() { setLoading(true); setError(false); setLocked(false); setRevision(value => value + 1); }
  function update(project: LearningProject) {
    setProjects(values => [project, ...values.filter(item => item.id !== project.id)]);
    setSelected(project.id); setLocked(false);
  }
  return <div className="together-notebook">
    {loading ? <p role="status">{copy.loading}</p> : error ? <div role="alert"><p>{copy.loadError}</p><button className="secondary" onClick={reload}>{copy.retry}</button></div> : <>
      <div className="together-notebook-toolbar">
        {projects.length > 0 && <label>{copy.selectProject}<select disabled={locked} value={selected} onChange={event => { setSelected(event.target.value); setNewKey(value => value + 1); }}>
          <option value="" disabled={projects.length >= 25}>{copy.newProject}</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title} · {copy.status[project.status]}</option>)}
        </select></label>}
        <button type="button" className="secondary" disabled={locked || projects.length >= 25} onClick={() => { setSelected(''); setNewKey(value => value + 1); }}>{copy.newProject}</button>
      </div>
      {projects.length >= 25 && <p>{copy.draftLimit}</p>}
      {templateNotice && <p role="status">{templateNotice}</p>}
      <ProjectEditor key={newKey} project={projects.find(project => project.id === selected) ?? null} initialFormat={newFormat} onSaved={update} onLockChange={setLocked} onPublicChange={onPublicChange} onReload={reload} onDeleted={() => { setProjects(values => values.filter(item => item.id !== selected)); setSelected(''); setNewKey(value => value + 1); setLocked(false); }} />
    </>}
  </div>;
}

function ProjectEditor({ project, initialFormat, onSaved, onLockChange, onPublicChange, onReload, onDeleted }: NotebookProps & { project: LearningProject | null; onSaved: (project: LearningProject) => void; onLockChange: (locked: boolean) => void; onReload: () => void; onDeleted: () => void }) {
  const { i18n } = useTranslation();
  const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [input, setInput] = useState<ProjectInput>(project ?? { ...emptyProject, format: initialFormat });
  const [blankOriginal] = useState<ProjectInput>(() => ({ ...emptyProject, format: initialFormat }));
  const original = project ?? blankOriginal;
  const [id] = useState(() => project?.id ?? crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mounted = useRef(true);
  const dirty = !sameProject(input, original);
  const frozen = project?.status === 'submitted' || project?.status === 'published';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const checkLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      const message = i18n.language === 'vi' ? 'Rời trang này? Những thay đổi chưa lưu sẽ bị mất.' : 'Leave this page? Your unsaved changes will be lost.';
      if (!window.confirm(message)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('click', checkLink, true);
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('click', checkLink, true); };
  }, [dirty, i18n.language]);
  const labels = { book_title: copy.bookLabel, title: copy.titleLabel, summary: copy.summary, takeaways: copy.takeaways, recommendation: copy.recommendation, question: copy.question };
  function change<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    const next = { ...input, [key]: value }; setInput(next); onLockChange(!sameProject(next, original)); setFailure(null); setNotice(''); setConsent(false);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([projectText(input, labels)], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'my-reading-outline.txt'; anchor.click(); URL.revokeObjectURL(url);
  }
  async function save() {
    if (busy || frozen) return;
    setBusy(true); onLockChange(true); setFailure(null); setNotice('');
    let succeeded = false;
    try {
      const result = await saveProject(id, input, project?.updated_at ?? null);
      if (!mounted.current) return;
      succeeded = true; setInput(result); onSaved(result); setNotice(copy.saved);
    } catch (error) { if (mounted.current) setFailure(error); }
    finally { if (mounted.current) { setBusy(false); onLockChange(!succeeded && dirty); } }
  }
  async function visibility(action: 'submit' | 'withdraw') {
    if (busy || !project || (action === 'submit' && (!consent || dirty || !isReadyToShare(input)))) return;
    setBusy(true); onLockChange(true); setFailure(null); setNotice('');
    try {
      const result = await changeProjectVisibility(project, action);
      if (!mounted.current) return;
      onSaved(result); setConsent(false); setNotice(action === 'submit' ? copy.submitted : copy.withdrawn); onPublicChange();
    } catch (error) { if (mounted.current) setFailure(error); }
    finally { if (mounted.current) { setBusy(false); onLockChange(false); } }
  }
  return <form className="together-editor" aria-label={copy.notebook} aria-busy={busy} onSubmit={event => { event.preventDefault(); void save(); }}>
    <div className="together-editor-status"><span className={`together-status together-status--${project?.status ?? 'draft'}`}>{copy.status[project?.status ?? 'draft']}</span>{dirty && <span role="status">{copy.unsaved}</span>}</div>
    {project?.review_note && <aside className="together-feedback"><h3>{copy.reviewNote}</h3><p>{project.review_note}</p></aside>}
    {frozen && <p>{copy.readOnly}</p>}
    <fieldset disabled={busy || frozen}>
      <div className="together-field-row">
        <label htmlFor="project-book">{copy.bookLabel}<input id="project-book" required maxLength={200} value={input.book_title} onChange={event => change('book_title', event.target.value)} aria-describedby="project-book-help" /></label>
        <label htmlFor="project-format">{copy.formatLabel}<select id="project-format" value={input.format} onChange={event => change('format', event.target.value as ProjectFormat)}><option value="presentation">{copy.presentation}</option><option value="review">{copy.review}</option></select></label>
      </div>
      <p className="field-help" id="project-book-help">{copy.bookHelp}</p>
      <label htmlFor="project-title">{copy.titleLabel}<input id="project-title" required maxLength={120} value={input.title} onChange={event => change('title', event.target.value)} /></label>
      {(['summary', 'takeaways', 'recommendation', 'question'] as const).map(field => <div className="together-text-field" key={field}>
        <label htmlFor={`project-${field}`}>{labels[field]}</label>
        <p className="field-help" id={`project-${field}-help`}>{copy[`${field}Help`]}</p>
        <textarea id={`project-${field}`} rows={field === 'question' ? 2 : 3} maxLength={projectLimits[field]} value={input[field]} onChange={event => change(field, event.target.value)} aria-describedby={`project-${field}-help project-${field}-count`} />
        <span className="together-char-count" id={`project-${field}-count`}>{input[field].length} / {projectLimits[field]}</span>
      </div>)}
    </fieldset>
    <div className="together-actions">
      {!frozen && <button className="primary" type="submit" disabled={busy || (!dirty && Boolean(project))}>{busy ? copy.saving : copy.save}</button>}
      {dirty && <button className="secondary" type="button" disabled={busy} onClick={() => { setInput(original); onLockChange(false); setFailure(null); setNotice(''); }}>{i18n.language === 'vi' ? 'Bỏ thay đổi chưa lưu' : 'Discard unsaved changes'}</button>}
      <button className="secondary" type="button" onClick={download}>{copy.download}</button>
    </div>
    <p className="field-help">{copy.downloadHelp}</p>
    {notice && <p className="together-notice" role="status">{notice}</p>}
    {failure !== null && <div role="alert"><p>{isProjectConflict(failure) ? copy.conflict : requestFailureMessage(failure, i18n.language, copy.saveError)}</p>{isProjectConflict(failure) && <button className="secondary" type="button" onClick={onReload}>{copy.reload}</button>}</div>}
    {project && !frozen && <div className="together-sharing-controls">
      <p>{copy.submitHelp}</p><label className="together-checkbox"><input type="checkbox" checked={consent} disabled={busy || dirty} onChange={event => setConsent(event.target.checked)} />{copy.consent}</label>
      <button type="button" className="secondary" disabled={busy || dirty || !consent || !isReadyToShare(input)} onClick={() => void visibility('submit')}>{busy ? copy.submitting : copy.submit}</button>
    </div>}
    {project && !frozen && <button className="text-button" type="button" disabled={busy || dirty} onClick={() => setDeleteOpen(true)}>{i18n.language === 'vi' ? 'Xóa sổ tay này' : 'Delete this notebook'}</button>}
    {deleteOpen && project && <DeleteNotebook project={project} onCancel={() => setDeleteOpen(false)} onDeleted={onDeleted} />}
    {frozen && <div className="together-sharing-controls"><p>{copy.withdrawHelp}</p><button type="button" className="secondary" disabled={busy} onClick={() => void visibility('withdraw')}>{copy.withdraw}</button></div>}
  </form>;
}

function DeleteNotebook({ project, onCancel, onDeleted }: { project: LearningProject; onCancel: () => void; onDeleted: () => void }) {
  const { i18n } = useTranslation(); const vi = i18n.language === 'vi';
  const dialog = useRef<HTMLDialogElement>(null); const [busy, setBusy] = useState(false); const [failure, setFailure] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; dialog.current?.showModal(); return () => { mounted.current = false; }; }, []);
  async function remove() {
    if (busy) return; setBusy(true); setFailure(false);
    try { await deleteProject(project); if (mounted.current) onDeleted(); }
    catch { if (mounted.current) setFailure(true); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <dialog ref={dialog} className="together-delete-dialog" aria-labelledby="delete-notebook-title" onCancel={event => { if (busy) event.preventDefault(); else onCancel(); }} onClose={onCancel}>
    <h2 id="delete-notebook-title">{vi ? 'Xóa sổ tay này?' : 'Delete this notebook?'}</h2>
    <p><strong>{project.title}</strong></p><p>{vi ? 'Thao tác này xóa vĩnh viễn sổ tay và các bình luận liên quan. Tải dàn ý xuống trước nếu em muốn giữ một bản.' : 'This permanently deletes the notebook and its comments. Download your outline first if you want to keep a copy.'}</p>
    <div className="together-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel} autoFocus>{vi ? 'Giữ sổ tay' : 'Keep notebook'}</button><button type="button" className="primary" disabled={busy} onClick={() => void remove()}>{vi ? 'Xóa vĩnh viễn' : 'Permanently delete'}</button></div>
    {failure && <p role="alert">{vi ? 'Chưa xóa được. Giữ trang này mở và thử lại.' : 'We could not delete it. Keep this page open and try again.'}</p>}
  </dialog>;
}
