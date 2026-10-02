import { useTranslation } from 'react-i18next';
import { ModerationWorkflowPrototype } from './ModerationWorkflowPrototype';
import { RecognitionCriteriaPrototype } from './RecognitionCriteriaPrototype';
import './community.css';

export function StaffTrainingPage() {
  const { t } = useTranslation();
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{t('staffTraining.kicker')}</span>
        <h1>{t('staffTraining.title')}</h1>
        <p>{t('staffTraining.body')}</p>
      </div>
    </div>
    <RecognitionCriteriaPrototype />
    <ModerationWorkflowPrototype />
  </>;
}
