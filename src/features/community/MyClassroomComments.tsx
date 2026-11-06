import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestFailureMessage } from '../../lib/requestFeedback';
import { getOwnFeedback, withdrawComment, type OwnComment } from './togetherFeedbackData';
import { feedbackCopy } from './togetherFeedbackCopy';

/** Explicit, bounded retrieval also lets readers remove comments on withdrawn work. */
export function MyClassroomComments() {
  const { i18n } = useTranslation(); const vi = i18n.language === 'vi';
  const [opened, setOpened] = useState(false);
  return <details className="together-own-feedback" onToggle={event => { if (event.currentTarget.open) setOpened(true); }}>
    <summary>{vi ? 'Bình luận của em trong lớp' : 'My classroom comments'}</summary>
    <p>{vi ? 'Xem hoặc xóa bình luận của em, kể cả khi bài gốc không còn công khai.' : 'Review or remove your comments, including comments on discoveries that are no longer public.'}</p>
    {opened && <OwnComments />}
  </details>;
}
function OwnComments() {
  const { i18n } = useTranslation(); const vi = i18n.language === 'vi'; const copy = feedbackCopy[vi ? 'vi' : 'en'];
  const [comments, setComments] = useState<OwnComment[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [failure, setFailure] = useState<unknown>(null); const [revision, setRevision] = useState(0);
  const mounted = useRef(true); useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    void getOwnFeedback(null, controller.signal).then(result => { if (!controller.signal.aborted) { setComments(result.comments); setLoading(false); } }).catch(error => { if (!controller.signal.aborted) { setFailure(error); setLoading(false); } });
    return () => controller.abort();
  }, [revision]);
  async function remove(id: string) {
    if (busy) return; setBusy(id); setFailure(null);
    try { await withdrawComment(id); if (mounted.current) setComments(value => value.filter(comment => comment.id !== id)); }
    catch (error) { if (mounted.current) setFailure(error); }
    finally { if (mounted.current) setBusy(null); }
  }
  return <>
    {loading ? <p role="status">{copy.loading}</p> : comments.length === 0 ? <p>{vi ? 'Em chưa có bình luận nào.' : 'You have no classroom comments yet.'}</p> : <ul className="together-comment-list">{comments.map(comment => <li key={comment.id}><span className="together-status">{copy.status[comment.status]}</span><p>{comment.body}</p>{comment.is_published === false && <p className="field-help">{vi ? 'Khám phá gốc hiện không công khai.' : 'The original discovery is currently private.'}</p>}{comment.review_note && <p className="together-feedback">{comment.review_note}</p>}<button className="text-button" type="button" disabled={busy !== null} onClick={() => void remove(comment.id)}>{copy.withdraw}</button></li>)}</ul>}
    <button className="secondary" type="button" disabled={loading || busy !== null} onClick={() => { setLoading(true); setFailure(null); setRevision(value => value + 1); }}>{vi ? 'Làm mới bình luận' : 'Refresh my comments'}</button>
    {failure !== null && <p role="alert">{requestFailureMessage(failure, i18n.language, copy.failure)}</p>}
  </>;
}
