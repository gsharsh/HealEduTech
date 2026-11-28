import type { Page, TestInfo } from '@playwright/test';
import { expect, fixtureBookId, test } from './fixtures';

// Inspect the painted surfaces inside each workspace. Checking root tokens alone
// misses route styles that override a panel after the shared stylesheet loads.
async function checkWorkspace(page: Page, surfaceSelector: string, name: string, testInfo: TestInfo) {
  const surface = page.locator('main').locator(surfaceSelector);
  await expect(surface).toBeVisible();
  const painted = await surface.evaluate(element => {
    const style = getComputedStyle(element);
    return [style.backgroundColor, style.backgroundImage].join(' ');
  });
  expect(painted, 'The main workspace surface uses sage or olive').toMatch(/rgb\((224, 231, 215|183, 195, 150)\)/);
  await expect(page.locator('.evg-shell')).toHaveCSS('background-color', 'rgb(251, 248, 244)');
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await expect(page.locator('.evg-header')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath(`role-${name}-${testInfo.project.name}.png`) });
}

test('student reading and account dashboards share sage surfaces on a warm canvas', async ({ page, backend }, testInfo) => {
  backend.reading.set('learner', [{
    book_id: fixtureBookId,
    status: 'currently_reading',
    reflection: null,
    updated_at: '2026-11-07T00:00:00Z',
  }]);
  await backend.signIn();
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await checkWorkspace(page, '.reading-page > .page-heading', 'student-reading', testInfo);

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await checkWorkspace(page, '.account-identity', 'student-account', testInfo);
});

test('librarian desk and dashboard share sage surfaces on a warm canvas', async ({ page, backend }, testInfo) => {
  await backend.signIn('librarian');
  await page.goto('/staff');
  const dashboardLink = page.getByRole('link', { name: 'Open dashboard', exact: true });
  await expect(dashboardLink).toBeVisible();
  await checkWorkspace(page, '.staff-page__hero', 'librarian-desk', testInfo);

  await dashboardLink.click();
  await expect(page.getByRole('heading', { name: 'No follow-up needed', exact: true })).toBeVisible();
  await checkWorkspace(page, '.dashboard-heading', 'librarian-dashboard', testInfo);
});

test('administrator dashboard shares the sage surface and warm canvas', async ({ page, backend }, testInfo) => {
  await backend.signIn('administrator');
  await page.goto('/admin/settings');
  await expect(page.getByText('librarian@example.invalid', { exact: true })).toBeVisible();
  await expect(page.locator('.evg-staff-nav [aria-current="page"]')).toBeInViewport({ ratio: 1 });
  await checkWorkspace(page, '.administrator-workspace__heading', 'administrator', testInfo);
});
