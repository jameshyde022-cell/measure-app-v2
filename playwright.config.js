// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for testing the LIVE production deployment of MEASURE.
 * There is no local dev server involved — baseURL points at the real,
 * currently-live production URL. This is intentionally read-only/exploratory
 * testing, not CI-style testing against localhost.
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'https://measure-app-v2-pl2.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
