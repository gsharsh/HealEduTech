import type { Page, Route } from '@playwright/test';
import { test, expect, fixtureBookId } from './fixtures';

const fixtureHost = 'https://release-check.supabase.co';
const personId = '72000000-0000-4000-8000-000000000001';
const copyId = '73000000-0000-4000-8000-000000000001';
const loanId = '74000000-0000-4000-8000-000000000001';
const catalogueBook = (index: number) => ({
  id: `71000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  title_en: `Catalogue title ${String(index).padStart(2, '0')}`, title_vi: `Sách ${index}`, author: 'Synthetic author',
  language: 'bilingual', topic: 'nature', description_en: 'Synthetic catalogue record.', description_vi: 'Sách kiểm tra.',
  cover_url: '', created_at: '2026-01-01T00:00:00Z',
});
const reply = (route: Route, data: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers }, body: JSON.stringify(data) });

async function installCatalogue(page: Page, count = 27) {
  const books = Array.from({ length: count }, (_, index) => catalogueBook(index + 1));
  const state = { failAvailability: false, books };
  await page.route(`${fixtureHost}/rest/v1/books?*`, route => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 24);
    const values = state.books.slice(offset, offset + limit);
    return reply(route, values, 200, { 'content-range': values.length ? `${offset}-${offset + values.length - 1}/${state.books.length}` : `*/${state.books.length}` });
  });
  await page.route(`${fixtureHost}/rest/v1/rpc/search_books*`, route => {
    const query = String((route.request().postDataJSON() as { p_query: string }).p_query).toLowerCase();
    const values = state.books.filter(book => book.title_en.toLowerCase().includes(query));
    return reply(route, values, 200, { 'content-range': values.length ? `0-${values.length - 1}/${values.length}` : '*/0' });
  });
  await page.route(`${fixtureHost}/rest/v1/book_availability?*`, route => state.failAvailability
    ? reply(route, { code: 'FIXTURE_FAILURE', message: 'Unavailable' }, 400)
    : reply(route, state.books.map(book => ({ book_id: book.id, total_copies: 3, available_copies: 2 }))));
  return state;
}

async function installCirculation(page: Page) {
  const loan = {
    id: loanId, borrower_user_id: personId, borrower_name: 'Synthetic learner', borrower_email: 'learner@example.invalid',
    preferred_language: 'en', copy_id: copyId, inventory_code: 'EVG-001', book_id: fixtureBookId,
    title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ', checked_out_at: '2026-11-01T00:00:00Z',
    due_date: '2099-11-30', days_overdue: 0, resolved_at: null as string | null,
    resolution: null as string | null, return_condition: null as string | null, latest_contact_at: null, latest_contact_by: null,
  };
  await page.route(`${fixtureHost}/rest/v1/rpc/staff_list_loans`, route => {
    const input = route.request().postDataJSON() as { p_page?: number };
    return reply(route, { items: input.p_page === 99 ? [] : [loan], total: 1, page: input.p_page ?? 1, page_size: 25 });
  });
  await page.route(`${fixtureHost}/rest/v1/circulation_policy?*`, route => reply(route, { enabled: true, max_active_loans: 3, timezone: 'Asia/Ho_Chi_Minh' }));
  await page.route(`${fixtureHost}/rest/v1/book_copies?*`, route => reply(route, [{ id: copyId, book_id: fixtureBookId, inventory_code: 'EVG-001', condition: 'usable', shelf_location: 'A', books: { title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ' } }]));
  await page.route(`${fixtureHost}/rest/v1/loans?*`, route => reply(route, loan.resolved_at ? [] : [{ copy_id: copyId }]));
  return loan;
}

test('staff can manage catalogue titles after the first page and search directly', async ({ page, backend }) => {
  await backend.signIn('librarian');
  await installCatalogue(page);
  await page.goto('/staff/catalogue');
  await expect(page.getByRole('heading', { name: 'Catalogue title 01', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Catalogue pages' }).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('heading', { name: 'Catalogue title 25', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Catalogue title 01', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Catalogue title 27', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a catalogue title' }).fill('title 07');
  await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Catalogue title 07', exact: true })).toBeVisible();
  await expect(page.locator('.admin-book-row')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Catalogue pages' })).toContainText('1 title');
});

test('unknown inventory cannot be overwritten by a guessed copy count', async ({ page, backend }) => {
  await backend.signIn('librarian');
  const state = await installCatalogue(page, 1);
  state.failAvailability = true;
  await page.goto('/staff/catalogue');
  await expect(page.getByText('Stock could not be verified. Refresh before editing this title.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();
  state.failAvailability = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: /Total physical copies/ })).toHaveValue('3');
});

test('a pending catalogue save locks replacement editors and preserves the submitted copy count', async ({ page, backend }) => {
  await backend.signIn('librarian');
  const state = await installCatalogue(page, 2);
  let releaseSave!: () => void;
  const wait = new Promise<void>(resolve => { releaseSave = resolve; });
  const payloads: Record<string, unknown>[] = [];
  await page.route(`${fixtureHost}/rest/v1/rpc/set_book_copy_count`, async route => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    payloads.push(payload);
    await wait;
    state.books[0].title_en = String(payload.p_title_en);
    return reply(route, fixtureBookId);
  });
  await page.route(`${fixtureHost}/rest/v1/rpc/update_book_cover`, route => reply(route, null));
  await page.goto('/staff/catalogue');
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Title in English', exact: true }).fill('Revised catalogue title');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(1);
  await expect(page.getByRole('button', { name: 'Add book', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Edit', exact: true }).last()).toBeDisabled();
  releaseSave();
  await expect(page.getByRole('heading', { name: 'Revised catalogue title', exact: true })).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(payloads[0].p_total_copies).toBe(3);
});

test('loan resolution reviews the exact copy and cancellation makes no change', async ({ page, backend }, testInfo) => {
  await backend.signIn('librarian');
  const loan = await installCirculation(page);
  const payloads: Record<string, unknown>[] = [];
  await page.route(`${fixtureHost}/rest/v1/rpc/resolve_circulation_loan`, route => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    payloads.push(payload);
    loan.resolved_at = '2026-11-07T00:00:00Z'; loan.resolution = String(payload.p_resolution);
    return reply(route, loan);
  });
  await page.goto('/staff/circulation');
  await page.getByRole('button', { name: 'Resolve as lost', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review loan resolution' });
  await expect(dialog).toContainText('EVG-001');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(payloads).toHaveLength(0);
  await page.getByRole('button', { name: 'Resolve as lost', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('loan-resolution-review.png') });
  await dialog.getByRole('button', { name: 'Confirm resolution', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loan resolved.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resolve as lost', exact: true })).toHaveCount(0);
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({ p_loan_id: loanId, p_resolution: 'lost', p_return_condition: null });
});

test('failed borrower lookup stops loading and can recover; empty loan pages have a way back', async ({ page, backend }) => {
  await backend.signIn('librarian');
  await installCirculation(page);
  let failed = true;
  await page.route(`${fixtureHost}/rest/v1/rpc/staff_list_students`, route => failed
    ? reply(route, { code: 'FIXTURE_FAILURE' }, 503)
    : reply(route, { items: [], total: 0, page: 1, page_size: 25 }));
  await page.goto('/staff/circulation?page=99');
  const registration = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Register borrower', exact: true }) });
  await expect(registration.getByRole('alert')).toBeVisible();
  await expect(registration.getByRole('status')).toHaveCount(0);
  failed = false;
  await registration.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(registration.getByText('No matching student accounts.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to first page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resolve as lost', exact: true })).toBeVisible();
});

test('staff permission removal requires review and explains last-administrator protection', async ({ page, backend }, testInfo) => {
  await backend.signIn('administrator');
  const attempts: unknown[] = [];
  await page.route(`${fixtureHost}/rest/v1/rpc/revoke_staff_access`, route => {
    attempts.push(route.request().postDataJSON());
    return reply(route, { code: '55000', message: 'At least one administrator must remain' }, 400);
  });
  await page.goto('/admin/settings');
  const row = page.getByRole('row').filter({ hasText: 'administrator@example.invalid' });
  await row.getByRole('button', { name: 'Revoke', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove staff access?' });
  await expect(dialog).toContainText('administrator@example.invalid');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(attempts).toHaveLength(0);
  await row.getByRole('button', { name: 'Revoke', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('At least one administrator must remain.');
  expect(attempts).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath('staff-permission-review.png') });
});
