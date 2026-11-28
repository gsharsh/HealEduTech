import { test, expect } from './fixtures';

test('mobile navigation supports keyboard dismissal, route changes and resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
  await expect(navigation).toBeHidden();
  await toggle.click();
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await navigation.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page).toHaveURL('/library');
  await expect(navigation).toBeHidden();
  await expect(page.getByRole('main')).toBeFocused();
  await page.setViewportSize({ width: 1100, height: 844 });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

test('homepage search and distinct topic links reach the matching catalogue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search books', exact: true }).fill('Small Discovery');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/library\?q=Small\+Discovery$/);
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await page.goto('/');
  await page.getByRole('link', { name: /^Nature .*Explore books/ }).click();
  await expect(page).toHaveURL('/library?topic=nature');
  await page.goto('/vi');
  await page.getByRole('link', { name: /^Khoa học .*Khám phá sách/ }).click();
  await expect(page).toHaveURL('/library?topic=science');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
});

test('public shell reflows at narrow widths and enlarged text in both languages', async ({ page }) => {
  for (const path of ['/', '/vi']) {
    await page.goto(path);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} with 200% text`).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('fragment navigation positions the destination below the sticky header', async ({ page }) => {
  await page.goto('/#home-featured-title');
  const title = page.locator('#home-featured-title');
  await expect(title).toBeVisible();
  await expect.poll(async () => {
    const titleBox = await title.boundingBox();
    const headerBox = await page.locator('.evg-header').boundingBox();
    return titleBox && headerBox ? titleBox.y - (headerBox.y + headerBox.height) : -1;
  }).toBeGreaterThanOrEqual(0);
});
