import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright Tests
 *
 * This runs once before all tests to authenticate with Azure AD.
 * The authentication state is saved and reused across all tests.
 *
 * IMPORTANT: Set these environment variables before running tests:
 * - AZURE_AD_TEST_USERNAME: Azure AD user email (e.g., ramon@denoronha.consulting)
 * - AZURE_AD_TEST_PASSWORD: Azure AD user password
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate with Azure AD', async ({ page }) => {
  // Get credentials from environment
  const username = process.env.AZURE_AD_TEST_USERNAME;
  const password = process.env.AZURE_AD_TEST_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing Azure AD credentials. Set AZURE_AD_TEST_USERNAME and AZURE_AD_TEST_PASSWORD environment variables.'
    );
  }

  console.log(`🔐 Authenticating as: ${username}`);

  // Navigate to the admin portal
  await page.goto('/');

  // Wait for redirect to Azure AD login
  await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });
  console.log('✅ Redirected to Azure AD login page');

  // Fill in email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(username);
  console.log('✅ Entered username');

  // Click Next
  await page.locator('input[type="submit"]').click();
  console.log('✅ Clicked Next');

  // Wait for password page
  await page.waitForTimeout(2000);

  // Fill in password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(password);
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
  } catch (error) {
    console.log('⏭️  "Stay signed in" prompt did not appear');
  }

  // Wait for redirect back to app
  await page.waitForURL(/calm-tree-03352ba03\.1\.azurestaticapps\.net/, { timeout: 30000 });
  console.log('✅ Redirected back to admin portal');

  // Wait for the app to load
  await page.waitForSelector('text=Dashboard', { timeout: 30000 });
  console.log('✅ Admin Portal loaded successfully');

  // Verify we're authenticated
  const membersLink = page.locator('text=Members');
  await expect(membersLink).toBeVisible({ timeout: 10000 });
  console.log('✅ Authentication verified - user can see Members link');

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log(`✅ Authentication state saved to: ${authFile}`);
});
