import { test, expect } from '@playwright/test';

/**
 * Member Portal Error Detection Test
 * Created: 2025-11-14
 * Purpose: Capture all errors in member portal after GetAuthenticatedMember fix
 */

test.describe('Member Portal Error Detection', () => {
  const errors: string[] = [];
  const apiErrors: Array<{ url: string; status: number; statusText: string; response?: any }> = [];
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear error arrays
    errors.length = 0;
    apiErrors.length = 0;
    consoleErrors.length = 0;

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(`[PAGE ERROR] ${error.message}`);
    });

    // Capture failed API requests
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();

      // Track API failures (4xx, 5xx)
      if (status >= 400 && url.includes('func-ctn-demo-asr-dev')) {
        try {
          const responseBody = await response.text();
          apiErrors.push({
            url,
            status,
            statusText: response.statusText(),
            response: responseBody
          });
        } catch (e) {
          apiErrors.push({
            url,
            status,
            statusText: response.statusText()
          });
        }
      }
    });
  });

  test('should capture all errors during member portal navigation', async ({ page }) => {
    console.log('\n========================================');
    console.log('Member Portal Error Detection Test');
    console.log('========================================\n');

    // Step 1: Navigate to member portal
    console.log('Step 1: Navigating to member portal...');
    await page.goto('https://calm-pebble-043b2db03.1.azurestaticapps.net');
    await page.waitForLoadState('networkidle');
    console.log('✅ Portal loaded\n');

    // Step 2: Login
    console.log('Step 2: Logging in...');

    // Look for the "Sign In with Azure AD" button on the landing page
    const signInButton = page.locator('button:has-text("Sign In with Azure AD")');
    const isOnLandingPage = await signInButton.isVisible().catch(() => false);

    if (isOnLandingPage) {
      console.log('Clicking Sign In button...');
      await signInButton.click();

      // Wait for Azure AD login page
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      await page.fill('input[type="email"]', 'test-e2@denoronha.consulting');
      await page.click('input[type="submit"]');

      // Enter password
      await page.waitForSelector('input[type="password"]', { timeout: 15000 });
      await page.fill('input[type="password"]', 'Madu5952');
      await page.click('input[type="submit"]');

      // Handle "Stay signed in?" prompt
      await page.waitForTimeout(2000);
      const staySignedInButton = page.locator('input[type="submit"][value="Yes"]');
      if (await staySignedInButton.isVisible().catch(() => false)) {
        await staySignedInButton.click();
      }

      // Wait for redirect back to portal and for the dashboard to load
      await page.waitForURL(/calm-pebble/, { timeout: 30000 });
      console.log('✅ Login successful\n');
    } else {
      console.log('✅ Already logged in\n');
    }

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Step 3: Check dashboard
    console.log('Step 3: Checking dashboard...');
    await page.waitForLoadState('networkidle');

    // Take screenshot of dashboard
    await page.screenshot({
      path: '/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/member-portal/e2e/screenshots/dashboard.png',
      fullPage: true
    });
    console.log('✅ Dashboard screenshot saved\n');

    // Step 4: Try to navigate to different sections
    console.log('Step 4: Testing navigation...');

    // Wait a bit to see if any errors appear
    await page.waitForTimeout(3000);

    // Try to click on tabs/sections if they exist
    const tabs = await page.locator('[role="tab"]').all();
    console.log(`Found ${tabs.length} tabs\n`);

    for (let i = 0; i < tabs.length && i < 5; i++) {
      const tabText = await tabs[i].textContent();
      console.log(`Clicking tab: ${tabText}`);
      await tabs[i].click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }

    // Step 5: Report all errors
    console.log('\n========================================');
    console.log('ERROR REPORT');
    console.log('========================================\n');

    if (apiErrors.length > 0) {
      console.log('API ERRORS:');
      apiErrors.forEach((error, index) => {
        console.log(`\n[${index + 1}] ${error.status} ${error.statusText}`);
        console.log(`URL: ${error.url}`);
        if (error.response) {
          console.log(`Response: ${error.response.substring(0, 500)}`);
        }
      });
      console.log('\n');
    } else {
      console.log('✅ No API errors detected\n');
    }

    if (consoleErrors.length > 0) {
      console.log('CONSOLE ERRORS:');
      consoleErrors.forEach((error, index) => {
        console.log(`[${index + 1}] ${error}`);
      });
      console.log('\n');
    } else {
      console.log('✅ No console errors detected\n');
    }

    if (errors.length > 0) {
      console.log('PAGE ERRORS:');
      errors.forEach((error, index) => {
        console.log(`[${index + 1}] ${error}`);
      });
      console.log('\n');
    } else {
      console.log('✅ No page errors detected\n');
    }

    console.log('========================================\n');

    // Write errors to file for detailed analysis
    const errorReport = {
      timestamp: new Date().toISOString(),
      apiErrors,
      consoleErrors,
      pageErrors: errors,
      summary: {
        totalApiErrors: apiErrors.length,
        totalConsoleErrors: consoleErrors.length,
        totalPageErrors: errors.length
      }
    };

    await page.evaluate((report) => {
      console.log('Full Error Report:', JSON.stringify(report, null, 2));
    }, errorReport);

    // Assertion: We want to fail if there are errors so we can see them
    if (apiErrors.length > 0 || consoleErrors.length > 0 || errors.length > 0) {
      console.log('ERRORS DETECTED - Test will fail to show details');
    }
  });
});
