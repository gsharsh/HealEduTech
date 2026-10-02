import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type GoalProgress = 'planned' | 'in_progress' | 'completed';

export function WeeklyGoalPrototype() {
  const { t } = useTranslation();
  const titleId = useId();
  const progressId = useId();
  const [goal, setGoal] = useState<{ title: string | null; progress: GoalProgress }>({ title: null, progress: 'planned' });
  const [draftTitle, setDraftTitle] = useState('');
  const [draftProgress, setDraftProgress] = useState<GoalProgress>(goal.progress);
  const [editing, setEditing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const goalTitle = goal.title ?? t('goalTask');

  function beginEditing() {
    setDraftTitle(goalTitle);
    setDraftProgress(goal.progress);
    setShowError(false);
    setShowSavedMessage(false);
    setEditing(true);
  }

  function cancelEditing() {
    setDraftTitle(goalTitle);
    setDraftProgress(goal.progress);
    setShowError(false);
    setEditing(false);
  }

  function saveGoal() {
    const title = draftTitle.trim();
    if (!title) {
      setShowError(true);
      return;
    }
    setGoal({ title, progress: draftProgress });
    setDraftTitle(title);
    setShowError(false);
    setEditing(false);
    setShowSavedMessage(true);
  }

  const progressLabel = t(`goalProgress.${goal.progress}`);

  return <section className="goal-panel" aria-labelledby={`${titleId}-heading`}>
    <div className="section-kicker">
      <span>{t('thisWeek')}</span>
      <span aria-hidden="true">◷</span>
    </div>
    <h2 id={`${titleId}-heading`}>{t('oneSmallDiscovery')}</h2>
    <p>{t('goalBody')}</p>
    <p className="goal-preview-note">{t('goalPreviewOnly')}</p>
    {editing ? <div className="goal-editor">
      <label htmlFor={titleId}>{t('goalTitleLabel')}</label>
      <input
        id={titleId}
        maxLength={120}
        value={draftTitle}
        aria-describedby={showError ? `${titleId}-error` : undefined}
        aria-invalid={showError}
        onChange={event => {
          setDraftTitle(event.target.value);
          if (showError && event.target.value.trim()) setShowError(false);
        }}
      />
      {showError && <p className="goal-error" id={`${titleId}-error`} role="alert">{t('goalTitleRequired')}</p>}
      <label htmlFor={progressId}>{t('goalProgressLabel')}</label>
      <select id={progressId} value={draftProgress} onChange={event => setDraftProgress(event.target.value as GoalProgress)}>
        <option value="planned">{t('goalProgress.planned')}</option>
        <option value="in_progress">{t('goalProgress.in_progress')}</option>
        <option value="completed">{t('goalProgress.completed')}</option>
      </select>
      <div className="goal-actions">
        <button type="button" className="primary" onClick={saveGoal}>{t('saveGoal')}</button>
        <button type="button" className="secondary" onClick={cancelEditing}>{t('cancel')}</button>
      </div>
    </div> : <div className={`goal-summary goal-summary--${goal.progress}`}>
      <span className="goal-status">{progressLabel}</span>
      <p className="goal-title">{goalTitle}</p>
      <button type="button" className="secondary" onClick={beginEditing}>{t('editGoal')}</button>
    </div>}
    <p className="goal-result" role="status">{showSavedMessage ? t('goalSavedForPreview') : t(goal.progress === 'completed' ? 'goalDone' : 'goalEncourage')}</p>
  </section>;
}
