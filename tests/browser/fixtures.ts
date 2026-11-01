import { test as base, expect, type Page, type Route } from '@playwright/test';

export const fixtureBookId = '71000000-0000-4000-8000-000000000001';
const personIds = {
  learner: '72000000-0000-4000-8000-000000000001',
  other: '72000000-0000-4000-8000-000000000002',
  librarian: '72000000-0000-4000-8000-000000000003',
  administrator: '72000000-0000-4000-8000-000000000004',
};
export type FixtureIdentity = keyof typeof personIds;
type Reading = { book_id: string; status: string; reflection: string | null; updated_at: string };
const book = {
  id: fixtureBookId, title_en: 'A Small Discovery', title_vi: 'Một khám phá nhỏ', author: 'EVG Test Author',
  language: 'bilingual', topic: 'nature', description_en: 'A synthetic release-check book.',
  description_vi: 'Sách giả lập dùng để kiểm tra.', cover_url: '', created_at: '2026-01-01T00:00:00Z',
};
const fixtureHost = 'https://release-check.supabase.co';

function user(identity: FixtureIdentity) {
  return {
    id: personIds[identity], aud: 'authenticated', role: 'authenticated', email: `${identity}@example.invalid`,
    email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: `Synthetic ${identity}`, preferred_language: 'en' }, identities: [],
  };
}
function session(identity: FixtureIdentity) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: personIds[identity], role: 'authenticated', exp: 4102444800 })}.synthetic-signature`;
  return { access_token: accessToken, refresh_token: `synthetic-${identity}`, expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: user(identity) };
}
function requestIdentity(route: Route): FixtureIdentity | null {
  const auth = route.request().headers().authorization ?? '';
  return (Object.keys(personIds) as FixtureIdentity[]).find(identity => auth === `Bearer ${session(identity).access_token}`) ?? null;
}

export class ReleaseBackend {
  reading = new Map<FixtureIdentity, Reading[]>();
  interests = new Map<FixtureIdentity, string[]>();
  failNextReadingSave = false;
  failCatalogue = false;
  unexpectedRequests: string[] = [];

  constructor(private page: Page) {}

  async install() {
    // All synthetic API calls are intercepted; no live account or student data is used.
    await this.page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:4179') return route.continue();
      if (url.origin === fixtureHost) return this.handle(route, url);
      // Remote covers/media are intentionally unnecessary for functional tests.
      if (route.request().resourceType() === 'image') return route.abort('blockedbyclient');
      this.unexpectedRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    });
  }

  async signIn(identity: FixtureIdentity = 'learner') {
    await this.page.goto('/sign-in?next=/learning');
    await this.page.getByLabel('Email address', { exact: true }).fill(`${identity}@example.invalid`);
    await this.page.getByLabel('Password', { exact: true }).fill('synthetic-passphrase-only');
    await this.page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(this.page).toHaveURL(/\/learning$/);
    await expect(this.page.getByRole('heading', { name: 'My reading', exact: true })).toBeVisible();
  }

  private async handle(route: Route, url: URL) {
    const method = route.request().method();
    const identity = requestIdentity(route);
    const reply = (data: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({
      status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: status === 204 ? undefined : JSON.stringify(data),
    });
    if (method === 'OPTIONS') return reply({}, 200, { 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE' });
    if (url.pathname === '/auth/v1/token') {
      const input = route.request().postDataJSON() as { email?: string };
      const next = (Object.keys(personIds) as FixtureIdentity[]).find(value => `${value}@example.invalid` === input.email);
      return next ? reply(session(next)) : reply({ error: 'invalid_grant', error_description: 'Invalid credentials' }, 400);
    }
    if (url.pathname === '/auth/v1/user') return identity ? reply(user(identity)) : reply({ msg: 'Not signed in' }, 401);
    if (url.pathname === '/auth/v1/logout') return reply(null, 204);
    if (url.pathname === '/auth/v1/recover' || url.pathname === '/auth/v1/otp' || url.pathname === '/auth/v1/resend') return reply({});
    const table = url.pathname.replace('/rest/v1/', '');
    if (table === 'books' || table === 'rpc/search_books') {
      if (this.failCatalogue) return reply({ code: 'FIXTURE_UNAVAILABLE', message: 'Synthetic unavailable response' }, 400);
      const search = table === 'rpc/search_books' ? String((route.request().postDataJSON() as { p_query?: string }).p_query ?? '').toLowerCase() : '';
      const found = !search || 'a small discovery một khám phá nhỏ'.includes(search);
      const rows = found ? [book] : [];
      if (url.searchParams.get('id')?.startsWith('eq.')) return reply(rows[0] ?? null);
      return reply(rows, 200, { 'content-range': rows.length ? `0-0/${rows.length}` : '*/0' });
    }
    if (table === 'book_availability') return reply([{ book_id: fixtureBookId, total_copies: 1, available_copies: 1 }]);
    if (table === 'staff_members') {
      const role = identity === 'librarian' || identity === 'administrator' ? identity : null;
      return reply(role && identity ? { user_id: personIds[identity], role } : null);
    }
    if (table === 'reading_records') {
      if (!identity) return reply({ code: '42501', message: 'Not authorised' }, 403);
      if (method === 'POST') {
        if (this.failNextReadingSave) { this.failNextReadingSave = false; return reply({ code: 'FIXTURE_UNAVAILABLE', message: 'Synthetic unavailable response' }, 400); }
        const input = route.request().postDataJSON() as Reading & { user_id: string };
        if (input.user_id !== personIds[identity]) return reply({ code: '42501', message: 'Not authorised' }, 403);
        const value = { book_id: input.book_id, status: input.status, reflection: input.reflection, updated_at: '2026-11-01T01:00:00Z' };
        const records = this.reading.get(identity) ?? [];
        this.reading.set(identity, [...records.filter(record => record.book_id !== value.book_id), value]);
        return reply(value, 201);
      }
      if (url.searchParams.get('user_id') !== `eq.${personIds[identity]}`) return reply({ code: '42501', message: 'Not authorised' }, 403);
      const records = this.reading.get(identity) ?? [];
      if (url.searchParams.has('book_id')) return reply(records.find(value => `eq.${value.book_id}` === url.searchParams.get('book_id')) ?? null);
      return reply(records);
    }
    if (table === 'learner_interests') return reply(identity ? (this.interests.get(identity) ?? []).map(topic => ({ topic })) : [], identity ? 200 : 403);
    if (table === 'rpc/replace_my_interests') {
      if (!identity) return reply({ code: '42501' }, 403);
      const { p_topics } = route.request().postDataJSON() as { p_topics: string[] };
      this.interests.set(identity, p_topics);
      return reply(p_topics.map(topic => ({ topic })));
    }
    if (table === 'circulation_policy') return reply({ enabled: false, timezone: 'Asia/Ho_Chi_Minh', max_active_loans: 3 });
    if (table === 'rpc/list_my_loans') return reply([]);
    if (table === 'loans' || table === 'book_copies' || table === 'circulation_borrowers') return reply([]);
    if (table === 'rpc/staff_access_status') return reply({ current_user_email: identity ? user(identity).email : null, current_staff_role: identity === 'librarian' || identity === 'administrator' ? identity : null, has_administrator: true, can_claim_initial_admin: false });
    if (table === 'rpc/list_staff_members') return identity === 'administrator' ? reply((['administrator', 'librarian'] as const).map(role => ({ user_id: personIds[role], email: user(role).email, role, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', granted_by: null, granted_by_email: null }))) : reply({ code: '42501', message: 'Administrator only' }, 403);
    if (table.startsWith('rpc/staff_')) {
      if (identity !== 'librarian' && identity !== 'administrator') return reply({ code: '42501', message: 'Staff only' }, 403);
      if (table === 'rpc/staff_alert_count') return reply(0);
      if (table === 'rpc/staff_dashboard_stats') return reply({
        timezone: 'Asia/Ho_Chi_Minh', as_of_date: '2026-11-01', loan_health: { active: 0, borrowers: 0, overdue: 0, due_soon: 0, followup: 0 },
        ageing: { days_1_7: 0, days_8_14: 0, days_15_plus: 0 }, reading: { students_reading: 1, finished: 0 },
        inventory: { available: 1, borrowed: 0, damaged: 0, lost: 0 },
        trends: [{ week: '2026-10-26', checkouts: 0, returns: 0 }], popular: [],
      });
      return reply({ items: [], total: 0, page: 1, page_size: 25 });
    }
    this.unexpectedRequests.push(`${method} ${url.pathname}`);
    return reply({ code: 'UNHANDLED_RELEASE_FIXTURE', message: 'Unexpected request in release fixture' }, 501);
  }
}

export const test = base.extend<{ backend: ReleaseBackend }>({
  backend: [async ({ page }, use) => {
    const backend = new ReleaseBackend(page);
    await backend.install();
    await use(backend);
    expect(backend.unexpectedRequests, 'No unexpected API calls or outbound requests').toEqual([]);
  }, { auto: true }],
});
export { expect };
