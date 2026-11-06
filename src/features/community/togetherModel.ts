export type ProjectFormat = 'presentation' | 'review';
export type ProjectStatus = 'draft' | 'submitted' | 'published' | 'changes_requested';
export interface ProjectInput {
  book_title: string;
  title: string;
  format: ProjectFormat;
  summary: string;
  takeaways: string;
  recommendation: string;
  question: string;
}
export interface LearningProject extends ProjectInput {
  id: string;
  status: ProjectStatus;
  review_note: string | null;
  updated_at: string;
}
export interface PublishedProject extends ProjectInput {
  id: string;
  published_at: string;
}
export const projectLimits = { book_title: 200, title: 120, summary: 2000, takeaways: 2000, recommendation: 1000, question: 500 } as const;
export const emptyProject: ProjectInput = { book_title: '', title: '', format: 'presentation', summary: '', takeaways: '', recommendation: '', question: '' };
export function cleanProject(input: ProjectInput): ProjectInput {
  if (!['presentation', 'review'].includes(input.format)) throw new Error('Invalid format');
  const cleaned = { ...input };
  for (const key of Object.keys(projectLimits) as (keyof typeof projectLimits)[]) {
    cleaned[key] = input[key].trim();
    if (cleaned[key].length > projectLimits[key]) throw new Error('Project field is too long');
  }
  if (!cleaned.title || !cleaned.book_title) throw new Error('A title and book are required');
  return cleaned;
}
export function isReadyToShare(input: ProjectInput): boolean {
  try {
    const clean = cleanProject(input);
    return Boolean(clean.summary && clean.takeaways && clean.recommendation);
  } catch { return false; }
}
export function sameProject(left: ProjectInput, right: ProjectInput): boolean {
  return left.format === right.format && (Object.keys(projectLimits) as (keyof typeof projectLimits)[]).every(key => left[key] === right[key]);
}
export function projectText(input: ProjectInput, labels: Record<keyof typeof projectLimits, string>): string {
  return (Object.keys(projectLimits) as (keyof typeof projectLimits)[]).map(key => `${labels[key]}\n${input[key].trim() || '—'}`).join('\n\n');
}
