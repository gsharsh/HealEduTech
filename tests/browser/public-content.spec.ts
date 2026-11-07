import { test, expect } from './fixtures';

test('help contents links focus the chosen section without losing its language', async ({ page }, testInfo) => {
  for (const path of ['/help', '/vi/help']) {
    await page.goto(path);
    const contents = page.locator('.information-index');
    await expect(contents.getByRole('link')).toHaveCount(6);
    await contents.getByRole('link').nth(4).click();
    await expect(page).toHaveURL(`${path}#help-5`);
    const sectionTitle = page.locator('#help-5');
    await expect(sectionTitle).toBeFocused();
    await expect.poll(async () => {
      const title = await sectionTitle.boundingBox();
      const header = await page.locator('.evg-header').boundingBox();
      return title && header ? title.y - (header.y + header.height) : -1;
    }).toBeGreaterThanOrEqual(0);
    await expect(page.locator('html')).toHaveAttribute('lang', path.startsWith('/vi') ? 'vi' : 'en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await page.goto('/privacy');
  await page.screenshot({ path: testInfo.outputPath('privacy-contents.png'), fullPage: true });
});

test('book cards have concise links, navigable titles and a full-card click target', async ({ page }) => {
  await page.goto('/library');
  const card = page.locator('.catalogue-book-card').first();
  const link = card.getByRole('link', { name: 'A Small Discovery', exact: true });
  await expect(card.getByRole('heading', { name: 'A Small Discovery', exact: true, level: 2 })).toBeVisible();
  await expect(link).toHaveCount(1);
  await expect(card.getByRole('link')).toHaveCount(1);
  const cover = await card.locator('.book-cover').boundingBox();
  if (!cover) throw new Error('The catalogue cover must have a visible click target.');
  await page.mouse.click(cover.x + cover.width / 2, cover.y + cover.height / 2);
  await expect(page).toHaveURL(/\/library\/71000000-0000-4000-8000-000000000001\?/);
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true, level: 1 })).toBeVisible();
});

test('community examples stay visibly labelled and readable at narrow widths', async ({ page }, testInfo) => {
  await page.goto('/community#classroom-bookshelf');
  await page.locator('.together-examples > summary').click();
  const examples = page.locator('.community-page .showcase-grid');
  await expect(examples.getByRole('listitem')).toHaveCount(2);
  await expect(examples.getByRole('article')).toHaveCount(2);
  await expect(examples.getByText('EXAMPLE SHOWCASE', { exact: true })).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('community-collection.png'), fullPage: true });
  for (const width of [320, 760, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});
