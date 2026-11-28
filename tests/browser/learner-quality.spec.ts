import { test, expect, fixtureBookId } from './fixtures';

const savedReflection = 'A thought I want to keep when I read this again.';

// These journeys use the same intercepted synthetic backend as the release suite.
// They exercise state transitions, delayed requests, and failure recovery without
// reading or writing production accounts.
test('reading edits use the loaded record and discard restores the saved draft', async ({ page, backend }) => {
  backend.reading.set('learner', [{ book_id: fixtureBookId, status: 'finished', reflection: savedReflection, updated_at: '2026-11-01T01:00:00Z' }]);
  const perBookRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/reading_records') && url.searchParams.has('book_id')) perBookRequests.push(request.url());
  });
  await backend.signIn();
  const review = page.getByRole('textbox', { name: 'Your private review (optional)' });
  await expect(review).toHaveValue(savedReflection);
  expect(perBookRequests, 'The reading list must not fetch every saved record again').toEqual([]);
  await review.fill('An unsaved replacement');
  await expect(page.getByText('Changes not saved yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(review).toHaveValue(savedReflection);
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Move back to reading', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Mark as finished', exact: true }).click();
  await expect(review).toHaveValue(savedReflection);
});

test('interest loading failures are distinct and failed saves retain selected topics', async ({ page, backend }) => {
  await backend.signIn();
  let failLoad = true;
  let failSave = true;
  await page.route('**/rest/v1/learner_interests?*', route => failLoad
    ? route.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Synthetic load outage' }) })
    : route.fallback());
  await page.route('**/rest/v1/rpc/replace_my_interests', route => failSave
    ? route.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Synthetic save outage' }) })
    : route.fallback());
  await page.goto('/explore');
  await expect(page.getByRole('alert')).toContainText('We could not load your interests');
  failLoad = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  const save = page.getByRole('button', { name: 'Save interests', exact: true });
  await expect(save).toBeDisabled();
  const nature = page.getByRole('group', { name: 'Your interests' }).getByRole('button', { name: /Nature/ });
  await nature.click();
  await save.click();
  await expect(page.getByRole('alert')).toContainText('Your choices are still here');
  await expect(nature).toHaveAttribute('aria-pressed', 'true');
  failSave = false;
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Interests saved' })).toBeVisible();
  await expect(save).toBeDisabled();
  await page.reload();
  await page.locator('.explore-preferences > summary').click();
  await expect(nature).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload();
  await page.locator('.explore-preferences > summary').click();
  await expect(nature).toHaveAttribute('aria-pressed', 'false');
});

test('book details become usable before optional related books finish loading', async ({ page }) => {
  let releaseRelated!: () => void;
  const related = new Promise<void>(resolve => { releaseRelated = resolve; });
  await page.route('**/rest/v1/books?*', async route => {
    if (!new URL(route.request().url()).searchParams.get('id')?.startsWith('neq.')) return route.fallback();
    await related;
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
  });
  try {
    await page.goto(`/library/${fixtureBookId}?returnTo=${encodeURIComponent('/library?topic=nature')}`);
    await expect(page.getByRole('heading', { name: 'A Small Discovery', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to add to My Reading', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Library', exact: false })).toHaveAttribute('href', '/library?topic=nature');
  } finally {
    releaseRelated();
  }
});

test('pagination restores the preceding page without showing stale books', async ({ page }) => {
  let holdFirstPage = false;
  let releaseFirstPage!: () => void;
  const gate = new Promise<void>(resolve => { releaseFirstPage = resolve; });
  await page.route('**/rest/v1/books?*', async route => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (holdFirstPage && offset === 0) await gate;
    const count = offset === 0 ? 24 : 1;
    const rows = Array.from({ length: count }, (_, index) => ({
      id: `71000000-0000-4000-8000-${String(offset + index + 1).padStart(12, '0')}`,
      title_en: offset === 0 ? `First shelf ${index + 1}` : 'Last shelf book', title_vi: 'Sách thử nghiệm',
      author: 'Synthetic Author', language: 'bilingual', topic: 'nature',
      description_en: 'Synthetic catalogue book.', description_vi: 'Sách kiểm tra.', cover_url: '',
    }));
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': `${offset}-${offset + count - 1}/25` }, body: JSON.stringify(rows) });
  });
  try {
    await page.goto('/library');
    await expect(page.getByRole('link', { name: 'First shelf 1', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('link', { name: /Last shelf book/ })).toBeVisible();
    await expect(page.locator('.library-result-count')).toBeFocused();
    holdFirstPage = true;
    await page.goBack();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole('region', { name: 'Books in the library' })).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('link', { name: /Last shelf book/ })).toHaveCount(0);
    releaseFirstPage();
    await expect(page.getByRole('link', { name: 'First shelf 1', exact: true })).toBeVisible();
    await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible();
  } finally {
    releaseFirstPage();
  }
});

test('large private reading histories load every record with bounded book lookups', async ({ page, backend }) => {
  await backend.signIn();
  const records = Array.from({ length: 1005 }, (_, index) => ({
    book_id: `73000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    status: 'currently_reading', reflection: null,
    updated_at: index === 1004 ? '2026-11-06T01:00:00Z' : '2026-11-01T01:00:00Z',
  }));
  const readingCursors: string[] = [];
  const bookBatchSizes: number[] = [];
  await page.route('**/rest/v1/reading_records?*', route => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get('book_id')?.replace(/^gt\./, '') ?? '';
    readingCursors.push(cursor);
    expect(url.searchParams.get('user_id')).toBe('eq.72000000-0000-4000-8000-000000000001');
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    const rows = records.filter(record => record.book_id > cursor).slice(0, limit);
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rows) });
  });
  await page.route('**/rest/v1/books?*', route => {
    const filter = new URL(route.request().url()).searchParams.get('id') ?? '';
    const ids = filter.replace(/^in\./, '').slice(1, -1).split(',');
    bookBatchSizes.push(ids.length);
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ids.map(id => ({ id, title_en: 'Synthetic book', title_vi: 'Sách thử nghiệm', author: null, cover_url: null }))) });
  });
  const summary = await page.evaluate(async () => {
    const modulePath = '/src/features/learning/reading.ts';
    const reading = await import(modulePath);
    const records = await reading.listMyReading('72000000-0000-4000-8000-000000000001');
    const books = await reading.listBooksForReading(records.map((record: { book_id: string }) => record.book_id));
    return { count: records.length, first: records[0].book_id, books: books.length };
  });
  expect(summary).toEqual({ count: 1005, first: records[1004].book_id, books: 1005 });
  expect(readingCursors).toEqual(['', records[999].book_id]);
  expect(bookBatchSizes).toEqual([...Array<number>(10).fill(100), 5]);
});
