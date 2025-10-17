import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for CTN ASR Portal Testing
 *
 * This configuration is optimized for testing deployed Azure Static Web Apps
 * across both Admin Portal and Member Portal.
 *
 * Test Structure:
 * - web/e2e/vite-migration/ - Vite migration verification tests
 * - web/e2e/common/ - Shared utilities and helpers
 */

export default defineConfig({
  testDir: './web/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    // This can be overridden per test file or project
    baseURL: process.env.BASE_URL || 'https://calm-tree-03352ba03.1.azurestaticapps.net',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser viewport
    viewport: { width: 1280, height: 720 },

    // Timeout for each action
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if testing against local dev server
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
