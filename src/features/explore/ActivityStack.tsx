import type { Topic } from '../../demo/catalogue';
import { useScrollStack } from '../../components/ui/ScrollStack';
import { ActivityCard } from './ActivityCard';

const topics: Topic[] = ['nature', 'stories', 'science'];

export function ActivityStack() {
  const { stackRef, itemRefs } = useScrollStack<HTMLDivElement>();

  return (
    <div className="topic-grid explore-stack" ref={stackRef}>
      {topics.map((topic, index) => (
        <div
          key={topic}
          ref={element => { itemRefs.current[index] = element; }}
          className={`explore-stack__item explore-stack__item--${topic}`}
        >
          <ActivityCard topic={topic} />
        </div>
      ))}
    </div>
  );
}
