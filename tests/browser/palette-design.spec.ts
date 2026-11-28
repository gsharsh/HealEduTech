import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

const autumnPalette = {
  '--blanket': '#F2E0CF', '--autumn-fern': '#854628', '--oak': '#B48954',
  '--khaki-moss': '#7C7458', '--mushroom': '#D4C7B4', '--kimber': '#2D2D23',
};

for (const route of ['/', '/explore', '/community']) {
  for (const language of ['en', 'vi']) {
    test(`Autumn palette remains accessible on ${route} in ${language}`, async ({ page }, testInfo) => {
      await page.goto(route === '/' && language === 'vi' ? '/vi' : route);
      if (route !== '/' && language === 'vi') await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (route === '/') await expect(page.locator('.home-book-grid .catalogue-book-link')).toHaveCount(1);
      if (route === '/community') await expect(page.locator('.together-page [role="tab"][aria-selected="true"]')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const actual = await page.evaluate(names => {
        const styles = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map(name => [name, styles.getPropertyValue(name).trim()]));
      }, Object.keys(autumnPalette));
      expect(actual).toEqual(autumnPalette);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(251, 248, 244)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`autumn-${route === '/' ? 'home' : route.slice(1)}-${language}.png`), fullPage: true });
    });
  }
}
