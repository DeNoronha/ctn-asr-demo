import { defineConfig, devices } from '@playwright/test';

/**
 * Shared Playwright Configuration for All CTN Portals
 *
 * This configuration provides unified E2E testing across:
 * - Admin Portal (ASR) - Single-tenant association register
 * - Member Portal (ASR) - Member-facing portal
 * - Booking Portal (DocuFlow) - Multi-tenant document workflow
 *
 * Architecture:
 * - Setup project runs once to authenticate with Azure Entra ID
 * - Authentication state is saved to playwright/.auth/user.json
 * - All portal projects depend on setup and reuse the auth state
 * - Each portal has its own test directory and base URL
 *
 * Test User:
 * - Email: test-e2@denoronha.consulting
 * - Password: Madu5952 (hardcoded in tests/auth.setup.ts)
 * - Role: SystemAdmin
 * - MFA: Excluded for automated testing
 *
 * Usage:
 *   # Run all portals
 *   npx playwright test
 *
 *   # Run specific portal
 *   npx playwright test --project=admin-portal
 *   npx playwright test --project=member-portal
 *   npx playwright test --project=booking-portal
 *
 *   # Run setup only (re-authenticate)
 *   npx playwright test --project=setup
 *
 *   # Show test report
 *   npx playwright show-report
 */

export default defineConfig({
  // Test directory for shared auth setup
  testDir: './tests',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Global timeout for all tests
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  // Test configuration
  fullyParallel: false, // Run tests serially to avoid auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],

  // Shared settings for all projects
  use: {
    // Collect trace when retrying failed tests
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Timeout for actions
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,

    // Ignore HTTPS errors (for dev environments)
    ignoreHTTPSErrors: false,
  },

  // Configure projects for each portal
  projects: [
    // ================================
    // SETUP PROJECT - RUNS FIRST
    // ================================
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        // Use a fresh browser context for authentication
        storageState: undefined,
      },
    },

    // ================================
    // ADMIN PORTAL (ASR)
    // ================================
    {
      name: 'admin-portal',
      testDir: './admin-portal/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://calm-tree-03352ba03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'admin-portal-firefox',
      testDir: './admin-portal/e2e',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'https://calm-tree-03352ba03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ================================
    // MEMBER PORTAL (ASR)
    // ================================
    {
      name: 'member-portal',
      testDir: './member-portal/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'member-portal-firefox',
      testDir: './member-portal/e2e',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ================================
    // BOOKING PORTAL (DocuFlow)
    // ================================
    {
      name: 'booking-portal',
      testDir: './booking-portal/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://calm-mud-024a8ce03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ================================
    // MOBILE TESTING (Optional)
    // ================================
    // Uncomment to enable mobile testing
    /*
    {
      name: 'admin-portal-mobile',
      testDir: './admin-portal/e2e',
      use: {
        ...devices['iPhone 12'],
        baseURL: 'https://calm-tree-03352ba03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'member-portal-mobile',
      testDir: './member-portal/e2e',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    */
  ],

  // Run local dev server before starting tests (optional)
  // Uncomment if you want to test against local development servers
  /*
  webServer: [
    {
      command: 'cd admin-portal && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd member-portal && npm run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
  */
});
