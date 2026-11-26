import { test, expect, fixtureBookId } from './fixtures';

test('shared logo loads, links home and fits narrow navigation', async ({ page }) => {
  await page.goto('/library');
  const brand = page.getByRole('link', { name: 'EVG and HEAL · Home', exact: true });
  await expect(brand.locator('img')).toHaveJSProperty('naturalWidth', 1024);
  await brand.click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'What will you discover today?' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Together' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('catalogue hides stale results on same-page history navigation', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  let finishRequest!: () => void;
  const pending = new Promise<void>(resolve => { finishRequest = resolve; });
  await page.route('**/rest/v1/rpc/search_books*', async route => {
    await pending;
    await route.fallback();
  });
  // Same route mounted, as when following history or a client-side catalogue link.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/library?q=no-such-book');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  try {
    await expect(page.getByText('Loading the library…', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /A Small Discovery/ })).toHaveCount(0);
  } finally { finishRequest(); }
  await expect(page.getByRole('heading', { name: 'No matching books' })).toBeVisible();
});

test('sign-in cannot change method while a request is pending', async ({ page }) => {
  let finishRequest!: () => void;
  const pending = new Promise<void>(resolve => { finishRequest = resolve; });
  await page.route('**/auth/v1/token*', async route => {
    await pending;
    await route.fallback();
  });
  await page.goto('/sign-in?next=/learning');
  await page.getByLabel('Email address', { exact: true }).fill('learner@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-passphrase-only');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  try {
    await expect(page.getByRole('button', { name: 'Forgot your password?' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Use an email link instead' })).toBeDisabled();
  } finally { finishRequest(); }
  await expect(page).toHaveURL('/learning');
});

test('staff can reach catalogue records beyond the first 24', async ({ page, backend }) => {
  await backend.signIn('librarian');
  await page.route('**/rest/v1/books?*', async route => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const rows = Array.from({ length: offset >= 24 ? 1 : 24 }, (_, index) => ({
      id: offset >= 24 ? fixtureBookId : `71000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
      title_en: `Inventory book ${offset + index + 1}`, title_vi: `Sách ${offset + index + 1}`,
      author: 'Synthetic Author', topic: 'nature', language: 'en', description_en: '', description_vi: '',
      cover_url: '', book_copies: [{ count: 1 }], created_at: '2026-01-01T00:00:00Z',
    }));
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': `${offset}-${offset + rows.length - 1}/25` }, body: JSON.stringify(rows) });
  });
  await page.goto('/staff/catalogue');
  await expect(page.getByRole('heading', { name: 'Inventory book 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory book 25', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory book 1', exact: true })).toBeVisible();
});
