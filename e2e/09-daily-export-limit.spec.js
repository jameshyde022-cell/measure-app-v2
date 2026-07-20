const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');
const { quickExport } = require('./export-helpers');

const SHOT_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');
function shotPath(name) {
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
  return path.join(SHOT_DIR, name);
}

test.describe('9. Daily export limit (free tier = 3/day)', () => {
  test('first 3 exports succeed, 4th is blocked with an upgrade message', async ({ page }) => {
    test.setTimeout(180000);
    captureConsole(page, 'daily-export-limit');

    // Uses account B, which has not exported yet today and is kept free of exports
    // in every other spec, so it starts this test with its full 3/day quota available.
    await login(page, EXISTING_ACCOUNTS.B.email, EXISTING_ACCOUNTS.B.password);

    for (let i = 1; i <= 3; i++) {
      await quickExport(page);
      await expect(page.locator('text=Measurement Sheet'), `export #${i} should succeed and show the preview`).toBeVisible({ timeout: 15000 });
      await page.waitForSelector('text=Saving to inventory...', { state: 'detached', timeout: 20000 }).catch(() => {});
    }

    // 4th attempt: same account, same day — should be blocked client-side before any preview renders.
    await quickExport(page);
    await expect(page.getByText(/used all 3 free exports for today|daily free export limit reached/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Measurement Sheet')).not.toBeVisible();
    await page.screenshot({ path: shotPath('09-daily-limit-reached.png') });
  });
});
