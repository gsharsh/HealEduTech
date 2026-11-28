import { test, expect, fixtureBookId } from './fixtures';

test('server rate limits preserve the review and require an explicit retry', async ({ page, backend }) => {
  backend.reading.set('learner', [{ book_id: fixtureBookId, status: 'finished', reflection: 'Original saved reflection.', updated_at: '2026-11-07T00:00:00Z' }]);
  await backend.signIn();
  let calls = 0;
  let limited = true;
  await page.route('**/rest/v1/reading_records**', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    calls += 1;
    if (!limited) return route.fallback();
    return route.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'Retry-After': '60' }, body: JSON.stringify({ code: 'EVG_RATE_LIMITED', message: 'EVG_RATE_LIMITED' }) });
  });
  const review = page.getByRole('textbox', { name: 'Your private review (optional)' });
  await review.fill('My draft survives an overloaded server.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Wait a minute');
  await expect(review).toHaveValue('My draft survives an overloaded server.');
  expect(calls).toBe(1);
  expect(backend.reading.get('learner')?.[0].reflection).toBe('Original saved reflection.');
  // The fixture now represents an expired server window; only the user's
  // explicit retry sends a second request.
  limited = false;
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  expect(calls).toBe(2);
  expect(backend.reading.get('learner')?.[0].reflection).toBe('My draft survives an overloaded server.');
});

test('Vietnamese interest quota feedback retains selected topics', async ({ page, backend }) => {
  await backend.signIn();
  await page.goto('/explore');
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await page.locator('.explore-preferences > summary').click();
  const option = page.locator('.interest-options button').first();
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  let calls = 0;
  await page.route('**/rest/v1/rpc/replace_my_interests', async route => {
    calls += 1;
    return route.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: 'EVG_RATE_LIMITED', message: 'EVG_RATE_LIMITED' }) });
  });
  await page.locator('.reading-interest-actions .primary').click();
  await expect(page.getByRole('alert')).toContainText('một phút');
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  expect(calls).toBe(1);
});
