const { test, expect } = require('@playwright/test');
const { captureConsole, randomTestEmail } = require('./helpers');

test.describe('4. Password reset request', () => {
  test('submitting an email shows the generic success message', async ({ page }) => {
    captureConsole(page, 'forgot-password');
    await page.goto('/forgot-password');
    await page.getByPlaceholder('you@example.com').fill(randomTestEmail('forgot'));
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/if an account exists for that email/i)).toBeVisible({ timeout: 15000 });
  });
});
