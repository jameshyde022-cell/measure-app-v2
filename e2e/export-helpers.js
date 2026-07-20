const path = require('path');

const GALLERY_IMAGE = path.join(__dirname, '..', 'public', 'gallery', 'gallery-1.jpg');
const EXAMPLE_IMAGE = path.join(__dirname, '..', 'public', 'examples', 'before-1.jpg');

/**
 * Uploads gallery-1.jpg via the "Clean Flat-Lay" (skip background removal)
 * path. Leaves the app on the crop phase.
 */
async function uploadCleanFlatLay(page, imagePath = GALLERY_IMAGE) {
  await page.goto('/app');
  // File inputs in DOM order: fileRef(raw/auto-bg), flatLayRef(clean flat-lay), rearFileRef, modelFileRef
  const flatLayInput = page.locator('input[type="file"]').nth(1);
  await flatLayInput.setInputFiles(imagePath);
  await page.waitForSelector('text=Confirm Crop', { timeout: 15000 });
}

/** From the crop phase, skips cropping and lands on the annotate phase. */
async function skipCropToAnnotate(page) {
  await page.getByRole('button', { name: /use full image/i }).click();
  await page.waitForSelector('text=Add Line', { timeout: 15000 });
}

/**
 * Adds one measurement line by clicking "+ Add Line" then two points on the
 * annotate canvas, then confirming. The "Generate Sheet" export button is
 * only rendered once at least one line exists, so this is needed even for
 * the "minimal" export flows.
 */
async function addLine(page, xFrac1 = 0.3, xFrac2 = 0.7, yFrac = 0.5) {
  await page.getByRole('button', { name: /\+ Add Line/i }).click();
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const y = box.y + box.height * yFrac;
  await page.mouse.click(box.x + box.width * xFrac1, y);
  await page.mouse.click(box.x + box.width * xFrac2, y);
  await page.getByRole('button', { name: /confirm line/i }).click();
}

/** Upload -> skip crop -> add one line -> click Generate Sheet. Does not wait for the save to finish. */
async function quickExport(page, imagePath = GALLERY_IMAGE) {
  await uploadCleanFlatLay(page, imagePath);
  await skipCropToAnnotate(page);
  await addLine(page);
  await page.getByRole('button', { name: /generate sheet/i }).click();
}

/**
 * Same as quickExport, but also fills the "Brand" field with a caller-supplied
 * tag before exporting. Used to give a saved record a unique marker so a
 * later test can confirm a different account can/can't see it, independent
 * of how much other inventory either account already has.
 */
async function quickExportWithBrand(page, brand, imagePath = GALLERY_IMAGE) {
  await uploadCleanFlatLay(page, imagePath);
  await skipCropToAnnotate(page);
  await addLine(page);
  await page.getByPlaceholder('e.g. Moschino Jeans').fill(brand);
  await page.getByRole('button', { name: /generate sheet/i }).click();
}

module.exports = { GALLERY_IMAGE, EXAMPLE_IMAGE, uploadCleanFlatLay, skipCropToAnnotate, addLine, quickExport, quickExportWithBrand };
