import { test, expect } from './fixtures';

test('a preload failure can recover by reloading the original page', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  // Simulate the documented Vite failure event without breaking the server or
  // changing application data, so the recovery action itself can be exercised.
  await page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })));
  const heading = page.getByRole('heading', { name: 'This page couldn’t open.', exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await page.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find a little wonder.', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await expect(heading).toHaveCount(0);
});

test('Vietnamese recovery returns home and preserves the language preference', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await expect(page.getByRole('heading', { name: 'Tìm một điều kỳ diệu.', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })));
  const heading = page.getByRole('heading', { name: 'Trang này chưa thể mở.', exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await page.getByRole('link', { name: 'Về trang chủ', exact: true }).click();
  await expect(page).toHaveURL('/vi');
  await expect(page.getByRole('heading', { name: 'Hôm nay em muốn khám phá gì?', exact: true })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Tìm sách', exact: true })).toBeVisible();
  await expect(heading).toHaveCount(0);
});
