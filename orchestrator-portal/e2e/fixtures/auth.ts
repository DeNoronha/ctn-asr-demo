import { test as base, Page } from '@playwright/test';

/**
 * Test fixtures for authentication
 */

export const TEST_USERS = {
  itg: {
    email: 'itg@example.com',
    password: 'password',
    tenant: 'ITG',
  },
  rotterdam: {
    email: 'rotterdam@example.com',
    password: 'password',
    tenant: 'Rotterdam',
  },
};

type AuthFixtures = {
  authenticatedPage: Page;
  authenticatedPageAsRotterdam: Page;
};

/**
 * Helper function to authenticate a user
 */
async function authenticate(page: Page, email: string, password: string) {
  await page.goto('/login');

  // Kendo Input components render as .k-input elements
  await page.locator('.k-input').first().fill(email);
  await page.locator('.k-input').nth(1).fill(password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await authenticate(page, TEST_USERS.itg.email, TEST_USERS.itg.password);
    await use(page);
  },

  authenticatedPageAsRotterdam: async ({ page }, use) => {
    await authenticate(page, TEST_USERS.rotterdam.email, TEST_USERS.rotterdam.password);
    await use(page);
  },
});

export { expect } from '@playwright/test';
