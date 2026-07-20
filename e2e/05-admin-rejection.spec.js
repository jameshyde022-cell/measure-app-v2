const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');

test.describe('5. Admin rejection', () => {
  test('a non-admin account is redirected away from /admin and blocked from /api/marketing-list', async ({ page }) => {
    captureConsole(page, 'admin-rejection');
    const { email, password } = EXISTING_ACCOUNTS.A;
    await login(page, email, password);
    expect(page.url()).toContain('/app');

    // Direct navigation to /admin should redirect away (middleware sends non-admins to /app)
    await page.goto('/admin');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 20000 });
    expect(page.url()).not.toContain('/admin');

    // Direct API call should also be forbidden, not leak real data
    const res = await page.request.get('/api/marketing-list');
    expect(res.status(), 'marketing-list should not return 200 for a non-admin').not.toBe(200);
    const body = await res.json().catch(() => ({}));
    expect(body.list).toBeUndefined();
  });
});
