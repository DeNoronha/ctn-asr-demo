import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/member-portal/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution to avoid auth conflicts
  reporter: 'html',
  timeout: 60000,

  globalSetup: require.resolve('../tests/member-portal/e2e/global.setup.ts'),

  use: {
    baseURL: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: 'playwright/.auth/user.json',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
      },
});
