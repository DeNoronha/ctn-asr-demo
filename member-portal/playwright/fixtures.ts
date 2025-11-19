/**
 * Custom Playwright Fixtures for Member Portal
 *
 * Extends Playwright test to properly restore sessionStorage for MSAL authentication
 */

import fs from 'node:fs';
import path from 'node:path';
import { test as base } from '@playwright/test';

// Extend base test with custom fixture that loads sessionStorage
export const test = base.extend({
  page: async ({ page }, use) => {
    // Load and inject sessionStorage before each test
    const authFile = path.join(__dirname, '.auth', 'user.json');

    if (fs.existsSync(authFile)) {
      const storageState = JSON.parse(fs.readFileSync(authFile, 'utf8'));

      // Find the member portal origin
      const appOrigin = storageState.origins?.find(
        (origin: { origin: string; sessionStorage?: unknown[] }) =>
          origin.origin.includes('azurestaticapps.net') ||
          origin.origin.includes('calm-pebble')
      );

      if (appOrigin?.sessionStorage) {
        // Navigate to the app first (sessionStorage is origin-specific)
        await page.goto('/');

        // Inject sessionStorage entries
        await page.evaluate((sessionData) => {
          for (const item of sessionData) {
            sessionStorage.setItem(item.name, item.value);
          }
        }, appOrigin.sessionStorage);

        console.log(`Loaded ${appOrigin.sessionStorage.length} sessionStorage entries`);
      }
    }

    // Use the page with sessionStorage loaded
    await use(page);
  },
});

export { expect } from '@playwright/test';
