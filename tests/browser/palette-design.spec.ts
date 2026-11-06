import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

const sorbetPalette = {
  '--sorbet-grey': '#CCCCCC', '--sorbet-pale': '#EDECEC', '--sorbet-olive': '#B7C396',
  '--sorbet-white': '#FEFEFE', '--sorbet-sage': '#E0E7D7', '--sorbet-rose': '#BA9A91',
};

for (const route of ['/', '/explore', '/community']) {
  for (const language of ['en', 'vi']) {
    test(`Sorbet palette remains accessible on ${route} in ${language}`, async ({ page }, testInfo) => {
      await page.goto(route === '/' && language === 'vi' ? '/vi' : route);
      if (route !== '/' && language === 'vi') await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (route === '/') await expect(page.locator('.home-book-grid .catalogue-book-link')).toHaveCount(1);
      if (route === '/community') await expect(page.locator('.together-guest-notebook')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const actual = await page.evaluate(names => {
        const styles = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map(name => [name, styles.getPropertyValue(name).trim()]));
      }, Object.keys(sorbetPalette));
      expect(actual).toEqual(sorbetPalette);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(254, 254, 254)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`sorbet-${route === '/' ? 'home' : route.slice(1)}-${language}.png`), fullPage: true });
    });
  }
}
