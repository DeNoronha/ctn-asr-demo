import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

/**
 * Shared Authentication Setup for Playwright E2E Tests
 *
 * This is the SINGLE source of truth for authentication across all portals.
 * Each portal's Playwright config should import this and configure appropriately.
 *
 * Required environment variables:
 * - AZURE_AD_TEST_USERNAME: E2E test user email
 * - AZURE_AD_TEST_PASSWORD: E2E test user password
 *
 * Get credentials from .credentials file (gitignored)
 */

export interface AuthConfig {
  portalName: string;
  authFilePath: string;
  portalUrl: string;
  redirectPattern: RegExp;
  loadedSelector: string;
  verifySelector?: string;
}

export function createAuthSetup(config: AuthConfig) {
  return setup(`authenticate with Azure AD for ${config.portalName}`, async ({ page }) => {
    // Get credentials from environment (required)
    const username = process.env.AZURE_AD_TEST_USERNAME;
    const password = process.env.AZURE_AD_TEST_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Missing Azure AD credentials. Set AZURE_AD_TEST_USERNAME and AZURE_AD_TEST_PASSWORD environment variables. See .credentials file.'
      );
    }

    console.log(`Authenticating as: ${username} for ${config.portalName}`);

    // Navigate to the portal
    await page.goto(config.portalUrl);

    // Wait for redirect to Azure AD login
    await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });
    console.log('Redirected to Azure AD login page');

    // Fill in email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(username);
    console.log('Entered username');

    // Click Next
    await page.locator('input[type="submit"]').click();
    console.log('Clicked Next');

    // Wait for password page
    await page.waitForTimeout(2000);

    // Fill in password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(password);
    console.log('Entered password');

    // Click Sign in
    await page.locator('input[type="submit"]').click();
    console.log('Clicked Sign in');

    // Handle "Stay signed in?" prompt if it appears
    try {
      const staySignedInButton = page.locator('input[type="submit"]');
      await staySignedInButton.waitFor({ state: 'visible', timeout: 5000 });
      await staySignedInButton.click();
      console.log('Clicked "Stay signed in"');
    } catch (_error) {
      console.log('"Stay signed in" prompt did not appear');
    }

    // Wait for redirect back to portal
    await page.waitForURL(config.redirectPattern, { timeout: 30000 });
    console.log(`Redirected back to ${config.portalName}`);

    // Wait for the app to load
    await page.waitForSelector(config.loadedSelector, { timeout: 30000 });
    console.log(`${config.portalName} loaded successfully`);

    // Verify we're authenticated (optional)
    if (config.verifySelector) {
      const verifyElement = page.locator(config.verifySelector);
      await expect(verifyElement).toBeVisible({ timeout: 10000 });
      console.log('Authentication verified');
    }

    // Save authentication state
    await page.context().storageState({ path: config.authFilePath });
    console.log(`Authentication state saved to: ${config.authFilePath}`);
  });
}

// Portal-specific configurations
export const ADMIN_PORTAL_CONFIG: AuthConfig = {
  portalName: 'Admin Portal',
  authFilePath: path.join(__dirname, '../admin-portal/playwright/.auth/user.json'),
  portalUrl: '/',
  redirectPattern: /calm-tree-03352ba03\.1\.azurestaticapps\.net/,
  loadedSelector: 'text=Dashboard',
  verifySelector: 'text=Members',
};

export const MEMBER_PORTAL_CONFIG: AuthConfig = {
  portalName: 'Member Portal',
  authFilePath: path.join(__dirname, '../member-portal/playwright/.auth/user.json'),
  portalUrl: '/',
  redirectPattern: /calm-pebble-043b2db03\.1\.azurestaticapps\.net/,
  loadedSelector: 'text=Dashboard',
  verifySelector: '.user-name',
};
