import { test, expect } from './fixtures';

test('direct Vietnamese pages preserve language through app reload and account support links', async ({ page }) => {
  await page.goto('/vi/help');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.getByRole('link', { name: 'Xem thư viện', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tìm một điều kỳ diệu.', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tìm một điều kỳ diệu.', exact: true })).toBeVisible();
  await page.goto('/sign-in');
  await expect(page.getByRole('link', { name: 'Trợ giúp', exact: true })).toHaveAttribute('href', '/vi/help');
  await expect(page.getByRole('link', { name: 'Quyền riêng tư', exact: true })).toHaveAttribute('href', '/vi/privacy');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.goto('/');
  await expect(page).toHaveURL('/vi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  // Capture the saved choice as navigation begins. Waiting for a route effect
  // would hide the race where an immediate reload restores the old language.
  await page.evaluate(() => {
    const pushState = window.history.pushState.bind(window.history);
    window.history.pushState = (...args) => {
      window.sessionStorage.setItem('evg-test-language-at-navigation', window.localStorage.getItem('evg-language') ?? '');
      pushState(...args);
    };
  });
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(() => window.sessionStorage.getItem('evg-test-language-at-navigation'))).toBe('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
