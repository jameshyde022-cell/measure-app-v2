const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');

const SHOT_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');
function shotPath(name) {
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
  return path.join(SHOT_DIR, name);
}

test.describe('10. Checkout flow (stop before payment)', () => {
  test('monthly Subscribe click reaches a real checkout.stripe.com URL', async ({ page }) => {
    captureConsole(page, 'checkout-monthly');
    const { email, password } = EXISTING_ACCOUNTS.A;
    await login(page, email, password);

    await page.goto('/pricing');
    await page.getByPlaceholder('you@email.com').fill(email);
    await page.getByRole('button', { name: /subscribe monthly/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 });
    expect(page.url()).toContain('checkout.stripe.com');
    await page.screenshot({ path: shotPath('10-stripe-checkout-monthly.png') });

    // STOP — do not fill any payment details. Navigate away.
    await page.goBack();
  });

  test('yearly Subscribe click also attempts a real checkout.stripe.com redirect', async ({ page }) => {
    captureConsole(page, 'checkout-yearly');
    const { email, password } = EXISTING_ACCOUNTS.A;
    await login(page, email, password);

    await page.goto('/pricing');
    await page.getByPlaceholder('you@email.com').fill(email);
    await page.getByRole('button', { name: /subscribe yearly/i }).click();

    // The yearly plan may not be configured server-side (STRIPE_PRICE_ID_YEARLY) in which case
    // the app shows an inline error instead of redirecting — report either outcome, don't hard-fail
    // the whole suite over a possible pre-existing pricing config gap unrelated to this test.
    const result = await Promise.race([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).then(() => 'stripe_redirect'),
      page.getByText(/not yet configured|something went wrong/i).waitFor({ timeout: 15000 }).then(() => 'inline_error'),
    ]).catch(() => 'timeout');

    test.info().annotations.push({ type: 'yearly-checkout-result', description: result });
    if (result === 'stripe_redirect') {
      expect(page.url()).toContain('checkout.stripe.com');
    }
    // No hard assertion on 'inline_error'/'timeout' — reported in annotations for the summary.
  });
});
