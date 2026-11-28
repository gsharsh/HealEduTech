import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestFailureMessage } from '../../lib/requestFeedback';
import { isProjectConflict, listReviewProjects, reviewProject, type ReviewProject as ReviewProjectRecord } from './togetherData';
import { togetherCopy } from './togetherCopy';
import type { LearningProject } from './togetherModel';
import { feedbackCopy } from './togetherFeedbackCopy';
import { listReviewComments, reviewComment, type ReviewComment, type OwnComment } from './togetherFeedbackData';

export function ProjectReviewDesk({ onPublicChange }: { onPublicChange: () => void }) {
  const [searchParams] = useSearchParams();
  const rawStudent = searchParams.get('student') ?? '';
  const studentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawStudent) ? rawStudent : undefined;
  return <ReviewDesk key={studentId ?? 'all'} studentId={studentId} onPublicChange={onPublicChange} />;
}
function ReviewDesk({ onPublicChange, studentId }: { onPublicChange: () => void; studentId?: string }) {
  const { i18n } = useTranslation();
  const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const commentsCopy = feedbackCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [projects, setProjects] = useState<ReviewProjectRecord[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<unknown>(null);
  const [moreProjects, setMoreProjects] = useState(false);
  const [moreComments, setMoreComments] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewing, setReviewing] = useState(0);
  const [reviewNotice, setReviewNotice] = useState(false);
  const dirtyNotes = useRef(new Set<string>());
  const refreshLabel = i18n.language === 'vi' ? 'Làm mới danh sách duyệt' : 'Refresh review queue';
  function markNote(id: string, dirty: boolean) { if (dirty) dirtyNotes.current.add(id); else dirtyNotes.current.delete(id); }
  function markBusy(busy: boolean) { setReviewing(value => Math.max(0, value + (busy ? 1 : -1))); }
  const mounted = useRef(true);
  const pagingController = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pagingController.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([listReviewProjects(controller.signal, undefined, studentId), listReviewComments(controller.signal)]).then(([nextProjects, nextComments]) => {
      if (controller.signal.aborted) return;
      setProjects(nextProjects); setComments(nextComments); setMoreProjects(nextProjects.length === 24); setMoreComments(nextComments.length === 24); setLoading(false);
    }).catch(error => { if (!controller.signal.aborted) { setFailure(error); setLoading(false); } });
    return () => controller.abort();
  }, [revision, studentId]);
  async function more(kind: 'projects' | 'comments') {
    if (loadingMore) return;
    const controller = new AbortController(); pagingController.current = controller; setLoadingMore(true); setFailure(null);
    try {
      if (kind === 'projects') {
        const next = await listReviewProjects(controller.signal, projects.at(-1), studentId);
        if (!mounted.current) return;
        setProjects(value => [...value, ...next.filter(project => !value.some(item => item.id === project.id))]); setMoreProjects(next.length === 24);
      } else {
        const next = await listReviewComments(controller.signal, comments.at(-1));
        if (!mounted.current) return;
        setComments(value => [...value, ...next.filter(comment => !value.some(item => item.id === comment.id))]); setMoreComments(next.length === 24);
      }
    } catch (error) { if (mounted.current) setFailure(error); }
    finally { if (mounted.current) setLoadingMore(false); }
  }
  function refresh() {
    if (reviewing || loading || loadingMore) return;
    if (dirtyNotes.current.size && !window.confirm(i18n.language === 'vi' ? 'Làm mới danh sách? Góp ý chưa gửi sẽ bị bỏ. Sao chép nội dung trước nếu muốn giữ lại.' : 'Refresh the queue? Your unsent review notes will be discarded. Copy them first if you want to keep them.')) return;
    dirtyNotes.current.clear(); setFailure(null); setReviewNotice(false); setLoading(true); setRevision(value => value + 1); onPublicChange();
  }
  function projectReviewed(result: LearningProject) {
    dirtyNotes.current.delete(`project:${result.id}`);
    setProjects(values => values.map(project => project.id === result.id ? { ...project, ...result } : project));
    if (result.status !== 'published') setComments(values => values.filter(comment => comment.project_id !== result.id));
    setReviewNotice(true); onPublicChange();
  }
  function commentReviewed(result: OwnComment) {
    dirtyNotes.current.delete(`comment:${result.id}`);
    setComments(values => result.status === 'rejected' ? values.filter(comment => comment.id !== result.id) : values.map(comment => comment.id === result.id ? { ...comment, ...result } : comment));
    setReviewNotice(true); onPublicChange();
  }
  return <section className="together-review-desk" aria-labelledby="review-desk-title">
    <div className="section-heading"><div><h2 id="review-desk-title" tabIndex={-1}>{copy.teacher}</h2><p>{copy.teacherBody}</p></div><button type="button" className="secondary" disabled={loading || loadingMore || reviewing > 0} onClick={refresh}>{refreshLabel}</button></div>
    {reviewNotice && <p role="status">{i18n.language === 'vi' ? 'Đã ghi nhận kết quả duyệt. Làm mới danh sách để xem bài hoặc bình luận mới.' : 'Review recorded. Refresh the queue to see new submissions or comments.'}</p>}
    {studentId && <p><Link to={`/staff/students/${studentId}`}>{i18n.language === 'vi' ? 'Xem hồ sơ học sinh' : 'View student profile'}</Link> · <Link to="/community#review-desk-title">{i18n.language === 'vi' ? 'Xem tất cả bài cần duyệt' : 'Show everyone’s work'}</Link></p>}
    {loading ? <p role="status">{copy.loading}</p> : <>
      {projects.length === 0 ? <p>{copy.queueEmpty}</p> : <div className="together-review-list">{projects.map(project => <ReviewProject key={`${project.id}:${project.updated_at}`} project={project} onDone={projectReviewed} onNoteChange={dirty => markNote(`project:${project.id}`, dirty)} onBusyChange={markBusy} onRefresh={refresh} />)}</div>}
      {moreProjects && <button className="secondary" disabled={loadingMore} onClick={() => void more('projects')}>{copy.more}</button>}
      <h3>{studentId ? (i18n.language === 'vi' ? 'Tất cả bình luận trong lớp' : 'All classroom comments') : commentsCopy.teacher}</h3><p>{commentsCopy.teacherBody}</p>
      {comments.length === 0 ? <p>{commentsCopy.queueEmpty}</p> : <div className="together-review-list">{comments.map(comment => <ReviewDiscussion key={`${comment.id}:${comment.updated_at}`} comment={comment} onDone={commentReviewed} onNoteChange={dirty => markNote(`comment:${comment.id}`, dirty)} onBusyChange={markBusy} onRefresh={refresh} />)}</div>}
      {moreComments && <button className="secondary" disabled={loadingMore} onClick={() => void more('comments')}>{copy.more}</button>}
    </>}
    {failure !== null && <div role="alert"><p>{requestFailureMessage(failure, i18n.language, copy.loadError)}</p><button className="secondary" onClick={refresh}>{copy.retry}</button></div>}
  </section>;
}
type ReviewControls = { onNoteChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onRefresh: () => void };
function ReviewProject({ project, onDone, onNoteChange, onBusyChange, onRefresh }: ReviewControls & { project: ReviewProjectRecord; onDone: (project: LearningProject) => void }) {
  const { i18n } = useTranslation(); const copy = togetherCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [note, setNote] = useState(project.review_note ?? ''); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function act(action: 'publish' | 'request_changes') {
    if (busy || (action === 'publish' && !checked) || (action === 'request_changes' && !note.trim())) return;
    setBusy(true); onBusyChange(true); setError(null);
    try { const result = await reviewProject(project, action, note); if (mounted.current) onDone(result); }
    catch (failure) { if (mounted.current) setError(failure); }
    finally { onBusyChange(false); if (mounted.current) setBusy(false); }
  }
  return <details className="together-review-item"><summary><span>{project.title}</span><span className="together-status">{copy.status[project.status]}</span></summary>
    <p><Link to={`/staff/students/${project.owner_user_id}`}>{project.display_name?.trim() || (i18n.language === 'vi' ? 'Xem hồ sơ người viết' : 'View the writer’s profile')}</Link></p><p><strong>{project.book_title}</strong></p><dl className="together-project-content">{(['summary', 'takeaways', 'recommendation', 'question'] as const).filter(field => project[field]).map(field => <div key={field}><dt>{copy[field]}</dt><dd>{project[field]}</dd></div>)}</dl>
    {project.status === 'changes_requested' && <p>{i18n.language === 'vi' ? 'Đang chờ học sinh chỉnh sửa và gửi lại. Bản này chưa thể đăng.' : 'Waiting for the learner to revise and resubmit. This version cannot be published.'}</p>}
    <label htmlFor={`review-note-${project.id}`}>{copy.reviewLabel}</label><textarea id={`review-note-${project.id}`} maxLength={1000} rows={3} value={note} disabled={busy || project.status === 'changes_requested'} onChange={event => { setNote(event.target.value); onNoteChange(event.target.value !== (project.review_note ?? '')); }} />
    {project.status === 'submitted' && <label className="together-checkbox"><input type="checkbox" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />{copy.safetyCheck}</label>}
    <div className="together-actions">{project.status === 'submitted' && <button className="primary" disabled={busy || !checked} onClick={() => void act('publish')}>{copy.publish}</button>}<button className="secondary" disabled={busy || !note.trim() || project.status === 'changes_requested'} onClick={() => void act('request_changes')}>{project.status === 'published' ? copy.remove : copy.requestChanges}</button></div>
    {!note.trim() && <p className="field-help">{copy.noteRequired}</p>}{error !== null && <div role="alert"><p>{requestFailureMessage(error, i18n.language, copy.actionError)}</p>{isProjectConflict(error) && <button type="button" className="secondary" onClick={onRefresh}>{i18n.language === 'vi' ? 'Làm mới danh sách duyệt' : 'Refresh review queue'}</button>}</div>}
  </details>;
}
function ReviewDiscussion({ comment, onDone, onNoteChange, onBusyChange, onRefresh }: ReviewControls & { comment: ReviewComment; onDone: (comment: OwnComment) => void }) {
  const { i18n } = useTranslation(); const copy = feedbackCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [note, setNote] = useState(comment.review_note ?? ''); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function act(action: 'approve' | 'reject') {
    if (busy || (action === 'approve' && !checked) || (action === 'reject' && !note.trim())) return;
    setBusy(true); onBusyChange(true); setError(null);
    try { const result = await reviewComment(comment, action, note); if (mounted.current) onDone(result); }
    catch (failure) { if (mounted.current) setError(failure); }
    finally { onBusyChange(false); if (mounted.current) setBusy(false); }
  }
  return <details className="together-review-item"><summary><span>{comment.project_title}</span><span className="together-status">{copy.status[comment.status]}</span></summary><p>{comment.body}</p>
    <label htmlFor={`comment-review-${comment.id}`}>{copy.note}</label><textarea id={`comment-review-${comment.id}`} rows={2} maxLength={1000} disabled={busy} value={note} onChange={event => { setNote(event.target.value); onNoteChange(event.target.value !== (comment.review_note ?? '')); }} />
    {comment.status === 'pending' && <label className="together-checkbox"><input type="checkbox" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />{copy.consent}</label>}
    <div className="together-actions">{comment.status === 'pending' && <button className="primary" disabled={busy || !checked} onClick={() => void act('approve')}>{copy.approve}</button>}<button className="secondary" disabled={busy || !note.trim()} onClick={() => void act('reject')}>{copy.reject}</button></div>
    {!note.trim() && <p className="field-help">{copy.noteRequired}</p>}{error !== null && <div role="alert"><p>{requestFailureMessage(error, i18n.language, copy.failure)}</p>{isProjectConflict(error) && <button type="button" className="secondary" onClick={onRefresh}>{i18n.language === 'vi' ? 'Làm mới danh sách duyệt' : 'Refresh review queue'}</button>}</div>}
  </details>;
}
