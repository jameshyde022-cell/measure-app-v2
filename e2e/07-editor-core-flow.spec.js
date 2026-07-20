const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { captureConsole, EXISTING_ACCOUNTS, login } = require('./helpers');
const { GALLERY_IMAGE } = require('./export-helpers');

const SHOT_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');
function shotPath(name) {
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
  return path.join(SHOT_DIR, name);
}

test.describe('7. Upload + editor core flow', () => {
  test('upload -> crop -> annotate -> edit/delete line -> export', async ({ page }) => {
    test.setTimeout(120000);
    captureConsole(page, 'editor-core-flow');

    // Uses account A — this is its second export of the day (after 06-account-isolation.spec.js's one),
    // still well within the 3/day free-tier limit.
    await login(page, EXISTING_ACCOUNTS.A.email, EXISTING_ACCOUNTS.A.password);
    expect(page.url()).toContain('/app');

    // --- Upload via Clean Flat-Lay ---
    const flatLayInput = page.locator('input[type="file"]').nth(1);
    await flatLayInput.setInputFiles(GALLERY_IMAGE);

    // --- Land on CROP screen ---
    await expect(page.getByRole('button', { name: /confirm crop/i })).toBeVisible({ timeout: 15000 });
    const cropCanvas = page.locator('canvas').first();
    const boxBefore = await cropCanvas.boundingBox();
    const aspectBefore = await cropCanvas.evaluate((el) => el.width / el.height);
    await page.screenshot({ path: shotPath('07-crop-before.png') });

    // --- Drag the bottom-right corner handle inward by ~80px ---
    const seX = boxBefore.x + boxBefore.width;
    const seY = boxBefore.y + boxBefore.height;
    await page.mouse.move(seX - 3, seY - 3);
    await page.mouse.down();
    await page.mouse.move(seX - 40, seY - 40, { steps: 5 });
    await page.mouse.move(seX - 80, seY - 80, { steps: 5 });
    await page.mouse.up();
    await page.screenshot({ path: shotPath('07-crop-after-drag.png') });

    // --- Confirm crop, land on ANNOTATE ---
    await page.getByRole('button', { name: /confirm crop/i }).click();
    await expect(page.getByRole('button', { name: /\+ Add Line/i })).toBeVisible({ timeout: 15000 });

    const annotateCanvas = page.locator('canvas').first();
    const aspectAfter = await annotateCanvas.evaluate((el) => el.width / el.height);
    await page.screenshot({ path: shotPath('07-annotate-after-crop.png') });

    const aspectChangedFraction = Math.abs(aspectAfter - aspectBefore) / aspectBefore;
    expect(aspectChangedFraction, 'cropped image aspect ratio should differ measurably from the original').toBeGreaterThan(0.01);

    // --- Add a measurement line ---
    await page.getByRole('button', { name: /\+ Add Line/i }).click();
    const canvasBox = await annotateCanvas.boundingBox();
    const midY = canvasBox.y + canvasBox.height * 0.5;
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.3, midY);
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.7, midY);
    await page.getByRole('button', { name: /confirm line/i }).click();

    await expect(page.getByText(/^Lines \(1/)).toBeVisible({ timeout: 10000 });

    // --- Edit the line's value ---
    const valueInput = page.getByPlaceholder('value');
    await valueInput.fill('24');
    await expect(valueInput).toHaveValue('24');

    // --- Delete the line ---
    await page.getByRole('button', { name: 'x', exact: true }).click();
    await expect(page.getByText(/^Lines \(/)).not.toBeVisible({ timeout: 10000 });

    // --- Add a fresh line again (needed for export) ---
    await page.getByRole('button', { name: /\+ Add Line/i }).click();
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.3, midY);
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.7, midY);
    await page.getByRole('button', { name: /confirm line/i }).click();
    await expect(page.getByText(/^Lines \(1/)).toBeVisible({ timeout: 10000 });

    // --- Fill Item Name and Notes ---
    await page.getByPlaceholder('e.g. Love All Over').fill('Test Shirt');
    await page.getByPlaceholder('e.g. Condition, colour').fill('Test notes');

    // --- Export ---
    await page.getByRole('button', { name: /generate sheet/i }).click();
    await expect(page.locator('text=Measurement Sheet')).toBeVisible({ timeout: 15000 });

    // Wait for the save-to-server step to finish
    await page.waitForSelector('text=Saving to inventory...', { state: 'detached', timeout: 20000 }).catch(() => {});

    const exportCanvas = page.locator('canvas').last();
    await expect(exportCanvas).toBeVisible();
    await exportCanvas.screenshot({ path: shotPath('07-export-preview.png') });

    // Report whatever save-result state is visible for diagnostics (price, error, etc.)
    const saveErrorVisible = await page.locator('text=/inventory save failed/i').isVisible().catch(() => false);
    test.info().annotations.push({ type: 'save-error-visible', description: String(saveErrorVisible) });
  });
});
