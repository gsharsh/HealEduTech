import AxeBuilder from '@axe-core/playwright';
import { test, expect, fixtureBookId } from './fixtures';

// axe also creates an isolated analysis page. Allow CPU headroom on shared CI
// runners; interaction assertions and application request deadlines stay unchanged.
test.describe.configure({ timeout: 60_000 });

// These are automated checks, supplemented by keyboard, reflow, and visual QA.
// No rules or page regions are suppressed: a new violation should fail CI.
const publicRoutes = ['/', '/vi', '/start', '/vi/help', '/privacy', '/library', '/explore', '/community', '/sign-in', '/reset-password', '/missing-page'];
for (const route of publicRoutes) {
  test(`accessible public page: ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route === '/library' || route === '/') await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
}

for (const route of ['/account', '/learning', '/explore', `/library/${fixtureBookId}`]) {
  test(`accessible learner page: ${route}`, async ({ page, backend }, testInfo) => {
    backend.reading.set('learner', [{ book_id: fixtureBookId, status: 'currently_reading', reflection: 'Synthetic reading reflection.', updated_at: '2026-11-07T00:00:00Z' }]);
    await backend.signIn();
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route === '/learning' || route.includes(fixtureBookId)) await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
}

for (const route of ['/staff', '/staff/dashboard', '/staff/students', '/staff/catalogue', '/staff/circulation', '/admin/settings']) {
  test(`accessible staff page: ${route}`, async ({ page, backend }, testInfo) => {
    await backend.signIn('administrator');
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
}
