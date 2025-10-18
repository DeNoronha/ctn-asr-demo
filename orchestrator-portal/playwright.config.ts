import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Orchestrator Portal E2E tests
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run (30 seconds)
  timeout: 30000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all projects
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Extend timeout for actions
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Web servers - only start if not already running
  // In development: servers are already running, so set reuseExistingServer: true
  // In CI: servers will be started by this config
  webServer: process.env.CI ? [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'npm run mock-api',
      url: 'http://localhost:3001/api/v1',
      reuseExistingServer: false,
      timeout: 120000,
    }
  ] : undefined, // Skip webServer in dev (servers already running)
});
