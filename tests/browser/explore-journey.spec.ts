import AxeBuilder from '@axe-core/playwright';
import { test, expect, fixtureBookId } from './fixtures';

const newBookId = '71000000-0000-4000-8000-000000000099';
const scienceBook = {
  id: newBookId, title_en: 'A New Science Question', title_vi: 'Một câu hỏi khoa học mới', author: 'Synthetic Author',
  language: 'bilingual', topic: 'science', description_en: 'Synthetic catalogue record.', description_vi: 'Sách giả lập.', cover_url: '',
};

// External resources are inspected as links, never loaded in these tests.
test('guests can change paths, return with Back, and open a Vietnamese learning resource without private requests', async ({ page }, testInfo) => {
  const privateReads: string[] = [];
  page.on('request', request => { if (/\/rest\/v1\/(reading_records|learner_interests)/.test(request.url())) privateReads.push(request.url()); });
  await page.goto('/explore?topic=science');
  const chooser = page.getByRole('group', { name: 'What are you curious about today?' });
  await expect(chooser.getByRole('button', { name: /Science & making/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'How does a rocket lift off?' })).toHaveAttribute('href', 'https://spaceplace.nasa.gov/launching-into-space/en/');
  await expect(page.getByRole('link', { name: 'Can you balance it?' })).toHaveAttribute('rel', 'noopener noreferrer');
  await chooser.getByRole('button', { name: /Stories/ }).click();
  await expect(page).toHaveURL(/topic=stories/);
  await expect(page.getByRole('link', { name: 'Listen to Library Lion' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/topic=science/);
  await page.getByRole('switch', { name: 'Tiếng Việt / Vietnamese' }).click();
  await expect(page.getByRole('link', { name: 'Em có thể giữ thăng bằng không?' })).toHaveAttribute('href', 'https://phet.colorado.edu/vi/simulations/balancing-act');
  await page.getByRole('button', { name: 'Thử hoạt động này' }).click();
  await expect(page.locator('.activity-detail')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(privateReads).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('explore-science-vietnamese.png'), fullPage: true });
});

test('one interest read and one bounded reading join explain a next book while excluding the recent title', async ({ page, backend }) => {
  backend.interests.set('learner', ['science']);
  await backend.signIn();
  const recentQueries: URL[] = [];
  let interestReads = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/learner_interests')) interestReads += 1; });
  await page.route('**/rest/v1/reading_records?*', async route => {
    const url = new URL(route.request().url());
    if (!url.searchParams.get('select')?.includes('books(')) return route.fallback();
    recentQueries.push(url);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { book_id: fixtureBookId, status: 'finished', updated_at: '2026-11-07T00:00:00Z', books: { title_en: 'My Earlier Science Book', title_vi: 'Sách khoa học trước đây', topic: 'science' } },
    ]) });
  });
  await page.route('**/rest/v1/books?*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('topic') !== 'eq.science') return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify([
      { ...scienceBook, id: fixtureBookId, title_en: 'My Earlier Science Book' }, scienceBook,
    ]) });
  });
  await page.goto('/explore');
  await expect(page.getByRole('link', { name: 'A New Science Question', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Earlier Science Book', exact: true })).toHaveCount(0);
  await expect(page.locator('.explore-reason')).toContainText('An interest you saved, and a topic you have been reading.');
  await expect(page.locator('.explore-reason')).toContainText('My Earlier Science Book');
  expect(recentQueries).toHaveLength(1);
  expect(recentQueries[0].searchParams.get('limit')).toBe('24');
  expect(recentQueries[0].searchParams.get('user_id')).toBe('eq.72000000-0000-4000-8000-000000000001');
  expect(recentQueries[0].searchParams.get('select')).not.toContain('reflection');
  expect(interestReads).toBe(1);
  await page.getByRole('group', { name: 'Your interests' }).getByRole('button', { name: /Science & making/ }).click();
  await page.getByRole('button', { name: 'Save interests', exact: true }).click();
  await expect(page.locator('.explore-reason')).toContainText('Continues a topic from your recent reading.');
  expect(interestReads, 'Saving uses the returned interest list without fetching it again').toBe(1);
});

test('a failed recent-reading request degrades to interests and has an explicit recovery action', async ({ page, backend }) => {
  backend.interests.set('learner', ['nature']);
  await backend.signIn();
  let failReading = true;
  let readingCalls = 0;
  await page.route('**/rest/v1/reading_records?*', route => {
    if (!new URL(route.request().url()).searchParams.get('select')?.includes('books(')) return route.fallback();
    readingCalls += 1;
    return failReading
      ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'SYNTHETIC_OUTAGE', message: 'Failed' }) })
      : route.fallback();
  });
  await page.goto('/explore');
  await expect(page.getByText('Your recent reading could not be checked.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await expect(page.locator('.explore-reason')).toContainText('Matches one of your saved interests.');
  expect(readingCalls).toBe(1);
  failReading = false;
  await page.getByRole('button', { name: 'Reload recent reading' }).click();
  await expect(page.getByText('Your recent reading could not be checked.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'A Small Discovery', exact: true })).toBeVisible();
  expect(readingCalls).toBe(2);
});

test('leaving a pending personalised journey and signing out does not reveal its late results', async ({ page, backend }) => {
  await backend.signIn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  await page.route('**/rest/v1/reading_records?*', async route => {
    if (!new URL(route.request().url()).searchParams.get('select')?.includes('books(')) return route.fallback();
    started = true;
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { book_id: newBookId, status: 'finished', updated_at: '2026-11-07T00:00:00Z', books: { title_en: 'A PRIVATE RECENT TITLE', title_vi: 'Sách riêng', topic: 'nature' } },
    ]) }).catch(() => {});
  });
  try {
    await page.goto('/explore');
    await expect.poll(() => started).toBe(true);
    await page.goto('/account');
    await page.getByRole('button', { name: 'Sign out of this tab', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    release();
    await page.goto('/explore');
    await expect(page.getByRole('heading', { name: 'Make this journey yours' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'A Small Discovery', exact: true })).toBeVisible();
    await expect(page.locator('.explore-reason')).toContainText('A book in the topic you are exploring.');
    await expect(page.getByText('A PRIVATE RECENT TITLE', { exact: false })).toHaveCount(0);
  } finally { release(); }
});
