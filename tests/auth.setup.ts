import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

/**
 * Shared Authentication Setup for Cross-Portal Tests
 *
 * Authenticates once and saves state for reuse across all tests.
 * Uses hardcoded E2E test credentials (MFA excluded).
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// E2E Test User (MFA excluded)
// Use environment variables from .credentials file
const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'test-e2@denoronha.consulting';
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || '';

setup('authenticate with Azure AD', async ({ page }) => {
  console.log(`🔐 Authenticating as: ${TEST_USER_EMAIL}`);

  // Navigate to admin portal (requires auth)
  await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net');

  // Wait for redirect to Azure AD login
  await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });
  console.log('✅ Redirected to Azure AD login page');

  // Fill in email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(TEST_USER_EMAIL);
  console.log('✅ Entered username');

  // Click Next
  await page.locator('input[type="submit"]').click();
  console.log('✅ Clicked Next');

  // Wait for password page
  await page.waitForTimeout(2000);

  // Fill in password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(TEST_USER_PASSWORD);
  console.log('✅ Entered password');

  // Click Sign in
  await page.locator('input[type="submit"]').click();
  console.log('✅ Clicked Sign in');

  // Handle "Stay signed in?" prompt if it appears
  try {
    const staySignedInButton = page.locator('input[type="submit"]');
    await staySignedInButton.waitFor({ state: 'visible', timeout: 5000 });
    await staySignedInButton.click();
    console.log('✅ Clicked "Stay signed in"');
  } catch (_error) {
    console.log('⏭️  "Stay signed in" prompt did not appear');
  }

  // Wait for redirect back to app
  await page.waitForURL(/calm-tree-03352ba03\.1\.azurestaticapps\.net/, { timeout: 30000 });
  console.log('✅ Redirected back to admin portal');

  // Wait for the app to load
  await page.waitForSelector('text=Dashboard, text=Members, text=Applications', { timeout: 30000 });
  console.log('✅ Admin Portal loaded successfully');

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log(`✅ Authentication state saved to: ${authFile}`);
});
