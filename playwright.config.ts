import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for AIIMS
 * ==============================================================
 * Configures browser-based end-to-end smoke testing for AIIMS.
 * Uses reuseExistingServer: true to seamlessly attach to active
 * dev servers without disrupting ongoing local development.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  // Deterministic execution without retries hiding failures
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm --prefix Frontend run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000
  }
});
