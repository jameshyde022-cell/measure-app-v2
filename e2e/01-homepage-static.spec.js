const { test, expect } = require('@playwright/test');
const { captureConsole } = require('./helpers');

test.describe('1. Homepage & static pages', () => {
  test('homepage renders with MEASURE branding', async ({ page }) => {
    captureConsole(page, 'homepage');
    const res = await page.goto('/');
    expect(res.status(), 'homepage should return 200').toBeLessThan(400);
    await expect(page.getByText('MEASURE', { exact: false }).first()).toBeVisible();
  });

  const staticPages = ['/pricing', '/terms', '/privacy', '/refund-policy', '/contact'];
  for (const path of staticPages) {
    test(`${path} returns real content`, async ({ page }) => {
      captureConsole(page, path);
      const res = await page.goto(path);
      expect(res.status(), `${path} should return 200`).toBeLessThan(400);
      // Should not be a bare Next.js error page — body should have substantial text content.
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(100);
      expect(bodyText).not.toMatch(/Application error: a client-side exception/i);
    });
  }
});
