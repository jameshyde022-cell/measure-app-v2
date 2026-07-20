const { test, expect } = require('@playwright/test');
const { captureConsole } = require('./helpers');

test.describe('2. Error pages', () => {
  test('nonexistent path renders custom branded 404', async ({ page }) => {
    captureConsole(page, '404-page');
    const res = await page.goto('/this-does-not-exist-xyz123');
    // Next.js custom not-found pages are served with a 404 status.
    expect(res.status()).toBe(404);

    // App-specific branding/copy should be present.
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to homepage/i })).toBeVisible();

    // Should NOT look like a generic Vercel/Next.js error screen.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/This page could not be found/i);
    expect(bodyText).not.toMatch(/404: NOT_FOUND/i);
  });
});
