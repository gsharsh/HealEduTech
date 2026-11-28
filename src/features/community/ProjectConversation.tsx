import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../auth/context';
import { requestFailureMessage } from '../../lib/requestFeedback';
import { feedbackCopy } from './togetherFeedbackCopy';
import { getOwnFeedback, getPublicFeedback, setEncouragement, submitComment, withdrawComment, type OwnFeedback, type PublicFeedback } from './togetherFeedbackData';

export function ProjectConversation({ projectId }: { projectId: string }) {
  const { user } = useAccount();
  return <Conversation key={`${projectId}:${user?.id ?? 'guest'}`} projectId={projectId} signedIn={Boolean(user)} />;
}
function Conversation({ projectId, signedIn }: { projectId: string; signedIn: boolean }) {
  const { i18n } = useTranslation();
  const copy = feedbackCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const [feedback, setFeedback] = useState<PublicFeedback | null>(null);
  const [own, setOwn] = useState<OwnFeedback>({ encouraged: false, comments: [] });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');
  const commentId = useRef(crypto.randomUUID());
  const attemptedBody = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([getPublicFeedback(projectId, controller.signal), signedIn ? getOwnFeedback(projectId, controller.signal) : Promise.resolve({ encouraged: false, comments: [] })]).then(([next, mine]) => {
      if (!controller.signal.aborted) { setFeedback(next); setOwn(mine); }
    }).catch(error => { if (!controller.signal.aborted) setFailure(error); });
    return () => controller.abort();
  }, [projectId, signedIn, revision]);
  async function mutate(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setFailure(null); setNotice('');
    try { await action(); } catch (error) { if (mounted.current) setFailure(error); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function encourage() {
    await mutate(async () => {
      const next = await setEncouragement(projectId, !own.encouraged);
      if (!mounted.current) return;
      setOwn(value => ({ ...value, encouraged: next.encouraged }));
      setFeedback(value => value ? { ...value, encouragement_count: next.encouragement_count } : value);
    });
  }
  async function comment() {
    const clean = body.trim(); if (!clean) return;
    if (attemptedBody.current !== null && attemptedBody.current !== clean) commentId.current = crypto.randomUUID();
    attemptedBody.current = clean;
    await mutate(async () => {
      const result = await submitComment(commentId.current, projectId, clean);
      if (!mounted.current) return;
      setOwn(value => ({ ...value, comments: [result, ...value.comments.filter(item => item.id !== result.id)] }));
      setBody(''); commentId.current = crypto.randomUUID(); attemptedBody.current = null; setNotice(copy.pending);
    });
  }
  return <section className="together-conversation" aria-label={copy.title}>
    <h4>{copy.title}</h4><p>{copy.body}</p>
    {!feedback && failure === null && <p role="status">{copy.loading}</p>}
    {feedback && <>
      <div className="together-actions"><span>{feedback.encouragement_count} {copy.encouragement}</span>{signedIn && <button type="button" className="secondary" aria-pressed={own.encouraged} disabled={busy} onClick={() => void encourage()}>{own.encouraged ? copy.remove : copy.encourage}</button>}</div>
      <h5>{copy.comments}</h5>
      {feedback.comments.length === 0 ? <p>{copy.none}</p> : <ul className="together-comment-list">{feedback.comments.map(item => <li key={item.id}><p>{item.body}</p></li>)}</ul>}
      {signedIn ? <>
        <form onSubmit={event => { event.preventDefault(); void comment(); }} aria-busy={busy}>
          <label htmlFor={`comment-${projectId}`}>{copy.label}</label><p className="field-help" id={`comment-hint-${projectId}`}>{copy.hint}</p>
          <textarea id={`comment-${projectId}`} rows={3} required maxLength={500} value={body} disabled={busy} onChange={event => { setBody(event.target.value); setNotice(''); }} aria-describedby={`comment-hint-${projectId}`} />
          <div className="together-actions"><button className="secondary" type="submit" disabled={busy || !body.trim() || own.comments.length >= 5}>{busy ? copy.saving : copy.submit}</button><span className="together-char-count">{body.length} / 500</span></div>
        </form>
        {own.comments.length >= 5 && <p>{i18n.language === 'vi' ? 'Mỗi người có thể giữ tối đa năm bình luận cho bài này. Xóa bình luận cũ trước khi thêm bình luận mới.' : 'You can keep up to five comments on this discovery. Remove an older comment before adding another.'}</p>}
        {own.comments.length > 0 && <div><h5>{copy.own}</h5><ul className="together-comment-list">{own.comments.map(item => <li key={item.id}>
          <span className="together-status">{copy.status[item.status]}</span><p>{item.body}</p>{item.review_note && <p className="together-feedback">{item.review_note}</p>}
          <button type="button" className="text-button" disabled={busy} onClick={() => void mutate(async () => { await withdrawComment(item.id); if (!mounted.current) return; setOwn(value => ({ ...value, comments: value.comments.filter(comment => comment.id !== item.id) })); setFeedback(value => value ? { ...value, comments: value.comments.filter(comment => comment.id !== item.id) } : value); setNotice(copy.withdrawn); })}>{copy.withdraw}</button>
        </li>)}</ul></div>}
      </> : <Link className="secondary" to="/sign-in?next=/community">{copy.signIn}</Link>}
    </>}
    {notice && <p role="status">{notice}</p>}
    {failure !== null && <div role="alert"><p>{requestFailureMessage(failure, i18n.language, copy.failure)}</p>{!feedback && <button type="button" className="secondary" onClick={() => { setFailure(null); setRevision(value => value + 1); }}>{copy.retry}</button>}</div>}
  </section>;
}
