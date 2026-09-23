import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DraftStatus = 'draft' | 'ready_for_feedback';

type SavedProject = {
  title: string;
  summary: string;
  exploreMore: 'yes' | 'not_sure' | 'no';
  status: DraftStatus;
};

export function ProjectFeedbackPrototype() {
  const { t } = useTranslation();
  const titleId = useId();
  const summaryId = useId();
  const interestId = useId();
  const statusId = useId();
  const [project, setProject] = useState<SavedProject | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [exploreMore, setExploreMore] = useState<SavedProject['exploreMore']>('not_sure');
  const [status, setStatus] = useState<DraftStatus>('draft');
  const [editing, setEditing] = useState(true);
  const [errors, setErrors] = useState({ title: false, summary: false });
  const [saved, setSaved] = useState(false);

  function saveProject() {
    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    const nextErrors = { title: !cleanTitle, summary: !cleanSummary };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.summary) return;
    setProject({ title: cleanTitle, summary: cleanSummary, exploreMore, status });
    setTitle(cleanTitle);
    setSummary(cleanSummary);
    setEditing(false);
    setSaved(true);
  }

  function editProject() {
    setSaved(false);
    setErrors({ title: false, summary: false });
    setEditing(true);
  }

  function cancelEditing() {
    if (!project) return;
    setTitle(project.title);
    setSummary(project.summary);
    setExploreMore(project.exploreMore);
    setStatus(project.status);
    setErrors({ title: false, summary: false });
    setSaved(false);
    setEditing(false);
  }

  return <section className="project-prototype" aria-labelledby="project-prototype-heading">
    <div className="project-prototype__heading">
      <div>
        <span className="eyebrow">{t('projectPrototype.kicker')}</span>
        <h2 id="project-prototype-heading">{t('projectPrototype.title')}</h2>
        <p>{t('projectPrototype.intro')}</p>
      </div>
      <span className="project-prototype__privacy">{t('projectPrototype.privatePreview')}</span>
    </div>

    {editing ? <div className="project-form">
      <label htmlFor={titleId}>{t('projectPrototype.titleLabel')}</label>
      <input
        id={titleId}
        maxLength={100}
        value={title}
        aria-invalid={errors.title}
        aria-describedby={errors.title ? `${titleId}-error` : undefined}
        onChange={event => {
          setTitle(event.target.value);
          if (errors.title && event.target.value.trim()) setErrors(current => ({ ...current, title: false }));
        }}
      />
      {errors.title && <p className="field-error" id={`${titleId}-error`} role="alert">{t('projectPrototype.titleRequired')}</p>}

      <label htmlFor={summaryId}>{t('projectPrototype.summaryLabel')}</label>
      <textarea
        id={summaryId}
        maxLength={600}
        value={summary}
        aria-invalid={errors.summary}
        aria-describedby={errors.summary ? `${summaryId}-error` : `${summaryId}-help`}
        onChange={event => {
          setSummary(event.target.value);
          if (errors.summary && event.target.value.trim()) setErrors(current => ({ ...current, summary: false }));
        }}
      />
      <p className="field-help" id={`${summaryId}-help`}>{t('projectPrototype.summaryHelp')}</p>
      {errors.summary && <p className="field-error" id={`${summaryId}-error`} role="alert">{t('projectPrototype.summaryRequired')}</p>}

      <div className="project-form__row">
        <div>
          <label htmlFor={interestId}>{t('projectPrototype.exploreMoreLabel')}</label>
          <select id={interestId} value={exploreMore} onChange={event => setExploreMore(event.target.value as SavedProject['exploreMore'])}>
            <option value="yes">{t('projectPrototype.exploreMore.yes')}</option>
            <option value="not_sure">{t('projectPrototype.exploreMore.not_sure')}</option>
            <option value="no">{t('projectPrototype.exploreMore.no')}</option>
          </select>
        </div>
        <div>
          <label htmlFor={statusId}>{t('projectPrototype.statusLabel')}</label>
          <select id={statusId} value={status} onChange={event => setStatus(event.target.value as DraftStatus)}>
            <option value="draft">{t('projectPrototype.status.draft')}</option>
            <option value="ready_for_feedback">{t('projectPrototype.status.ready_for_feedback')}</option>
          </select>
        </div>
      </div>
      <div className="project-form__actions">
        <button className="primary" type="button" onClick={saveProject}>{t('projectPrototype.save')}</button>
        {project && <button className="secondary" type="button" onClick={cancelEditing}>{t('cancel')}</button>}
      </div>
    </div> : project && <div className="project-saved">
      <div className="project-saved__status">
        <span>{t(`projectPrototype.status.${project.status}`)}</span>
        <span>{t('projectPrototype.notPublished')}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <dl>
        <div><dt>{t('projectPrototype.exploreMoreLabel')}</dt><dd>{t(`projectPrototype.exploreMore.${project.exploreMore}`)}</dd></div>
        <div><dt>{t('projectPrototype.visibilityLabel')}</dt><dd>{t('projectPrototype.visibility')}</dd></div>
      </dl>
      <button className="secondary" type="button" onClick={editProject}>{t('projectPrototype.edit')}</button>
    </div>}

    <p className="project-prototype__notice" role="status">{saved ? t('projectPrototype.saved') : t('projectPrototype.notice')}</p>

    {project?.status === 'ready_for_feedback' && !editing && <aside className="feedback-example">
      <span className="eyebrow">{t('projectPrototype.feedbackKicker')}</span>
      <h3>{t('projectPrototype.feedbackTitle')}</h3>
      <p>{t('projectPrototype.feedbackIntro')}</p>
      <ul>
        <li><strong>{t('projectPrototype.feedback.didWellLabel')}</strong>{t('projectPrototype.feedback.didWell')}</li>
        <li><strong>{t('projectPrototype.feedback.questionLabel')}</strong>{t('projectPrototype.feedback.question')}</li>
        <li><strong>{t('projectPrototype.feedback.nextLabel')}</strong>{t('projectPrototype.feedback.next')}</li>
      </ul>
      <p className="feedback-example__boundary">{t('projectPrototype.feedbackBoundary')}</p>
    </aside>}
  </section>;
}
