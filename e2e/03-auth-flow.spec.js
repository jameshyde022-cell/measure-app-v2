const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');

// The SIGNUP portion of this flow is covered separately, last, in
// 12-signup-rate-limit.spec.js — see that file for why. This spec only
// covers login/logout, which is unaffected by the Supabase signup rate
// limit and can safely reuse an existing account.
test.describe('3. Login -> Logout flow (existing account)', () => {
  test('an existing account can log in, land on /app, and log out', async ({ page }) => {
    captureConsole(page, 'auth-flow-login-logout');
    const { email, password } = EXISTING_ACCOUNTS.B;

    // Login
    await login(page, email, password);
    await page.waitForURL(/\/app/, { timeout: 20000 });
    expect(page.url()).toContain('/app');

    // Sign out (control lives in the app header)
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 20000 });
    expect(page.url()).toContain('/login');

    // /app should no longer be accessible without re-authenticating
    await page.goto('/app');
    await page.waitForURL(/\/login/, { timeout: 20000 });
    expect(page.url()).toContain('/login');
  });
});
