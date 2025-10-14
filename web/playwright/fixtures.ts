/**
 * Custom Playwright Fixtures
 *
 * Extends Playwright test to properly restore sessionStorage for MSAL authentication
 */

import { test as base, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Extend base test with custom fixture that loads sessionStorage
export const test = base.extend({
  page: async ({ page }, use) => {
    // Load and inject sessionStorage before each test
    const authFile = path.join(__dirname, '.auth', 'user.json');

    if (fs.existsSync(authFile)) {
      const storageState = JSON.parse(fs.readFileSync(authFile, 'utf8'));

      // Find the main app origin
      const appOrigin = storageState.origins?.find(
        (origin: any) => origin.origin.includes('azurestaticapps.net')
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

        console.log(`✅ Loaded ${appOrigin.sessionStorage.length} sessionStorage entries`);
      }
    }

    // Use the page with sessionStorage loaded
    await use(page);
  },
});

export { expect } from '@playwright/test';
