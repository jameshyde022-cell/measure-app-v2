const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');

test.describe('8. File validation', () => {
  test('uploading a non-image file is rejected gracefully', async ({ page }) => {
    captureConsole(page, 'file-validation');

    // Rejected before it ever reaches the editor, so this doesn't consume export quota —
    // account choice doesn't matter here. Using account B.
    await login(page, EXISTING_ACCOUNTS.B.email, EXISTING_ACCOUNTS.B.password);

    // Create a throwaway .txt file
    const txtPath = path.join(os.tmpdir(), `measure-pw-not-an-image-${Date.now()}.txt`);
    fs.writeFileSync(txtPath, 'this is not an image');

    let pageErrorFired = false;
    page.on('pageerror', () => { pageErrorFired = true; });

    // Attempt upload via the Clean Flat-Lay input
    const flatLayInput = page.locator('input[type="file"]').nth(1);
    await flatLayInput.setInputFiles(txtPath);

    // Give the app a moment to (not) react
    await page.waitForTimeout(2000);

    // Should NOT have advanced into the crop/annotate flow with garbage data
    await expect(page.getByRole('button', { name: /confirm crop/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /\+ Add Line/i })).not.toBeVisible();

    expect(pageErrorFired, 'selecting a non-image file should not throw an uncaught page error').toBe(false);

    fs.unlinkSync(txtPath);
  });
});
