import { supabase } from '../../lib/supabase';
import type { OwnComment, ReviewComment, PublicFeedback, OwnFeedback } from './togetherFeedbackModel';
export type { OwnComment, ReviewComment, PublicFeedback, OwnFeedback } from './togetherFeedbackModel';
function client() { if (!supabase) throw new Error('Classroom feedback is not configured'); return supabase; }
function check<T>(response: { data: T | null; error: unknown }): T { if (response.error) throw response.error; return response.data as T; }
export async function getPublicFeedback(id: string, signal: AbortSignal): Promise<PublicFeedback> {
  return check(await client().rpc('get_learning_project_feedback', { p_project_id: id }).abortSignal(signal));
}
export async function getOwnFeedback(id: string | null, signal: AbortSignal): Promise<OwnFeedback> {
  return check(await client().rpc('list_my_learning_feedback', { p_project_id: id }).abortSignal(signal));
}
export async function setEncouragement(id: string, enabled: boolean): Promise<{ encouraged: boolean; encouragement_count: number }> {
  return check(await client().rpc('set_learning_project_encouragement', { p_project_id: id, p_enabled: enabled }));
}
export async function submitComment(id: string, projectId: string, body: string): Promise<OwnComment> {
  const clean = body.trim(); if (!clean || clean.length > 500) throw new Error('Invalid comment');
  return check(await client().rpc('submit_learning_comment', { p_id: id, p_project_id: projectId, p_body: clean }));
}
export async function withdrawComment(id: string): Promise<void> {
  check(await client().rpc('withdraw_learning_comment', { p_id: id }));
}
export async function listReviewComments(signal: AbortSignal, before?: ReviewComment): Promise<ReviewComment[]> {
  return check(await client().rpc('staff_list_learning_comments', { p_limit: 24, p_before: before?.updated_at ?? null, p_before_id: before?.id ?? null }).abortSignal(signal)) ?? [];
}
export async function reviewComment(comment: ReviewComment, action: 'approve' | 'reject', note: string): Promise<OwnComment> {
  return check(await client().rpc('staff_review_learning_comment', { p_id: comment.id, p_action: action, p_review_note: note.trim(), p_expected_updated_at: comment.updated_at }));
}
