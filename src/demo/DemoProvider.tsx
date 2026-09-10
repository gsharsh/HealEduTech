import { useState, type ReactNode } from 'react';
import { DemoContext } from './context';
import type { Topic } from './catalogue';
export function DemoProvider({ children }: {
  children: ReactNode;
}) {
  const [reading, updateReading] = useState<Record<string, 'reading' | 'finished'>>({ garden: 'reading' });
  const [goalDone, setGoalDone] = useState(false);
  const [interests, setInterests] = useState<Topic[]>(['nature']);
  const [borrowed, setBorrowed] = useState(true);
  return <DemoContext.Provider value={{ reading, setReading: (id, status) => updateReading(previous => ({ ...previous, [id]: status })), goalDone, toggleGoal: () => setGoalDone(value => !value), interests, toggleInterest: topic => setInterests(previous => previous.includes(topic) ? previous.filter(item => item !== topic) : [...previous, topic]), borrowed, toggleLoan: () => setBorrowed(value => !value) }}>{children}</DemoContext.Provider>;
}
