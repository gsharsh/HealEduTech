import { test, expect } from './fixtures';
import type { Locator } from '@playwright/test';

function cardAppearance(card: Locator) {
  return card.evaluate(element => {
    const frame = getComputedStyle(element);
    const cover = getComputedStyle(element.querySelector('.book-cover')!);
    const textSizes = ['.book-meta', '.book-title', '.catalogue-author', '.availability', '.text-link']
      .map(selector => getComputedStyle(element.querySelector(selector)!).fontSize);
    return {
      fill: frame.backgroundColor,
      border: frame.borderTop,
      radius: frame.borderRadius,
      padding: frame.padding,
      shadow: frame.boxShadow,
      coverRadius: cover.borderRadius,
      coverShadow: cover.boxShadow,
      textSizes,
    };
  });
}

test('the same book has a consistent framed card on Home, Library and Explore', async ({ page }, testInfo) => {
  const routes = [['home', '/'], ['library', '/library'], ['explore', '/explore?topic=nature']] as const;
  let homeAppearance: Awaited<ReturnType<typeof cardAppearance>> | undefined;
  for (const [name, route] of routes) {
    await page.goto(route);
    const title = page.getByRole('link', { name: 'A Small Discovery', exact: true });
    const card = page.locator('.catalogue-book-link').filter({ has: title });
    await expect(card).toBeVisible();
    await page.mouse.move(0, 0);
    const appearance = await cardAppearance(card);
    if (name === 'home') {
      expect(appearance.fill).toBe('rgb(255, 253, 250)');
      expect(appearance.border).toMatch(/^[1-9][\d.]*px solid /);
      expect(parseFloat(appearance.padding)).toBeGreaterThan(0);
      homeAppearance = appearance;
    } else {
      expect(appearance, `The ${name} card matches the Home shelf`).toEqual(homeAppearance);
    }
    await card.screenshot({ path: testInfo.outputPath(`book-card-${name}-${testInfo.project.name}.png`) });
  }
});

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
