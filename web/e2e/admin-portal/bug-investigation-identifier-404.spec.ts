import { expect, test } from '../../playwright/fixtures';

/**
 * BUG INVESTIGATION: Identifier Creation Returning 404/500
 *
 * User Report:
 * - Trying to add KvK identifier at entity fbc4bcdc-a9f9-4621-a153-c5deb6c49519
 * - Receiving 404 and 500 errors
 * - This worked yesterday after the header fix
 * - All functions are deployed
 *
 * Expected Endpoint: POST /api/v1/entities/{legalEntityId}/identifiers
 */

test.describe('Bug Investigation - Identifier 404/500 Error', () => {
  let networkErrors: Array<{ url: string; status: number; body: any }> = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    networkErrors = [];
    consoleErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        consoleErrors.push(errorText);
        console.error('🔴 CONSOLE ERROR:', errorText);
      } else if (msg.type() === 'warning') {
        console.warn('⚠️ CONSOLE WARNING:', msg.text());
      }
    });

    // Capture failed network requests
    page.on('response', async (response) => {
      const url = response.url();

      // Only track identifier-related requests
      if (url.includes('identifier') || url.includes('entities')) {
        const status = response.status();

        if (status === 404 || status >= 500) {
          let body: any = null;
          try {
            body = await response.json();
          } catch {
            body = await response.text();
          }

          const errorInfo = {
            url,
            status,
            body,
          };

          networkErrors.push(errorInfo);

          console.error(`🔴 HTTP ${status} ERROR:`, url);
          console.error('Response body:', JSON.stringify(body, null, 2));
        } else if (status >= 200 && status < 300) {
          console.log(`✅ HTTP ${status} SUCCESS:`, url);
        }
      }
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('identifier') || url.includes('entities')) {
        const failure = request.failure();
        console.error('🔴 REQUEST FAILED:', url);
        console.error('Failure reason:', failure?.errorText);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('REPRODUCE BUG: Add KvK identifier to entity fbc4bcdc-a9f9-4621-a153-c5deb6c49519', async ({
    page,
  }) => {
    console.log('\n🔍 Starting bug reproduction...\n');

    // Wait for page to be fully loaded
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    // Navigate to Members (using more flexible selector)
    const membersLink = page.getByText('Members').first();
    await membersLink.waitFor({ state: 'visible', timeout: 10000 });
    await membersLink.click();
    await page.waitForTimeout(2000);

    console.log('✅ Navigated to Members page');

    // Wait for member grid
    const memberGrid = page.locator('.k-grid').first();
    await memberGrid.waitFor({ state: 'visible' });

    console.log('✅ Member grid loaded');

    // Click the "View" button on the first member
    const firstViewButton = memberGrid.locator('button:has-text("View")').first();
    await firstViewButton.waitFor({ state: 'visible', timeout: 5000 });
    await firstViewButton.click();
    await page.waitForTimeout(2000);

    console.log('✅ Opened member details');

    // Wait for the detail view to load (look for the "Back to Members" button or tabs)
    await page.waitForSelector('text=Back to Members', { timeout: 5000 });

    console.log('✅ Detail view loaded, looking for Identifiers tab');

    // Click on the "Identifiers" tab
    const identifiersTab = page.locator('.k-tabstrip-items').getByText('Identifiers').first();
    const hasIdentifiersTab = await identifiersTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasIdentifiersTab) {
      await identifiersTab.click();
      await page.waitForTimeout(1500);
      console.log('✅ Clicked Identifiers tab');
    } else {
      console.warn('⚠️ Identifiers tab not found, may already be on correct tab');
    }

    // Take screenshot before attempting to add identifier
    await page.screenshot({
      path: 'playwright-report/screenshots/bug-before-add-identifier.png',
      fullPage: true,
    });

    // Look for "Add Identifier" button
    const addButton = page
      .locator('button:has-text("Add Identifier"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasButton) {
      console.error('❌ "Add Identifier" button not found!');
      console.log('Current page URL:', page.url());

      await page.screenshot({
        path: 'playwright-report/screenshots/bug-no-add-button.png',
        fullPage: true,
      });

      throw new Error('Add Identifier button not found');
    }

    console.log('✅ Found "Add Identifier" button');

    // Click "Add Identifier"
    await addButton.click();
    await page.waitForTimeout(1500);

    console.log('✅ Clicked "Add Identifier"');

    // Verify dialog opened
    const dialog = page.locator('[role="dialog"], .k-dialog, .modal').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    console.log('✅ Dialog opened');

    // Take screenshot of dialog
    await page.screenshot({
      path: 'playwright-report/screenshots/bug-dialog-opened.png',
      fullPage: true,
    });

    // Fill in the form
    // Type: KVK
    const typeInput = page.locator('select[name*="type"], input[name*="type"]').first();
    const hasType = await typeInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasType) {
      console.error('❌ Type input not found!');
      throw new Error('Type input field not found');
    }

    // Try to select KVK
    await typeInput.click();
    await page.waitForTimeout(500);

    // Look for KVK option
    const kvkOption = page.locator('text=KVK').first();
    const hasKvk = await kvkOption.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasKvk) {
      await kvkOption.click();
      console.log('✅ Selected KVK type');
    } else {
      console.warn('⚠️ Could not find KVK option in dropdown');
    }

    await page.waitForTimeout(500);

    // Fill Value: 95944192
    const valueInput = page.locator('input[name*="value"], input[placeholder*="Value"]').first();
    await valueInput.fill('95944192');
    console.log('✅ Filled identifier value: 95944192');

    // Fill Country: NL (if field exists)
    const countryInput = page.locator('input[name*="country"], select[name*="country"]').first();
    const hasCountry = await countryInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasCountry) {
      await countryInput.fill('NL');
      console.log('✅ Filled country: NL');
    } else {
      console.warn('⚠️ Country field not found - may be optional');
    }

    await page.waitForTimeout(500);

    // Take screenshot before submitting
    await page.screenshot({
      path: 'playwright-report/screenshots/bug-form-filled.png',
      fullPage: true,
    });

    // Click Save/Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save")').last();
    await submitButton.click();

    console.log('✅ Clicked Save button');
    console.log('🔄 Waiting for network response...\n');

    // Wait to capture network response
    await page.waitForTimeout(5000);

    // Take screenshot after submission
    await page.screenshot({
      path: 'playwright-report/screenshots/bug-after-submit.png',
      fullPage: true,
    });

    // Analyze results
    console.log('\n📊 RESULTS:\n');

    if (networkErrors.length > 0) {
      console.error('❌ Network errors detected:', networkErrors.length);
      networkErrors.forEach((error, index) => {
        console.error(`\nError ${index + 1}:`);
        console.error(`  URL: ${error.url}`);
        console.error(`  Status: ${error.status}`);
        console.error('  Body:', JSON.stringify(error.body, null, 2));
      });

      // Check for specific error patterns
      const has404 = networkErrors.some((e) => e.status === 404);
      const has500 = networkErrors.some((e) => e.status >= 500);

      if (has404) {
        console.error('\n🔴 404 ERROR DETECTED - Endpoint not found or route mismatch');
      }

      if (has500) {
        console.error('\n🔴 500 ERROR DETECTED - Internal server error');
      }
    } else {
      console.log('✅ No network errors detected');
    }

    if (consoleErrors.length > 0) {
      console.error('\n❌ Console errors detected:', consoleErrors.length);
      consoleErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }

    // Look for success/error toast
    const successToast = page.locator('.k-notification.success, .toast.success').first();
    const errorToast = page.locator('.k-notification.error, .toast.error').first();

    const hasSuccess = await successToast.isVisible({ timeout: 1000 }).catch(() => false);
    const hasError = await errorToast.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSuccess) {
      console.log('✅ Success toast displayed');
    }

    if (hasError) {
      const errorText = await errorToast.textContent();
      console.error('❌ Error toast displayed:', errorText);
    }

    // Final assertion: This test should FAIL until the bug is fixed
    if (networkErrors.length > 0) {
      console.error('\n🐛 BUG CONFIRMED: Identifier creation failed with network errors\n');

      // Extract the most relevant error for the report
      const primaryError = networkErrors[0];

      throw new Error(
        `Identifier creation failed with ${primaryError.status} error.\n` +
          `URL: ${primaryError.url}\n` +
          `Response: ${JSON.stringify(primaryError.body, null, 2)}`
      );
    }

    console.log('\n✅ BUG NOT REPRODUCED - Identifier creation succeeded\n');
  });

  test('VERIFY: Check actual endpoint URL being called', async ({ page }) => {
    console.log('\n🔍 Checking endpoint URL...\n');

    const requestUrls: string[] = [];

    // Capture all requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('identifier') || url.includes('entities')) {
        const method = request.method();
        console.log(`📤 ${method} ${url}`);
        requestUrls.push(`${method} ${url}`);
      }
    });

    // Wait for page to be fully loaded
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    // Navigate and try to add identifier
    const membersLink = page.getByText('Members').first();
    await membersLink.waitFor({ state: 'visible', timeout: 10000 });
    await membersLink.click();
    await page.waitForTimeout(2000);

    const memberGrid = page.locator('.k-grid').first();
    await memberGrid.waitFor({ state: 'visible' });

    // Click the "View" button on the first member
    const firstViewButton = memberGrid.locator('button:has-text("View")').first();
    await firstViewButton.waitFor({ state: 'visible', timeout: 5000 });
    await firstViewButton.click();
    await page.waitForTimeout(2000);

    // Wait for detail view and click Identifiers tab
    await page.waitForSelector('text=Back to Members', { timeout: 5000 });
    const identifiersTab = page.locator('.k-tabstrip-items').getByText('Identifiers').first();
    const hasTab = await identifiersTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasTab) {
      await identifiersTab.click();
    }

    // Wait for any identifier-related requests
    await page.waitForTimeout(3000);

    console.log('\n📊 Captured Request URLs:\n');
    requestUrls.forEach((url) => {
      console.log(`  ${url}`);
    });

    // Check for common URL issues
    const hasDuplicateV1 = requestUrls.some((url) => url.includes('/v1/v1/'));
    const hasMissingV1 = requestUrls.some(
      (url) => url.includes('/api/entities') && !url.includes('/api/v1/')
    );

    if (hasDuplicateV1) {
      console.error('\n❌ ISSUE: Duplicate /v1/v1/ detected in URL');
    }

    if (hasMissingV1) {
      console.error('\n❌ ISSUE: Missing /v1/ in API path');
    }

    if (!hasDuplicateV1 && !hasMissingV1) {
      console.log('\n✅ URL structure looks correct');
    }
  });
});
