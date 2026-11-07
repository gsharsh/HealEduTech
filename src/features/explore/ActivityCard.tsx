import { useTranslation } from 'react-i18next';
import type { Topic } from '../../demo/catalogue';
import './activity-card.css';

export function ActivityCard({ topic, headingLevel = 2 }: { topic: Topic; headingLevel?: 2 | 3 }) {
  const { t } = useTranslation();
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const DetailHeading = headingLevel === 3 ? 'h4' : 'h3';

  return <article className="explore-activity-sheet">
    <Heading>{t(`activities.${topic}.title`)}</Heading>
    <p>{t(`activities.${topic}.body`)}</p>
    <dl className="explore-activity-materials"><dt>{t('activityMaterials')}</dt><dd>{t(`activities.${topic}.materials`)}</dd></dl>
    <DetailHeading>{t('startHere')}</DetailHeading>
    <ol>{(t(`activities.${topic}.steps`, { returnObjects: true }) as string[]).map((step, index) => <li key={index}>{step}</li>)}</ol>
    <DetailHeading>{t('activityReflect')}</DetailHeading>
    <p>{t(`activities.${topic}.reflection`)}</p>
  </article>;
}
