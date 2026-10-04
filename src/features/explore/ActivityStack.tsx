import type { Topic } from '../../demo/catalogue';
import { ActivityCard } from './ActivityCard';

const topics: Topic[] = ['nature', 'stories', 'science'];

export function ActivityStack() {
  return (
    <div className="topic-grid explore-stack">
      {topics.map(topic => (
        <div
          key={topic}
          className={`explore-stack__item explore-stack__item--${topic}`}
        >
          <ActivityCard topic={topic} />
        </div>
      ))}
    </div>
  );
}
