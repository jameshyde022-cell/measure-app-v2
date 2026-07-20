const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login, logoutViaApi } = require('./helpers');
const { quickExportWithBrand } = require('./export-helpers');

// Uses the two existing accounts directly — they are already two distinct
// users, so no new signup is needed for isolation testing. Account A does
// one export here (tagged with a unique "Brand" marker so this test works
// regardless of whatever other inventory either account already has).
// Account B is only read from in this test (no export), preserving its
// full daily export quota for 09-daily-export-limit.spec.js.
test.describe('6. Two-account isolation', () => {
  test('account B cannot see items created by account A', async ({ page }) => {
    test.setTimeout(120000);
    captureConsole(page, 'account-isolation');

    const isolationTag = `ISO-TEST-${Date.now()}`;

    // Account A: log in, create one export tagged with a unique brand marker.
    await login(page, EXISTING_ACCOUNTS.A.email, EXISTING_ACCOUNTS.A.password);
    await quickExportWithBrand(page, isolationTag);
    await expect(page.locator('text=Measurement Sheet')).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('text=Saving to inventory...', { state: 'detached', timeout: 20000 }).catch(() => {});

    // Confirm account A can see its own tagged item via the API.
    const resA = await page.request.get('/api/inventory/list');
    expect(resA.ok()).toBeTruthy();
    const dataA = await resA.json();
    expect(dataA.records.some((r) => r.brand === isolationTag), 'account A should see its own tagged item').toBe(true);

    await logoutViaApi(page);

    // Account B: log in, confirm the isolation-tagged item created by A is NOT visible.
    await login(page, EXISTING_ACCOUNTS.B.email, EXISTING_ACCOUNTS.B.password);

    const resB = await page.request.get('/api/inventory/list');
    expect(resB.ok()).toBeTruthy();
    const dataB = await resB.json();
    expect(Array.isArray(dataB.records)).toBeTruthy();
    expect(
      dataB.records.some((r) => r.brand === isolationTag),
      'account B should never see an item created by account A'
    ).toBe(false);

    await page.goto('/inventory');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain(isolationTag);
  });
});
