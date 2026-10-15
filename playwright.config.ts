import { defineConfig, devices } from '@playwright/test';

/**
 * Staging-only E2E. Never point at production.
 * Run: npx playwright test
 */
const STAGING_URL = process.env.SOKO_E2E_BASE_URL ?? 'https://soko-staging.vercel.app';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: STAGING_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
