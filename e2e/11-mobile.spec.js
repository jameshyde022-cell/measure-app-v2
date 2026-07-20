const fs = require('fs');
const path = require('path');
const { test, expect, devices } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');

const SHOT_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');
function shotPath(name) {
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
  return path.join(SHOT_DIR, name);
}

test.use({ ...devices['iPhone 13'] });

test.describe('11. Mobile viewport (iPhone 13 emulation)', () => {
  test('homepage and /app upload screen render usably on mobile', async ({ page }) => {
    captureConsole(page, 'mobile');

    // Note: fullPage screenshots are intentionally NOT used here. iPhone 13
    // emulation has a 3x device scale factor, and the homepage's real
    // rendered height (~19,000 CSS px) x 3 exceeds Playwright's hard
    // 32767-physical-pixel screenshot dimension cap. A viewport screenshot
    // is sufficient to verify the mobile layout renders usably.
    await page.goto('/');
    await expect(page.getByText('MEASURE', { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: shotPath('11-mobile-homepage.png') });

    await login(page, EXISTING_ACCOUNTS.A.email, EXISTING_ACCOUNTS.A.password);
    expect(page.url()).toContain('/app');

    await expect(page.getByText('Clean Flat-Lay')).toBeVisible();
    await page.screenshot({ path: shotPath('11-mobile-app-upload.png') });
  });
});
