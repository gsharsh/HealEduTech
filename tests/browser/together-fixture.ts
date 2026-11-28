import type { Page } from '@playwright/test';
import type { LearningProject } from '../../src/features/community/togetherModel';
import type { OwnComment } from '../../src/features/community/togetherFeedbackModel';
export const classroomProjectId = '81000000-0000-4000-8000-000000000001';
export const classroomProject: LearningProject = { id: classroomProjectId, title: 'What the garden taught me', book_title: 'A Small Discovery', format: 'presentation', summary: 'Plants need time and care.', takeaways: 'I noticed how one seed became a plant.', recommendation: 'For a reader who likes growing things.', question: 'What would you plant?', status: 'published', review_note: null, updated_at: '2026-11-07T01:00:00Z' };
export class TogetherBackend {
  projects: LearningProject[] = [];
  ownComments: OwnComment[] = [];
  encouraged = false;
  missing = false;
  failSave = false;
  conflictSave = false;
  failComment = false;
  calls: { name: string; input: Record<string, unknown> }[] = [];
  private serial = 1;
  private timestamp() { this.serial += 1; return new Date(Date.UTC(2026, 10, 7, 1, 0, this.serial)).toISOString(); }
  async install(page: Page) {
    await page.route('**/rest/v1/rpc/*learning*', async route => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? '';
      const input = route.request().postDataJSON() as Record<string, unknown> ?? {};
      this.calls.push({ name, input });
      const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      const find = () => this.projects.find(project => project.id === input.p_id);
      const set = (project: LearningProject) => { this.projects = [project, ...this.projects.filter(item => item.id !== project.id)]; return reply(project); };
      if (this.missing) return reply({ code: 'PGRST202', message: 'Not installed' }, 404);
      if (name === 'list_published_learning_projects') return reply(this.projects.filter(project => project.status === 'published').map(project => ({ ...project, published_at: project.updated_at })));
      if (name === 'list_my_learning_projects') return reply(this.projects);
      if (name === 'save_learning_project') {
        if (this.failSave) { this.failSave = false; return reply({ code: 'EVG_RATE_LIMITED', message: 'EVG_RATE_LIMITED' }, 429); }
        if (this.conflictSave) return reply({ code: 'PT409', message: 'Conflict' }, 409);
        return set({ id: String(input.p_id), title: String(input.p_title), book_title: String(input.p_book_title), format: input.p_format as 'presentation' | 'review', summary: String(input.p_summary), takeaways: String(input.p_takeaways), recommendation: String(input.p_recommendation), question: String(input.p_question), status: 'draft', review_note: null, updated_at: this.timestamp() });
      }
      if (name === 'submit_learning_project' || name === 'withdraw_learning_project') {
        const project = find(); if (!project) return reply({ code: 'PT409' }, 409);
        return set({ ...project, status: name.startsWith('submit') ? 'submitted' : 'draft', updated_at: this.timestamp() });
      }
      if (name === 'delete_learning_project') { this.projects = this.projects.filter(project => project.id !== input.p_id); return reply(null); }
      if (name === 'staff_list_learning_projects') return reply(this.projects.filter(project => project.status !== 'draft').map(project => ({ ...project, owner_user_id: '72000000-0000-4000-8000-000000000001', display_name: 'Synthetic learner' })));
      if (name === 'staff_review_learning_project') {
        const project = find(); if (!project) return reply({ code: 'PT409' }, 409);
        return set({ ...project, status: input.p_action === 'publish' ? 'published' : 'changes_requested', review_note: String(input.p_review_note), updated_at: this.timestamp() });
      }
      if (name === 'get_learning_project_feedback') return reply({ encouragement_count: this.encouraged ? 1 : 0, comments: this.ownComments.filter(comment => comment.status === 'approved') });
      if (name === 'list_my_learning_feedback') return reply({ encouraged: this.encouraged, comments: this.ownComments });
      if (name === 'set_learning_project_encouragement') { this.encouraged = Boolean(input.p_enabled); return reply({ encouraged: this.encouraged, encouragement_count: this.encouraged ? 1 : 0 }); }
      if (name === 'submit_learning_comment') {
        if (this.failComment) { this.failComment = false; return reply({ code: 'EVG_RATE_LIMITED', message: 'EVG_RATE_LIMITED' }, 429); }
        const comment: OwnComment = { id: String(input.p_id), body: String(input.p_body), status: 'pending', review_note: null, created_at: this.timestamp(), updated_at: this.timestamp() };
        this.ownComments = [comment, ...this.ownComments.filter(item => item.id !== comment.id)]; return reply(comment);
      }
      if (name === 'withdraw_learning_comment') { this.ownComments = this.ownComments.filter(comment => comment.id !== input.p_id); return reply(null); }
      if (name === 'staff_list_learning_comments') return reply(this.ownComments.filter(comment => comment.status !== 'rejected').map(comment => ({ ...comment, project_id: classroomProjectId, project_title: classroomProject.title })));
      if (name === 'staff_review_learning_comment') {
        const comment = this.ownComments.find(item => item.id === input.p_id); if (!comment) return reply({ code: 'PT409' }, 409);
        const next: OwnComment = { ...comment, status: input.p_action === 'approve' ? 'approved' : 'rejected', review_note: String(input.p_review_note), updated_at: this.timestamp() };
        this.ownComments = [next, ...this.ownComments.filter(item => item.id !== next.id)]; return reply(next);
      }
      return route.fallback();
    });
  }
}
