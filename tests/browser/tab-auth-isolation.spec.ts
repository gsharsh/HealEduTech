import { test, expect, ReleaseBackend, fixtureBookId } from './fixtures';

test('same-browser guest and learner tabs retain separate identities through reload and local sign-out', async ({ page, context, backend }) => {
  const otherPage = await context.newPage();
  const guestPage = await context.newPage();
  const otherBackend = new ReleaseBackend(otherPage);
  const guestBackend = new ReleaseBackend(guestPage);
  await otherBackend.install();
  await guestBackend.install();
  backend.reading.set('learner', [{ book_id: fixtureBookId, status: 'finished', reflection: 'Private note belonging only to tab A.', updated_at: '2026-11-01T01:00:00Z' }]);
  otherBackend.reading.set('other', [{ book_id: fixtureBookId, status: 'finished', reflection: 'Private note belonging only to tab B.', updated_at: '2026-11-01T01:00:00Z' }]);
  try {
    // These pages deliberately share one BrowserContext and origin. Separate
    // contexts would hide SDK authentication broadcasts between real tabs.
    await guestPage.goto('/learning');
    await expect(guestPage.getByRole('heading', { name: 'Your reading space', exact: true })).toBeVisible();
    await backend.signIn('learner');
    await page.goto('/account');
    await expect(page.locator('#account-email')).toHaveValue('learner@example.invalid');
    await otherBackend.signIn('other');
    await otherPage.goto('/account');
    await expect(otherPage.locator('#account-email')).toHaveValue('other@example.invalid');
    await expect(page.locator('#account-email')).toHaveValue('learner@example.invalid');
    await expect(guestPage.getByRole('heading', { name: 'Your reading space', exact: true })).toBeVisible();

    await page.reload();
    await otherPage.reload();
    await expect(page.locator('#account-email')).toHaveValue('learner@example.invalid');
    await expect(otherPage.locator('#account-email')).toHaveValue('other@example.invalid');
    await page.getByRole('button', { name: 'Sign out of this tab', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
    await expect(otherPage.locator('#account-email')).toHaveValue('other@example.invalid');
    await otherPage.goto('/learning');
    await expect(otherPage.getByText('Private note belonging only to tab B.', { exact: false }).first()).toBeVisible();
    await expect(otherPage.getByText('Private note belonging only to tab A.', { exact: false })).toHaveCount(0);
    await page.goto('/learning');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your reading space', exact: true })).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByRole('heading', { name: 'Your reading space', exact: true })).toBeVisible();
    await otherPage.reload();
    await expect(otherPage.getByText('Private note belonging only to tab B.', { exact: false }).first()).toBeVisible();
  } finally {
    expect(otherBackend.unexpectedRequests).toEqual([]);
    expect(guestBackend.unexpectedRequests).toEqual([]);
    await otherPage.close();
    await guestPage.close();
  }
});
