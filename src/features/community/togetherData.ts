import { supabase } from '../../lib/supabase';
import { cleanProject, type LearningProject, type ProjectInput, type PublishedProject } from './togetherModel';

function client() { if (!supabase) throw new Error('Classroom notebooks are not configured'); return supabase; }
function check<T>(response: { data: T | null; error: unknown }): T { if (response.error) throw response.error; return response.data as T; }
export function isTogetherUnavailable(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  return code === 'PGRST202' || code === '42883';
}
export function isProjectConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'PT409');
}
export async function listMyProjects(signal: AbortSignal): Promise<LearningProject[]> {
  return check(await client().rpc('list_my_learning_projects').abortSignal(signal)) ?? [];
}
export async function listPublishedProjects(signal: AbortSignal, before?: PublishedProject): Promise<PublishedProject[]> {
  return check(await client().rpc('list_published_learning_projects', { p_limit: 12, p_before: before?.published_at ?? null, p_before_id: before?.id ?? null }).abortSignal(signal)) ?? [];
}
export async function saveProject(id: string, input: ProjectInput, updatedAt: string | null): Promise<LearningProject> {
  const clean = cleanProject(input);
  return check(await client().rpc('save_learning_project', { p_id: id, p_book_title: clean.book_title, p_title: clean.title, p_format: clean.format, p_summary: clean.summary, p_takeaways: clean.takeaways, p_recommendation: clean.recommendation, p_question: clean.question, p_expected_updated_at: updatedAt }));
}
export async function changeProjectVisibility(project: LearningProject, action: 'submit' | 'withdraw'): Promise<LearningProject> {
  return check(await client().rpc(`${action}_learning_project`, { p_id: project.id, p_expected_updated_at: project.updated_at }));
}
export interface ReviewProject extends LearningProject { owner_user_id: string; display_name: string | null }
export async function listReviewProjects(signal: AbortSignal, before?: LearningProject, studentId?: string): Promise<ReviewProject[]> {
  return check(await client().rpc('staff_list_learning_projects', { p_limit: 24, p_before: before?.updated_at ?? null, p_before_id: before?.id ?? null, p_user_id: studentId ?? null }).abortSignal(signal)) ?? [];
}
export async function reviewProject(project: LearningProject, action: 'publish' | 'request_changes', note: string): Promise<LearningProject> {
  return check(await client().rpc('staff_review_learning_project', { p_id: project.id, p_action: action, p_review_note: note.trim(), p_expected_updated_at: project.updated_at }));
}

export async function deleteProject(project: LearningProject): Promise<void> {
  check(await client().rpc('delete_learning_project', { p_id: project.id, p_expected_updated_at: project.updated_at }));
}
