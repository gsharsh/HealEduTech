import { test, expect } from './fixtures';

test('typing a catalogue search burst sends only the completed query', async ({ page }) => {
  const searches: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/rest/v1/rpc/search_books') searches.push(request.postDataJSON().p_query);
  });
  await page.goto('/library');
  await expect(page.getByRole('link', { name: 'A Small Discovery', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search books', exact: true }).pressSequentially('Discovery', { delay: 20 });
  await expect(page.getByRole('searchbox', { name: 'Search books', exact: true })).toHaveValue('Discovery');
  await expect(page.getByRole('link', { name: 'A Small Discovery', exact: true })).toBeVisible();
  expect(searches).toEqual(['Discovery']);
  await expect(page).toHaveURL(/q=Discovery/);
});

test('home and library navigation reuse the public catalogue until a staff change invalidates it', async ({ page }) => {
  let catalogueReads = 0;
  let availabilityReads = 0;
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path === '/rest/v1/books') catalogueReads += 1;
    if (path === '/rest/v1/book_availability') availabilityReads += 1;
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  expect(catalogueReads).toBe(1);
  expect(availabilityReads).toBe(1);
  await page.getByRole('link', { name: 'Browse books', exact: true }).click();
  await expect(page).toHaveURL('/library');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  expect(catalogueReads).toBe(1);
  expect(availabilityReads).toBe(1);
  await page.getByRole('link', { name: 'EVG Learn & Grow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What will you discover today?', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  expect(catalogueReads).toBe(1);
  // This is the same event emitted by successful library/loan mutations.
  await page.evaluate(() => window.dispatchEvent(new Event('staff-data-changed')));
  await page.getByRole('link', { name: 'Browse books', exact: true }).click();
  await expect(page).toHaveURL('/library');
  await expect(page.getByRole('region', { name: 'Books in the library' })).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('link', { name: /A Small Discovery/ })).toBeVisible();
  await expect.poll(() => catalogueReads).toBe(2);
  await expect.poll(() => availabilityReads).toBe(2);
});

test('staff focus storms avoid duplicate reads while a real data-change notification refreshes immediately', async ({ page, backend }) => {
  // Sign-in finishes before the staff-role lookup and header badge have settled.
  // Keep requests from that departing document out of the dashboard counters.
  const initialAlert = page.waitForResponse(response => new URL(response.url()).pathname === '/rest/v1/rpc/staff_alert_count');
  await backend.signIn('librarian');
  await initialAlert;
  const counts = { dashboard: 0, alerts: 0, access: 0 };
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path === '/rest/v1/rpc/staff_dashboard_stats') counts.dashboard += 1;
    if (path === '/rest/v1/rpc/staff_alert_count') counts.alerts += 1;
    if (path === '/rest/v1/staff_members') counts.access += 1;
  });
  await page.goto('/staff/dashboard');
  await expect(page.getByRole('heading', { name: 'Library dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Loan health', exact: true })).toBeVisible();
  await expect.poll(() => counts.dashboard).toBe(1);
  await expect.poll(() => counts.alerts).toBe(1);
  const baseline = { ...counts };
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });
  // Give React's scheduled effects a frame to reveal an accidental new request.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(counts).toEqual(baseline);
  await page.evaluate(() => window.dispatchEvent(new Event('staff-data-changed')));
  await expect.poll(() => counts.dashboard).toBe(baseline.dashboard + 1);
  await expect.poll(() => counts.alerts).toBe(baseline.alerts + 1);
});

test('circulation focus bursts share one desk snapshot while mutation and manual refresh stay immediate', async ({ page, backend }) => {
  await backend.signIn('librarian');
  const counts = { borrowers: 0, copies: 0, activeLoans: 0, policy: 0, loans: 0, students: 0 };
  const paths = {
    '/rest/v1/circulation_borrowers': 'borrowers',
    '/rest/v1/book_copies': 'copies',
    '/rest/v1/loans': 'activeLoans',
    '/rest/v1/circulation_policy': 'policy',
    '/rest/v1/rpc/staff_list_loans': 'loans',
    '/rest/v1/rpc/staff_list_students': 'students',
  } as const;
  page.on('request', request => {
    const path = new URL(request.url()).pathname as keyof typeof paths;
    if (paths[path]) counts[paths[path]] += 1;
  });
  const expected = (count: number) => ({ borrowers: count, copies: count, activeLoans: count, policy: count, loans: count, students: count });
  await page.goto('/staff/circulation');
  await expect(page.getByRole('heading', { name: 'Circulation desk', exact: true })).toBeVisible();
  await expect.poll(() => ({ ...counts })).toEqual(expected(1));
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    }
    // Let effects and their network requests flush after the incidental events.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(counts).toEqual(expected(1));
  await page.evaluate(() => window.dispatchEvent(new Event('staff-data-changed')));
  await expect.poll(() => ({ ...counts })).toEqual(expected(2));
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => ({ ...counts })).toEqual(expected(3));
});
