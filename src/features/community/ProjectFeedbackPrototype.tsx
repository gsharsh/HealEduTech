import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DraftStatus = 'draft' | 'ready_for_feedback';
type PresentationOutline = { topic: string; tried: string; show: string; question: string; nextStep: string; rehearsed: boolean; timed: boolean; ready: boolean };
type SavedProject = { title: string; summary: string; exploreMore: 'yes' | 'not_sure' | 'no'; status: DraftStatus; outline: PresentationOutline };

const emptyOutline: PresentationOutline = { topic: '', tried: '', show: '', question: '', nextStep: '', rehearsed: false, timed: false, ready: false };
const presentationCopy = {
  en: {
    outlineToggle: 'Add a presentation outline (optional)', outlineHelp: 'Use these prompts to rehearse a short, supported presentation. You can leave any prompt blank.',
    topicLabel: 'What is your presentation about?', triedLabel: 'What did you try or discover?', showLabel: 'What would you like to show?', questionLabel: 'What question would you like to ask?', nextStepLabel: 'What would you try next?',
    rehearsalTitle: 'Rehearsal checklist (optional)', rehearsed: 'I practised saying it in my own words', timed: 'I checked that it fits the time I have', ready: 'I know what I want help with',
    outlineTitle: 'Presentation outline', notAdded: 'Not added yet', print: 'Print outline', printHelp: 'This opens your browser print dialog. Nothing is sent or published.', savedPreview: 'Saved preview',
  },
  vi: {
    outlineToggle: 'Thêm dàn ý thuyết trình (không bắt buộc)', outlineHelp: 'Dùng các câu hỏi này để tập thuyết trình ngắn với sự hỗ trợ. Em có thể bỏ trống câu nào cũng được.',
    topicLabel: 'Em sẽ thuyết trình về điều gì?', triedLabel: 'Em đã thử hoặc khám phá điều gì?', showLabel: 'Em muốn cho mọi người xem điều gì?', questionLabel: 'Em muốn hỏi câu hỏi nào?', nextStepLabel: 'Em sẽ thử điều gì tiếp theo?',
    rehearsalTitle: 'Danh sách tập dượt (không bắt buộc)', rehearsed: 'Em đã tập nói bằng lời của mình', timed: 'Em đã kiểm tra thời lượng mình có', ready: 'Em biết mình muốn được hỗ trợ điều gì',
    outlineTitle: 'Dàn ý thuyết trình', notAdded: 'Chưa thêm', print: 'In dàn ý', printHelp: 'Thao tác này mở hộp thoại in của trình duyệt. Nội dung không được gửi hay đăng.', savedPreview: 'Bản xem thử đã lưu',
  },
} as const;

export function ProjectFeedbackPrototype() {
  const { t, i18n } = useTranslation();
  const copy = presentationCopy[i18n.language === 'vi' ? 'vi' : 'en'];
  const titleId = useId(); const summaryId = useId(); const interestId = useId(); const statusId = useId();
  const topicId = useId(); const triedId = useId(); const showId = useId(); const questionId = useId(); const nextStepId = useId(); const outlineHeadingId = useId();
  const titleRef = useRef<HTMLInputElement>(null); const summaryRef = useRef<HTMLTextAreaElement>(null); const savedTitleRef = useRef<HTMLHeadingElement>(null);
  const [project, setProject] = useState<SavedProject | null>(null);
  const [title, setTitle] = useState(''); const [summary, setSummary] = useState('');
  const [exploreMore, setExploreMore] = useState<SavedProject['exploreMore']>('not_sure'); const [status, setStatus] = useState<DraftStatus>('draft');
  const [outline, setOutline] = useState<PresentationOutline>(emptyOutline); const [editing, setEditing] = useState(true);
  const [errors, setErrors] = useState({ title: false, summary: false }); const [saved, setSaved] = useState(false);

  function saveProject() {
    const cleanTitle = title.trim(); const cleanSummary = summary.trim(); const nextErrors = { title: !cleanTitle, summary: !cleanSummary };
    setErrors(nextErrors); if (nextErrors.title || nextErrors.summary) { if (nextErrors.title) titleRef.current?.focus(); else summaryRef.current?.focus(); return; }
    const cleanOutline = { topic: outline.topic.trim(), tried: outline.tried.trim(), show: outline.show.trim(), question: outline.question.trim(), nextStep: outline.nextStep.trim(), rehearsed: outline.rehearsed, timed: outline.timed, ready: outline.ready };
    setProject({ title: cleanTitle, summary: cleanSummary, exploreMore, status, outline: cleanOutline }); setTitle(cleanTitle); setSummary(cleanSummary); setOutline(cleanOutline); setEditing(false); setSaved(true);
  }
  function editProject() { setSaved(false); setErrors({ title: false, summary: false }); setEditing(true); }
  function cancelEditing() {
    if (!project) return; setTitle(project.title); setSummary(project.summary); setExploreMore(project.exploreMore); setStatus(project.status); setOutline(project.outline); setErrors({ title: false, summary: false }); setSaved(false); setEditing(false);
  }

  useEffect(() => {
    if (!project) return;
    if (editing) titleRef.current?.focus();
    else savedTitleRef.current?.focus();
  }, [editing, project]);

  const outlineFields = [
    ['topic', copy.topicLabel, topicId], ['tried', copy.triedLabel, triedId], ['show', copy.showLabel, showId], ['question', copy.questionLabel, questionId], ['nextStep', copy.nextStepLabel, nextStepId],
  ] as const;

  return <section className={`project-prototype${project && !editing ? ' project-prototype--saved' : ''}`} aria-labelledby="project-prototype-heading">
    <div className="project-prototype__heading"><div><span className="eyebrow">{t('projectPrototype.kicker')}</span><h2 id="project-prototype-heading">{t('projectPrototype.title')}</h2><p>{t('projectPrototype.intro')}</p></div><span className="project-prototype__privacy">{t('projectPrototype.privatePreview')}</span></div>
    <p className="project-prototype__notice">{t('projectPrototype.notice')}</p>
    {editing ? <div className="project-form">
      <label htmlFor={titleId}>{t('projectPrototype.titleLabel')}</label>
      <input ref={titleRef} id={titleId} maxLength={100} value={title} aria-invalid={errors.title} aria-describedby={errors.title ? `${titleId}-error` : undefined} onChange={event => { setTitle(event.target.value); if (errors.title && event.target.value.trim()) setErrors(current => ({ ...current, title: false })); }} />
      {errors.title && <p className="field-error" id={`${titleId}-error`} role="alert">{t('projectPrototype.titleRequired')}</p>}
      <label htmlFor={summaryId}>{t('projectPrototype.summaryLabel')}</label>
      <textarea ref={summaryRef} id={summaryId} maxLength={600} value={summary} aria-invalid={errors.summary} aria-describedby={errors.summary ? `${summaryId}-error` : `${summaryId}-help`} onChange={event => { setSummary(event.target.value); if (errors.summary && event.target.value.trim()) setErrors(current => ({ ...current, summary: false })); }} />
      <p className="field-help" id={`${summaryId}-help`}>{t('projectPrototype.summaryHelp')}</p>
      {errors.summary && <p className="field-error" id={`${summaryId}-error`} role="alert">{t('projectPrototype.summaryRequired')}</p>}
      <details className="project-outline"><summary>{copy.outlineToggle}</summary><p className="field-help">{copy.outlineHelp}</p>{outlineFields.map(([key, label, id]) => <div key={key}><label htmlFor={id}>{label}</label>{key === 'topic' ? <input id={id} maxLength={160} value={outline[key]} onChange={event => setOutline(current => ({ ...current, [key]: event.target.value }))} /> : <textarea id={id} maxLength={key === 'tried' || key === 'show' ? 500 : 300} value={outline[key]} onChange={event => setOutline(current => ({ ...current, [key]: event.target.value }))} />}</div>)}</details>
      <fieldset className="project-checklist"><legend>{copy.rehearsalTitle}</legend><label><input type="checkbox" checked={outline.rehearsed} onChange={event => setOutline(current => ({ ...current, rehearsed: event.target.checked }))} />{copy.rehearsed}</label><label><input type="checkbox" checked={outline.timed} onChange={event => setOutline(current => ({ ...current, timed: event.target.checked }))} />{copy.timed}</label><label><input type="checkbox" checked={outline.ready} onChange={event => setOutline(current => ({ ...current, ready: event.target.checked }))} />{copy.ready}</label></fieldset>
      <div className="project-form__row"><div><label htmlFor={interestId}>{t('projectPrototype.exploreMoreLabel')}</label><select id={interestId} value={exploreMore} onChange={event => setExploreMore(event.target.value as SavedProject['exploreMore'])}><option value="yes">{t('projectPrototype.exploreMore.yes')}</option><option value="not_sure">{t('projectPrototype.exploreMore.not_sure')}</option><option value="no">{t('projectPrototype.exploreMore.no')}</option></select></div><div><label htmlFor={statusId}>{t('projectPrototype.statusLabel')}</label><select id={statusId} value={status} onChange={event => setStatus(event.target.value as DraftStatus)}><option value="draft">{t('projectPrototype.status.draft')}</option><option value="ready_for_feedback">{t('projectPrototype.status.ready_for_feedback')}</option></select></div></div>
      <div className="project-form__actions"><button className="primary" type="button" onClick={saveProject}>{t('projectPrototype.save')}</button>{project && <button className="secondary" type="button" onClick={cancelEditing}>{t('cancel')}</button>}</div>
    </div> : project && <div className="project-saved">
      <div className="project-saved__status"><span>{copy.savedPreview}</span><span>{t(`projectPrototype.status.${project.status}`)}</span><span>{t('projectPrototype.notPublished')}</span></div><h3 ref={savedTitleRef} tabIndex={-1}>{project.title}</h3><p>{project.summary}</p>
      <dl><div><dt>{t('projectPrototype.exploreMoreLabel')}</dt><dd>{t(`projectPrototype.exploreMore.${project.exploreMore}`)}</dd></div><div><dt>{t('projectPrototype.visibilityLabel')}</dt><dd>{t('projectPrototype.visibility')}</dd></div></dl>
      <div className="project-saved__outline" aria-labelledby={outlineHeadingId}>
        <h4 id={outlineHeadingId}>{copy.outlineTitle}</h4>
        <dl>{outlineFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{project.outline[key] || copy.notAdded}</dd></div>)}<div><dt>{copy.rehearsalTitle}</dt><dd>{[project.outline.rehearsed && copy.rehearsed, project.outline.timed && copy.timed, project.outline.ready && copy.ready].filter(Boolean).join(' · ') || copy.notAdded}</dd></div></dl>
      </div>
      <div className="project-saved__actions"><button className="secondary" type="button" onClick={editProject}>{t('projectPrototype.edit')}</button><button className="secondary" type="button" onClick={() => window.print()}>{copy.print}</button></div><p className="field-help">{copy.printHelp}</p>
    </div>}
    {saved && <p className="project-prototype__notice" role="status">{t('projectPrototype.saved')}</p>}
    {project?.status === 'ready_for_feedback' && !editing && <aside className="feedback-example"><span className="eyebrow">{t('projectPrototype.feedbackKicker')}</span><h3>{t('projectPrototype.feedbackTitle')}</h3><p>{t('projectPrototype.feedbackIntro')}</p><ul><li><strong>{t('projectPrototype.feedback.didWellLabel')}</strong>{t('projectPrototype.feedback.didWell')}</li><li><strong>{t('projectPrototype.feedback.questionLabel')}</strong>{t('projectPrototype.feedback.question')}</li><li><strong>{t('projectPrototype.feedback.nextLabel')}</strong>{t('projectPrototype.feedback.next')}</li></ul><p className="feedback-example__boundary">{t('projectPrototype.feedbackBoundary')}</p></aside>}
  </section>;
}
