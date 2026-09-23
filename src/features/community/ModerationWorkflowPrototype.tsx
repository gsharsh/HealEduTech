import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
type CommentStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export function ModerationWorkflowPrototype() {
  const { t } = useTranslation();
  const noteId = useId();
  const [showcaseStatus, setShowcaseStatus] = useState<ReviewStatus>('pending');
  const [commentStatus, setCommentStatus] = useState<CommentStatus>('pending');
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [withdrawalRequested, setWithdrawalRequested] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [noteError, setNoteError] = useState(false);
  const [announcementKey, setAnnouncementKey] = useState<string | null>(null);

  function actOnShowcase(action: ReviewStatus) {
    if (action === 'rejected' && !reviewNote.trim()) {
      setNoteError(true);
      return;
    }
    setNoteError(false);
    setShowcaseStatus(action);
    if (action !== 'approved') {
      setCommentsEnabled(false);
      setCommentStatus('pending');
    }
    if (action === 'hidden') setWithdrawalRequested(false);
    setAnnouncementKey(`moderationPrototype.announcements.${action}`);
  }

  function resetShowcase() {
    setShowcaseStatus('pending');
    setCommentStatus('pending');
    setCommentsEnabled(false);
    setWithdrawalRequested(false);
    setReviewNote('');
    setNoteError(false);
    setAnnouncementKey('moderationPrototype.announcements.reset');
  }

  function actOnComment(action: CommentStatus) {
    setCommentStatus(action);
    setAnnouncementKey(`moderationPrototype.commentAnnouncements.${action}`);
  }

  const showcaseVisible = showcaseStatus === 'approved' && !withdrawalRequested;
  const commentVisible = showcaseVisible && commentsEnabled && commentStatus === 'approved';

  return <section className="moderation-preview" aria-labelledby="moderation-preview-heading">
    <div className="moderation-preview__heading">
      <div>
        <span className="eyebrow">{t('moderationPrototype.kicker')}</span>
        <h2 id="moderation-preview-heading">{t('moderationPrototype.title')}</h2>
        <p>{t('moderationPrototype.intro')}</p>
      </div>
      <span className="moderation-preview__warning">{t('moderationPrototype.openPreview')}</span>
    </div>

    <div className="moderation-columns">
      <article className="moderation-item">
        <div className="moderation-item__topline">
          <span>{t('moderationPrototype.showcaseLabel')}</span>
          <strong>{t(`moderationPrototype.status.${showcaseStatus}`)}</strong>
        </div>
        <h3>{t('moderationPrototype.sampleTitle')}</h3>
        <p>{t('moderationPrototype.sampleSummary')}</p>
        <p className="moderation-visibility">{showcaseVisible ? t('moderationPrototype.visibleInPreview') : t('moderationPrototype.notVisible')}</p>

        {showcaseStatus === 'pending' && <>
          <label htmlFor={noteId}>{t('moderationPrototype.reviewNoteLabel')}</label>
          <textarea
            id={noteId}
            value={reviewNote}
            aria-invalid={noteError}
            aria-describedby={noteError ? `${noteId}-error` : `${noteId}-help`}
            onChange={event => {
              setReviewNote(event.target.value);
              if (noteError && event.target.value.trim()) setNoteError(false);
            }}
          />
          <p className="field-help" id={`${noteId}-help`}>{t('moderationPrototype.reviewNoteHelp')}</p>
          {noteError && <p className="field-error" id={`${noteId}-error`} role="alert">{t('moderationPrototype.reviewNoteRequired')}</p>}
          <div className="moderation-actions">
            <button className="primary" type="button" onClick={() => actOnShowcase('approved')}>{t('moderationPrototype.approve')}</button>
            <button className="secondary" type="button" onClick={() => actOnShowcase('rejected')}>{t('moderationPrototype.reject')}</button>
          </div>
        </>}

        {showcaseStatus === 'approved' && <div className="moderation-actions">
          {!withdrawalRequested && <button className="secondary" type="button" onClick={() => {
            setWithdrawalRequested(true);
            setCommentsEnabled(false);
            setAnnouncementKey('moderationPrototype.announcements.withdrawal');
          }}>{t('moderationPrototype.requestWithdrawal')}</button>}
          <button className="secondary" type="button" onClick={() => actOnShowcase('hidden')}>{t('moderationPrototype.hideNow')}</button>
        </div>}

        {withdrawalRequested && showcaseStatus === 'approved' && <p className="withdrawal-notice">{t('moderationPrototype.withdrawalPending')}</p>}
        {showcaseStatus !== 'pending' && <button className="text-button" type="button" onClick={resetShowcase}>{t('moderationPrototype.reset')}</button>}
      </article>

      <article className="moderation-item">
        <div className="moderation-item__topline">
          <span>{t('moderationPrototype.commentsLabel')}</span>
          <strong>{commentsEnabled ? t('moderationPrototype.commentsOn') : t('moderationPrototype.commentsOff')}</strong>
        </div>
        <p>{t('moderationPrototype.coverage')}</p>
        <button
          className="secondary"
          type="button"
          disabled={!showcaseVisible}
          onClick={() => {
            setCommentsEnabled(value => !value);
            setAnnouncementKey(commentsEnabled ? 'moderationPrototype.announcements.commentsPaused' : 'moderationPrototype.announcements.commentsEnabled');
          }}
        >{commentsEnabled ? t('moderationPrototype.pauseComments') : t('moderationPrototype.enableComments')}</button>

        <div className={`comment-preview ${!commentsEnabled ? 'is-disabled' : ''}`}>
          <span>{t(`moderationPrototype.commentStatus.${commentStatus}`)}</span>
          <p>“{t('moderationPrototype.sampleComment')}”</p>
          <p className="moderation-visibility">{commentVisible ? t('moderationPrototype.commentVisible') : t('moderationPrototype.commentNotVisible')}</p>
          {commentsEnabled && commentStatus === 'pending' && <div className="moderation-actions">
            <button className="primary" type="button" onClick={() => actOnComment('approved')}>{t('moderationPrototype.approveComment')}</button>
            <button className="secondary" type="button" onClick={() => actOnComment('rejected')}>{t('moderationPrototype.rejectComment')}</button>
          </div>}
          {commentsEnabled && commentStatus === 'approved' && <button className="secondary" type="button" onClick={() => actOnComment('hidden')}>{t('moderationPrototype.hideComment')}</button>}
          {commentsEnabled && (commentStatus === 'rejected' || commentStatus === 'hidden') && <button className="text-button" type="button" onClick={() => actOnComment('pending')}>{t('moderationPrototype.resetComment')}</button>}
        </div>
      </article>
    </div>
    <p className="moderation-preview__announcement" role="status">{announcementKey ? t(announcementKey) : t('moderationPrototype.boundary')}</p>
  </section>;
}
