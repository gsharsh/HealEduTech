import { createContext, useContext } from 'react';
import type { Topic } from './catalogue';
export interface DemoState {
  reading: Record<string, 'reading' | 'finished'>;
  setReading: (id: string, status: 'reading' | 'finished') => void;
  interests: Topic[];
  toggleInterest: (topic: Topic) => void;
  borrowed: boolean;
  toggleLoan: () => void;
}
export const DemoContext = createContext<DemoState | null>(null);
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value)
    throw new Error('DemoProvider is required');
  return value;
}
