import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { TogetherBackend, classroomProject, classroomProjectId } from './together-fixture';

async function fillOutline(page: import('@playwright/test').Page) {
  await page.getByLabel('Which book inspired you?', { exact: true }).fill('A Small Discovery');
  await page.getByLabel('Give your discovery a title', { exact: true }).fill('My garden discovery');
  await page.getByLabel('What is the book about?', { exact: true }).fill('How one seed becomes a garden.');
  await page.getByLabel('What did you learn or notice?', { exact: true }).fill('Small changes can make a difference.');
  await page.getByLabel('Who would enjoy it, and why?', { exact: true }).fill('For a curious friend who likes nature.');
}

test('the classroom reading circle has actionable bilingual plans and an honest backend gate', async ({ page }, testInfo) => {
  const classroom = new TogetherBackend(); classroom.missing = true; await classroom.install(page);
  await page.goto('/community');
  await expect(page.getByRole('heading', { name: 'A good book starts a conversation.' })).toBeVisible();
  await expect(page.locator('.together-weeks > li')).toHaveCount(5);
  await expect(page.locator('.together-template-grid > article')).toHaveCount(3);
  await expect(page.getByText('Saved notebooks and classroom sharing are not enabled here yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save private draft' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start this outline' }).nth(1).click();
  await expect(page.locator('#reading-notebook')).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: testInfo.outputPath('together-classroom-plan.png'), fullPage: true });
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await expect(page.getByRole('heading', { name: 'Hành trình đọc sách trong năm tuần', exact: true })).toBeVisible();
  for (const width of [320, 760, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('private notebook retains rate-limited writing, persists, submits deliberately and withdraws for editing', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); await classroom.install(page); await backend.signIn(); await page.goto('/community');
  await fillOutline(page); classroom.failSave = true;
  await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('too many requests');
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toHaveValue('My garden discovery');
  expect(classroom.calls.filter(call => call.name === 'save_learning_project')).toHaveLength(1);
  await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
  await expect(page.getByText('Private draft saved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send for showcase review', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toHaveValue('My garden discovery');
  await page.getByRole('checkbox', { name: /I want this version/ }).check();
  await page.getByRole('button', { name: 'Send for showcase review', exact: true }).click();
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toBeDisabled();
  expect(classroom.projects[0].status).toBe('submitted');
  await expect(page.locator('.together-public-shelf')).not.toContainText('My garden discovery');
  await page.getByRole('button', { name: 'Make private and edit', exact: true }).click();
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toBeEditable();
  expect(classroom.projects[0].status).toBe('draft');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('saved notebooks require a concrete deletion review and cancellation preserves the record', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); classroom.projects = [{ ...classroomProject, status: 'draft' }]; await classroom.install(page); await backend.signIn(); await page.goto('/community');
  await page.getByRole('button', { name: 'Delete this notebook', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this notebook?' }); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep notebook' }).click();
  expect(classroom.projects).toHaveLength(1);
  expect(classroom.calls.filter(call => call.name === 'delete_learning_project')).toHaveLength(0);
  await page.getByRole('button', { name: 'Delete this notebook', exact: true }).click();
  await dialog.getByRole('button', { name: 'Permanently delete' }).click();
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toHaveValue('');
  expect(classroom.projects).toHaveLength(0);
});

test('showcase feedback loads on demand, encouragement is reversible and comments stay pending', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); classroom.projects = [classroomProject]; await classroom.install(page); await backend.signIn(); await page.goto('/community');
  const discovery = page.locator('.together-discovery').filter({ hasText: classroomProject.title });
  await expect(discovery).toBeVisible();
  expect(classroom.calls.filter(call => call.name === 'get_learning_project_feedback')).toHaveLength(0);
  await discovery.locator('summary').click();
  await discovery.getByRole('button', { name: 'Encourage this reader' }).click();
  await expect(discovery.getByRole('button', { name: 'Remove my encouragement' })).toHaveAttribute('aria-pressed', 'true');
  await discovery.getByRole('button', { name: 'Remove my encouragement' }).click(); expect(classroom.encouraged).toBe(false);
  classroom.failComment = true;
  await discovery.getByLabel('Your encouragement or question').fill('Your example helped me understand how seeds grow.');
  await discovery.getByRole('button', { name: 'Send comment for review' }).click();
  await expect(discovery.getByRole('alert')).toContainText('too many requests');
  await expect(discovery.getByLabel('Your encouragement or question')).toHaveValue('Your example helped me understand how seeds grow.');
  await discovery.getByRole('button', { name: 'Send comment for review' }).click();
  await expect(discovery.getByText('Awaiting review', { exact: true })).toBeVisible();
  expect(classroom.ownComments[0].status).toBe('pending');
  const attempts = classroom.calls.filter(call => call.name === 'submit_learning_comment'); expect(attempts).toHaveLength(2); expect(attempts[0].input.p_id).toBe(attempts[1].input.p_id);
  await discovery.getByRole('button', { name: 'Remove my comment' }).click();
  expect(classroom.ownComments).toHaveLength(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('teacher review requires a suitability check, preserves author context and moderates comments', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); classroom.projects = [{ ...classroomProject, status: 'submitted' }]; classroom.ownComments = [{ id: '82000000-0000-4000-8000-000000000001', body: 'A thoughtful observation about the garden.', status: 'pending', review_note: null, created_at: '2026-11-07T01:00:00Z', updated_at: '2026-11-07T01:00:00Z' }];
  await classroom.install(page); await backend.signIn('librarian'); await page.goto('/community?student=72000000-0000-4000-8000-000000000001#review-desk-title');
  await expect(page.locator('#review-desk-title')).toBeFocused();
  const desk = page.locator('.together-review-desk');
  await desk.locator('.together-review-item').first().locator('summary').click();
  await expect(desk.getByRole('link', { name: 'Synthetic learner', exact: true })).toHaveAttribute('href', '/staff/students/72000000-0000-4000-8000-000000000001');
  await expect(desk.getByRole('button', { name: 'Approve for showcase' })).toBeDisabled();
  await desk.getByRole('checkbox', { name: /I have checked that this piece/ }).check();
  await desk.getByRole('button', { name: 'Approve for showcase' }).click();
  await expect(page.locator('.together-public-shelf')).toContainText(classroomProject.title);
  expect(classroom.projects[0].status).toBe('published');
  expect(classroom.calls.find(call => call.name === 'staff_list_learning_projects')?.input.p_user_id).toBe('72000000-0000-4000-8000-000000000001');
  const comment = desk.locator('.together-review-item').filter({ hasText: 'A thoughtful observation' });
  await comment.locator('summary').click();
  await expect(comment.getByRole('button', { name: 'Approve comment' })).toBeDisabled();
  await comment.getByRole('checkbox', { name: /I checked this comment/ }).check();
  await comment.getByRole('button', { name: 'Approve comment' }).click();
  await expect.poll(() => classroom.ownComments[0].status).toBe('approved');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('conflicting saves retain writing and offer a downloadable recovery path', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); classroom.projects = [{ ...classroomProject, status: 'draft' }]; classroom.conflictSave = true; await classroom.install(page); await backend.signIn(); await page.goto('/community');
  await page.getByLabel('Give your discovery a title', { exact: true }).fill('My newer title');
  await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed in another tab');
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toHaveValue('My newer title');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download outline' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('my-reading-outline.txt');
  expect(classroom.projects[0].id).toBe(classroomProjectId);
  expect(classroom.projects[0].title).toBe(classroomProject.title);
});


test('templates select the new outline format while preserving an unsaved existing draft', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); await classroom.install(page); await backend.signIn(); await page.goto('/community');
  await expect(page.getByRole('combobox', { name: 'How will you share?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start this outline' }).nth(2).click();
  await expect(page.getByRole('combobox', { name: 'How will you share?', exact: true })).toHaveValue('review');
  await page.getByLabel('Give your discovery a title', { exact: true }).fill('Keep this precious thought');
  await page.getByRole('button', { name: 'Start this outline' }).nth(0).click();
  await expect(page.getByRole('combobox', { name: 'How will you share?', exact: true })).toHaveValue('review');
  await expect(page.getByLabel('Give your discovery a title', { exact: true })).toHaveValue('Keep this precious thought');
  await expect(page.getByText('Save or discard your changes before starting a new outline.', { exact: false })).toBeVisible();
});

test('learners can remove their comments even after the original discovery is private', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); classroom.ownComments = [{ id: '82000000-0000-4000-8000-000000000002', body: 'An older private conversation.', status: 'pending', review_note: null, created_at: '2026-11-07T01:00:00Z', updated_at: '2026-11-07T01:00:00Z' }];
  await classroom.install(page); await backend.signIn(); await page.goto('/community');
  const own = page.locator('.together-own-feedback'); await own.locator('summary').click();
  await expect(own.getByText('An older private conversation.')).toBeVisible();
  expect(classroom.calls.find(call => call.name === 'list_my_learning_feedback')?.input.p_project_id).toBeNull();
  await own.getByRole('button', { name: 'Remove my comment' }).click();
  await expect(own.getByText('You have no classroom comments yet.')).toBeVisible();
});

test('teacher queue refresh finds new submissions and protects unsent review notes', async ({ page, backend }) => {
  const classroom = new TogetherBackend(); await classroom.install(page); await backend.signIn('librarian'); await page.goto('/community#review-desk-title');
  const desk = page.locator('.together-review-desk');
  await expect(desk.getByText('No notebooks need a review right now.')).toBeVisible();
  classroom.projects = [{ ...classroomProject, status: 'submitted' }];
  await desk.getByRole('button', { name: 'Refresh review queue', exact: true }).click();
  const project = desk.locator('.together-review-item').first(); await project.locator('summary').click();
  await project.getByLabel('Feedback for the learner').fill('Keep this thoughtful, unfinished feedback.');
  const baseline = classroom.calls.filter(call => call.name === 'staff_list_learning_projects').length;
  page.once('dialog', dialog => dialog.dismiss());
  await desk.getByRole('button', { name: 'Refresh review queue', exact: true }).click();
  await expect(project.getByLabel('Feedback for the learner')).toHaveValue('Keep this thoughtful, unfinished feedback.');
  expect(classroom.calls.filter(call => call.name === 'staff_list_learning_projects')).toHaveLength(baseline);
  page.once('dialog', dialog => dialog.accept());
  await desk.getByRole('button', { name: 'Refresh review queue', exact: true }).click();
  await expect.poll(() => classroom.calls.filter(call => call.name === 'staff_list_learning_projects').length).toBe(baseline + 1);
  await desk.locator('.together-review-item').first().locator('summary').click();
  await expect(desk.getByLabel('Feedback for the learner')).toHaveValue('');
});
