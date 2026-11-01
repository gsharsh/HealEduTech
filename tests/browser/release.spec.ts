import { test, expect, fixtureBookId } from './fixtures';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('catalogue search, empty recovery, deep links and language switching', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('no-such-book');
  await expect(page.getByRole('heading', { name: 'No matching books' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await page.getByRole('link', { name: /A Small Discovery/ }).click();
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await expect(page.getByRole('heading', { name: 'Một khám phá nhỏ', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('catalogue failures provide an effective retry', async ({ page, backend }) => {
  backend.failCatalogue = true;
  await page.goto('/library');
  await expect(page.getByRole('alert')).toContainText(/could not|couldn.t/i);
  backend.failCatalogue = false;
  await page.getByRole('button', { name: /Try again|Retry/i }).click();
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
});

test('guest access is blocked and auth errors stay actionable', async ({ page }) => {
  await page.goto('/staff/dashboard');
  await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.getByRole('link', { name: 'Sign in', exact: true }).last().click();
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#auth-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#auth-email')).toBeFocused();
  await page.goto('/reset-password');
  await expect(page.getByText(/recovery link|reset link|expired/i).first()).toBeVisible();
});

test('saved reading survives reload and failed saves preserve the draft', async ({ page, backend }) => {
  await backend.signIn();
  await expect(page.getByRole('heading', { name: 'No saved reading yet' })).toBeVisible();
  await page.goto(`/library/${fixtureBookId}`);
  await page.getByRole('button', { name: 'Add to My Reading', exact: true }).click();
  await page.getByRole('link', { name: 'Open My Reading', exact: true }).click();
  await page.getByRole('button', { name: 'Mark as finished', exact: true }).click();
  const review = page.getByRole('textbox', { name: 'Your private review (optional)' });
  await review.fill('A synthetic private reflection for the release test.');
  backend.failNextReadingSave = true;
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your text is still here');
  await expect(review).toHaveValue('A synthetic private reflection for the release test.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your private review (optional)' })).toHaveValue('A synthetic private reflection for the release test.');
  await page.goto('/learning');
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await expect(page.getByText('A synthetic private reflection for the release test.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: /goal/i })).toHaveCount(0);
});

test('sign-out and the next learner do not retain the previous learner data', async ({ page, backend }) => {
  backend.reading.set('learner', [{ book_id: fixtureBookId, status: 'finished', reflection: 'Only learner A sees this private note.', updated_at: '2026-11-01T01:00:00Z' }]);
  await backend.signIn('learner');
  await expect(page.getByText('Only learner A sees this private note.', { exact: false }).first()).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out of this tab', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await page.goto('/learning');
  await expect(page.getByRole('heading', { name: 'Your reading space' })).toBeVisible();
  await expect(page.getByText('Only learner A sees this private note.', { exact: false })).toHaveCount(0);
  await backend.signIn('other');
  await expect(page.getByRole('heading', { name: 'No saved reading yet' })).toBeVisible();
  await expect(page.getByText('Only learner A sees this private note.', { exact: false })).toHaveCount(0);
});

test('learner role cannot enter staff or administration pages', async ({ page, backend }) => {
  await backend.signIn();
  await page.goto('/staff/dashboard');
  await expect(page.getByRole('heading', { name: /student access|staff access|staff only|not have access|not available/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Library dashboard', exact: true })).toHaveCount(0);
  await page.goto('/admin/settings');
  await expect(page.getByText(/administrator|administration|access/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /grant|add staff/i })).toHaveCount(0);
});

test('librarian dashboard loads while administration remains protected', async ({ page, backend }, testInfo) => {
  await backend.signIn('librarian');
  await page.goto('/staff/dashboard');
  await expect(page.getByRole('heading', { name: 'Library dashboard', exact: true })).toBeVisible();
  await expect(page.getByText('Current snapshot', { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('librarian-dashboard.png'), fullPage: true });
  await page.goto('/admin/settings');
  await expect(page.getByRole('button', { name: /grant|add staff/i })).toHaveCount(0);
});

test('public pages share navigation and learner community has no temporary editor', async ({ page }, testInfo) => {
  for (const path of ['/', '/help', '/privacy', '/community']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('footer').getByRole('link', { name: /Privacy/i })).toBeVisible();
    await expect(page.locator('footer').getByRole('link', { name: /Help/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (path === '/') await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
    if (path === '/' || path === '/privacy') await page.screenshot({ path: testInfo.outputPath(path === '/' ? 'home.png' : 'privacy.png'), fullPage: path !== '/' });
  }
  await expect(page.getByRole('textbox', { name: 'Project title' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save in this preview' })).toHaveCount(0);
});


test('failed page downloads offer focused bilingual recovery', async ({ page }) => {
  await page.route('**/src/features/community/CommunityPage.tsx*', route => route.abort('failed'));
  await page.goto('/community');
  const heading = page.getByRole('heading', { name: 'This page couldn’t open.', exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.getByRole('button', { name: 'Reload page', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Home', exact: true })).toHaveAttribute('href', '/');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trang này chưa thể mở.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải lại trang', exact: true })).toBeVisible();
});


test('administrator workspace loads its protected staff-management controls', async ({ page, backend }, testInfo) => {
  await backend.signIn('administrator');
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Library administration', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff permissions', exact: true })).toBeVisible();
  await expect(page.getByText('librarian@example.invalid', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('administrator-workspace.png'), fullPage: true });
});
