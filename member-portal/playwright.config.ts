import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright Configuration for CTN Member Portal Testing
 *
 * Features:
 * - Azure AD authentication testing
 * - Screenshot and video capture on failure
 * - Multiple browsers (Chromium, Firefox, Safari)
 * - Reusable authentication state
 */

export default defineConfig({
  testDir: '../tests/member-portal/e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test configuration
  fullyParallel: false, // Run tests serially to avoid auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // Global setup to verify auth state
  globalSetup: require.resolve('./playwright/global-setup'),

  // Reporter to use
  reporter: [
    ['html', { outputFolder: '../tests/results/playwright/member-portal' }],
    ['list'],
    ['json', { outputFile: '../tests/results/playwright/member-portal/results.json' }],
    ['junit', { outputFile: '../tests/results/playwright/member-portal/results.xml' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://calm-pebble-043b2db03.1.azurestaticapps.net',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Timeout for each action
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,

    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: false,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state from saved session
        storageState: 'playwright/.auth/user.json',
        // Additional Chrome-specific settings
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },

    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
