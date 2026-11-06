import { test, expect } from './fixtures';

test('a pending sign-in locks auth modes and respects the decision to keep browsing', async ({ page }) => {
  let releaseRequest!: () => void;
  const gate = new Promise<void>(resolve => { releaseRequest = resolve; });
  let started = false;
  await page.route('**/auth/v1/token**', async route => {
    started = true;
    await gate;
    await route.fallback();
  });
  try {
    await page.goto('/sign-in?next=/learning');
    await page.getByLabel('Email address', { exact: true }).fill('learner@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('synthetic-passphrase-only');
    await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('button', { name: /Forgot.*password/i })).toBeDisabled();
    await expect(page.locator('.auth-links button').last()).toBeDisabled();
    await expect(page.locator('.account-tabs button').last()).toBeDisabled();
    await page.locator('.auth-card-footer__links a').click();
    await expect(page).toHaveURL('/library');
    releaseRequest();
    // The successful session is allowed to complete, but its departed form
    // must not send the reader away from their newly chosen destination.
    await expect(page.locator('.evg-account-link')).toHaveText('Account');
    await expect(page).toHaveURL('/library');
    await expect(page.getByRole('heading', { name: 'Find a little wonder.', exact: true })).toBeVisible();
  } finally {
    releaseRequest();
  }
});

test('registration focuses the invalid field and preserves the other entries', async ({ page }) => {
  await page.goto('/sign-in');
  await page.locator('.account-tabs button').last().click();
  await page.locator('#display-name').fill('Synthetic reader');
  await page.locator('#auth-email').fill('learner@example.invalid');
  await page.locator('#new-password').fill('a-long-synthetic-passphrase');
  await page.locator('#confirm-password').fill('a-different-passphrase');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('#confirm-password')).toBeFocused();
  await expect(page.locator('#confirm-password')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#auth-email')).toHaveValue('learner@example.invalid');
  await expect(page.locator('#display-name')).toHaveValue('Synthetic reader');
  await page.locator('#confirm-password').fill('a-long-synthetic-passphrase');
  await expect(page.locator('#confirm-password')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
