import AxeBuilder from '@axe-core/playwright';
import { test, expect, fixtureBookId } from './fixtures';

test('teachers see recorded dates and topic totals without invented historical durations', async ({ page, backend }) => {
  await backend.signIn('librarian');
  const studentId = '72000000-0000-4000-8000-000000000001';
  await page.route('**/rest/v1/rpc/staff_get_student', route => route.fulfill({ json: {
    user_id: studentId, display_name: 'Synthetic student', email: 'student@example.invalid', preferred_language: 'en', created_at: '2026-01-01',
    registered: true, eligible: true, currently_reading_count: 1, finished_count: 1, active_loan_count: 0, overdue_loan_count: 0,
    reading_topics: [{ topic: 'nature', reading: 1, finished: 1 }],
  } }));
  await page.route('**/rest/v1/rpc/staff_list_student_reading', route => route.fulfill({ json: { items: [
    { book_id: fixtureBookId, title_en: 'Recorded book', title_vi: 'Sách đã ghi nhận', topic: 'nature', status: 'finished', reading_started_at: '2026-11-01T00:00:00Z', reading_finished_at: '2026-11-07T00:00:00Z' },
    { book_id: '71000000-0000-4000-8000-000000000002', title_en: 'Earlier book', title_vi: 'Sách cũ', topic: 'nature', status: 'currently_reading' },
  ], total: 2, page: 1, page_size: 25 } }));
  await page.goto(`/staff/students/${studentId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic student', exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Recorded book', exact: true }) });
  await expect(row).toContainText('1 Nov 2026');
  await expect(row).toContainText('7 Nov 2026');
  await expect(row.getByRole('cell').last()).toHaveText('6');
  const legacy = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Earlier book', exact: true }) });
  await expect(legacy.getByRole('cell').last()).toHaveText('Not recorded');
  await expect(page.getByText('Dates show when a reading status was recorded', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review submitted work', exact: true })).toHaveAttribute('href', `/community?student=${studentId}#review-desk-title`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('catalogue removal requires confirmation and preserves protected titles', async ({ page, backend }) => {
  await backend.signIn('librarian');
  let attempts = 0;
  let protectedTitle = true;
  await page.route('**/rest/v1/rpc/remove_unused_catalogue_book', route => {
    attempts++;
    expect(route.request().postDataJSON()).toMatchObject({ p_book_id: fixtureBookId, p_expected: { title_en: 'A Small Discovery', total_copies: 1 } });
    return protectedTitle ? route.fulfill({ status: 400, json: { code: 'P0001', message: 'EVG_BOOK_HAS_HISTORY' } }) : route.fulfill({ json: true });
  });
  await page.goto('/staff/catalogue');
  await page.getByRole('button', { name: 'Remove title', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove this unused title?', exact: true });
  await expect(dialog).toContainText('A Small Discovery');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(attempts).toBe(0);
  await page.getByRole('button', { name: 'Remove title', exact: true }).click();
  await dialog.getByRole('button', { name: 'Remove title', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('has reading or loan history');
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  expect(attempts).toBe(1);
  protectedTitle = false;
  await page.route('**/rest/v1/books?*', route => route.fulfill({ json: [], headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' } }));
  await dialog.getByRole('button', { name: 'Remove title', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'The unused title and its copies were removed.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('a stale catalogue removal must be refreshed and confirmed again', async ({ page, backend }) => {
  await backend.signIn('librarian');
  let attempts = 0;
  await page.route('**/rest/v1/rpc/remove_unused_catalogue_book', route => {
    attempts++;
    return route.fulfill({ status: 409, json: { code: 'PT409', message: 'Changed snapshot' } });
  });
  await page.goto('/staff/catalogue');
  await page.getByRole('button', { name: 'Remove title', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove title', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Someone changed this title');
  await expect(dialog.getByRole('button', { name: 'Remove title', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Refresh catalogue', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: 'Remove title', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Remove title', exact: true })).toBeEnabled();
  expect(attempts).toBe(1);
});
