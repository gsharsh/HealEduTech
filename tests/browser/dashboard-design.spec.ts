import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';
import { test, expect, fixtureBookId } from './fixtures';

const fixtureHost = 'https://release-check.supabase.co';
const counts = [4, 7, 2, 9, 5, 8, 10, 6, 12, 15, 11, 8];
const returnCounts = [2, 5, 4, 6, 5, 6, 8, 9, 8, 12, 7, 6];
function dashboardStats(weeks = 12) {
  return {
    timezone: 'Asia/Ho_Chi_Minh', as_of_date: '2026-11-07',
    loan_health: { active: 18, borrowers: 12, overdue: 5, due_soon: 3, followup: 2 },
    ageing: { days_1_7: 3, days_8_14: 1, days_15_plus: 1 },
    reading: { students_reading: 24, finished: 87 },
    inventory: { available: 48, borrowed: 18, damaged: 3, lost: 1 },
    trends: Array.from({ length: weeks }, (_, index) => ({
      week: new Date(Date.UTC(2026, 10, 2 - 7 * (weeks - 1 - index))).toISOString().slice(0, 10),
      checkouts: counts[index % counts.length], returns: returnCounts[index % returnCounts.length],
    })),
    popular: [
      { book_id: fixtureBookId, title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ', checkouts: 16 },
      { book_id: '71000000-0000-4000-8000-000000000002', title_en: 'The River and the Forest', title_vi: 'Dòng sông và khu rừng', checkouts: 12 },
      { book_id: '71000000-0000-4000-8000-000000000003', title_en: 'Questions About the Night Sky', title_vi: 'Những câu hỏi về bầu trời đêm', checkouts: 9 },
    ],
  };
}
const attention = [
  { id: '74000000-0000-4000-8000-000000000001', borrower_user_id: '72000000-0000-4000-8000-000000000001', borrower_name: 'Linh Nguyen (test)', borrower_email: 'linh@example.invalid', preferred_language: 'vi', copy_id: '73000000-0000-4000-8000-000000000001', inventory_code: 'EVG-001', book_id: fixtureBookId, title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ', checked_out_at: '2026-10-01T02:00:00Z', due_date: '2026-10-20', days_overdue: 18, resolved_at: null, resolution: null, return_condition: null, latest_contact_at: null, latest_contact_by: null },
  { id: '74000000-0000-4000-8000-000000000002', borrower_user_id: '72000000-0000-4000-8000-000000000002', borrower_name: 'An Tran (test)', borrower_email: 'an@example.invalid', preferred_language: 'en', copy_id: '73000000-0000-4000-8000-000000000002', inventory_code: 'EVG-002', book_id: fixtureBookId, title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ', checked_out_at: '2026-10-10T02:00:00Z', due_date: '2026-10-29', days_overdue: 9, resolved_at: null, resolution: null, return_condition: null, latest_contact_at: '2026-11-05T02:30:00Z', latest_contact_by: 'Synthetic librarian' },
];
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
async function installDashboard(page: Page) {
  const state = { fail: false, requests: [] as number[] };
  await page.route(`${fixtureHost}/rest/v1/rpc/staff_dashboard_stats`, route => {
    const weeks = Number((route.request().postDataJSON() as { p_weeks: number }).p_weeks);
    state.requests.push(weeks);
    return state.fail ? reply(route, { code: 'FIXTURE_UNAVAILABLE' }, 400) : reply(route, dashboardStats(weeks));
  });
  await page.route(`${fixtureHost}/rest/v1/rpc/staff_alert_count`, route => reply(route, 2));
  await page.route(`${fixtureHost}/rest/v1/rpc/staff_list_loans`, route => reply(route, { items: attention, total: 2, page: 1, page_size: 5 }));
  return state;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const language of ['en', 'vi'] as const) {
  test(`populated staff dashboard is accurate, accessible and responsive in ${language}`, async ({ page, backend }, testInfo) => {
    const state = await installDashboard(page);
    await backend.signIn('librarian');
    await page.goto('/staff/dashboard');
    await expect(page.locator('.dashboard-metric').first().locator('strong')).toHaveText('18');
    const beforeLanguageChange = state.requests.length;
    if (language === 'vi') await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
    await expect(page.getByRole('heading', { name: language === 'vi' ? 'Tổng quan thư viện' : 'Library dashboard', exact: true })).toBeVisible();
    expect(state.requests.length).toBe(beforeLanguageChange);
    await expect(page.locator('.dashboard-chart__week')).toHaveCount(12);
    await expect(page.locator('.dashboard-chart__axis > span')).toHaveText(['20', '10', '0']);
    await expect(page.locator('.dashboard-followups > li')).toHaveCount(2);
    await expect(page.locator('.dashboard-inventory-total strong')).toHaveText('70');
    await expect(page.locator('.dashboard-trend-totals dd').first()).toHaveText(String(counts.reduce((sum, value) => sum + value, 0)));
    await expect(page.locator('.dashboard-trend-totals dd').last()).toHaveText(String(returnCounts.reduce((sum, value) => sum + value, 0)));
    await expect(page.getByRole('link', { name: language === 'vi' ? 'Duyệt bài gửi Cùng nhau' : 'Review Together submissions', exact: true })).toHaveAttribute('href', '/community#review-desk-title');
    await page.evaluate(() => document.fonts.ready);
    await noOverflow(page);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${language}.png`), fullPage: true });
    await page.locator('.dashboard-trend-details summary').click();
    await expect(page.locator('.dashboard-numeric-table tbody tr')).toHaveCount(12);
    await expect(page.locator('.dashboard-numeric-table tbody tr').first().locator('td')).toHaveText(['4', '2']);
    await page.locator('.dashboard-period select').selectOption('4');
    await expect(page).toHaveURL('/staff/dashboard?weeks=4');
    await expect(page.locator('.dashboard-chart__week')).toHaveCount(4);
    await page.locator('.dashboard-period select').selectOption('52');
    await expect(page.locator('.dashboard-chart__week')).toHaveCount(52);
    await expect(page.locator('.dashboard-numeric-table tbody tr')).toHaveCount(52);
    await noOverflow(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await noOverflow(page);
  });
}

test('dashboard distinguishes no activity from failed data and retry restores real totals', async ({ page, backend }, testInfo) => {
  await backend.signIn('librarian');
  await page.goto('/staff/dashboard');
  await expect(page.getByRole('heading', { name: 'No checkouts or returns in this period.', exact: true })).toBeVisible();
  await expect(page.locator('.dashboard-chart__bar')).toHaveCount(0);
  await expect(page.locator('.dashboard-metric--alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No follow-up needed', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-empty.png'), fullPage: true });
  const state = await installDashboard(page);
  state.fail = true;
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('We could not load these records.');
  await expect(page.locator('.dashboard-metric')).toHaveCount(0);
  state.fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.dashboard-metric').first().locator('strong')).toHaveText('18');
});

test('staff desk and administration provide accessible shortcuts for library and teaching work', async ({ page, backend }, testInfo) => {
  await backend.signIn('administrator');
  for (const route of ['/staff', '/admin/settings']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route === '/staff') await expect(page.getByRole('link', { name: 'Open review desk', exact: true })).toHaveAttribute('href', '/community#review-desk-title');
    else await expect(page.getByRole('heading', { name: 'Staff permissions', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await noOverflow(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(route === '/staff' ? 'staff-desk.png' : 'administration.png'), fullPage: true });
  }
});
