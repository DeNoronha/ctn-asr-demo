import { expect, test } from '../playwright/fixtures';

/**
 * URGENT PRODUCTION DIAGNOSTIC TEST
 *
 * Tests identifier creation for Contargo GmbH & Co. KG
 * Entity ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519
 *
 * This test captures:
 * 1. All network requests (especially /api/v1/entities/{id}/identifiers)
 * 2. Request headers (Authorization header verification)
 * 3. Response status codes and bodies
 * 4. Browser console errors
 * 5. JavaScript errors ("Cannot read private member")
 * 6. CORS/preflight issues
 */

test.describe('URGENT: Production Identifier Creation Diagnostic', () => {
  test('diagnose identifier creation failure for Contargo entity', async ({ page, context }) => {
    test.setTimeout(120000); // 2 minutes timeout
    console.log('\n========== STARTING PRODUCTION DIAGNOSTIC ==========\n');

    // Storage for captured data
    const capturedData = {
      consoleErrors: [] as string[],
      consoleWarnings: [] as string[],
      networkRequests: [] as Array<{
        url: string;
        method: string;
        headers: Record<string, string>;
        postData?: string;
      }>,
      apiResponses: [] as Array<{
        url: string;
        method: string;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: unknown;
      }>,
    };

    // Capture console errors and warnings
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        console.log(`🔴 BROWSER ERROR: ${text}`);
        capturedData.consoleErrors.push(text);
      } else if (type === 'warning') {
        console.log(`🟡 BROWSER WARNING: ${text}`);
        capturedData.consoleWarnings.push(text);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      console.log(`🔴 PAGE ERROR: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
      capturedData.consoleErrors.push(`PAGE ERROR: ${error.message}\nStack: ${error.stack}`);
    });

    // Capture all network requests
    page.on('request', (request) => {
      const url = request.url();

      // Only capture API requests
      if (url.includes('/api/') || url.includes('azurewebsites.net')) {
        const headers = request.headers();
        const method = request.method();

        console.log(`📤 ${method} ${url}`);
        console.log(`   Authorization: ${headers.authorization ? '✅ Present' : '❌ Missing'}`);

        capturedData.networkRequests.push({
          url,
          method,
          headers,
          postData: request.postData() || undefined,
        });
      }
    });

    // Capture all API responses
    page.on('response', async (response) => {
      const url = response.url();

      // Only capture API responses
      if (url.includes('/api/') || url.includes('azurewebsites.net')) {
        const status = response.status();
        const method = response.request().method();

        console.log(`📥 ${method} ${url} → ${status} ${response.statusText()}`);

        let body: unknown = null;
        try {
          body = await response.json();
        } catch (_e) {
          try {
            body = await response.text();
          } catch (_e2) {
            body = 'Unable to parse response';
          }
        }

        const responseData = {
          url,
          method,
          status,
          statusText: response.statusText(),
          headers: response.headers(),
          body,
        };

        capturedData.apiResponses.push(responseData);

        // Log error responses immediately
        if (status >= 400) {
          console.log('\n🚨 ERROR RESPONSE DETECTED:');
          console.log(JSON.stringify(responseData, null, 2));
          console.log('');
        }
      }
    });

    // Step 1: Navigate to admin portal
    console.log('\n📍 Step 1: Navigating to admin portal...');
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net/admin');
    await page.waitForLoadState('networkidle');
    console.log('✅ Admin portal loaded\n');

    // Step 2: Navigate to Members page
    console.log('📍 Step 2: Navigating to Members page...');
    // Click the Members link in the sidebar (uses the item-text class)
    await page.locator('.item-text:has-text("Members")').click();
    await page.waitForLoadState('networkidle');

    // Wait for members grid to load
    console.log('   Waiting for members grid...');
    await page.waitForSelector('.k-grid', { timeout: 10000 });
    console.log('✅ Members grid loaded\n');

    // Step 3: Search for Contargo entity
    console.log('📍 Step 3: Searching for Contargo entity...');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      console.log('   Found search input, searching for "Contargo"...');
      await searchInput.fill('Contargo');
      await page.waitForTimeout(1000); // Wait for search to filter
    } else {
      console.log('   No search input found, looking for Contargo in grid...');
    }

    // Step 4: Click on Contargo row's View button
    console.log('📍 Step 4: Looking for Contargo row...');
    const contargoRow = page
      .locator('.k-grid tbody tr')
      .filter({ hasText: /Contargo GmbH/i })
      .first();
    if (await contargoRow.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Contargo row, clicking View button...');

      // Click the View button in the Actions column
      const viewButton = contargoRow.locator('button:has-text("View")');
      if (await viewButton.isVisible({ timeout: 3000 })) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Clicked View button');
      } else {
        console.log('⚠️  View button not found, trying to click row...');
        await contargoRow.click();
        await page.waitForLoadState('networkidle');
      }
    } else {
      console.log('❌ Contargo row not found!');
      await page.screenshot({ path: 'diagnostic-error-no-contargo.png', fullPage: true });
      throw new Error('Contargo entity not found in members grid');
    }

    // Wait for entity details to load
    console.log('   Waiting for entity details...');
    await page.waitForSelector('text=/Contargo|Member Details|Organization Details/i', {
      timeout: 15000,
    });
    console.log('✅ Entity details page loaded\n');

    // Take screenshot of initial state
    await page.screenshot({ path: 'diagnostic-01-entity-loaded.png', fullPage: true });

    // Step 5: Look for Identifiers section
    console.log('📍 Step 5: Looking for Identifiers section...');
    await page.waitForTimeout(2000); // Give time for tabs/sections to load

    // Try to find Identifiers tab or section
    const identifiersTab = page.locator('text=/Identifiers/i').first();
    if (await identifiersTab.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Identifiers tab, clicking...');
      await identifiersTab.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️  Identifiers tab not found, continuing...');
    }

    // Take screenshot before clicking Add
    await page.screenshot({ path: 'diagnostic-02-before-add.png', fullPage: true });

    // Step 6: Click Add Identifier button
    console.log('\n📍 Step 6: Looking for Add Identifier button...');
    const addButton = page
      .locator('button')
      .filter({ hasText: /add identifier/i })
      .first();

    if (!(await addButton.isVisible({ timeout: 5000 }))) {
      // Try alternative selectors
      const altAddButton = page.locator('button:has-text("Add"), button:has-text("add")').first();
      if (await altAddButton.isVisible({ timeout: 5000 })) {
        console.log('✅ Found Add button, clicking...');
        await altAddButton.click();
      } else {
        console.log('❌ Add Identifier button not found!');
        await page.screenshot({ path: 'diagnostic-error-no-add-button.png', fullPage: true });
        throw new Error('Add Identifier button not visible');
      }
    } else {
      console.log('✅ Found Add Identifier button, clicking...');
      await addButton.click();
    }

    await page.waitForTimeout(2000);

    // Take screenshot of dialog
    await page.screenshot({ path: 'diagnostic-03-dialog-open.png', fullPage: true });

    // Step 7: Fill in the identifier form
    console.log('\n📍 Step 7: Filling identifier form...');

    // Fill Country Code
    console.log('   Filling Country Code: NL');
    const countryInput = page
      .locator('input, select, .k-dropdown')
      .filter({ hasText: /country|Country Code/i })
      .first();
    if (await countryInput.isVisible({ timeout: 3000 })) {
      await countryInput.click();
      await countryInput.fill('NL');
      await page.keyboard.press('Enter');
    } else {
      console.log('⚠️  Country input not found, trying alternative approach...');
      // Look for any input labeled "Country"
      const countryLabel = page.locator('label:has-text("Country")');
      if (await countryLabel.isVisible({ timeout: 2000 })) {
        const input = page.locator('input').nth(0);
        await input.fill('NL');
      }
    }

    // Fill Identifier Type
    console.log('   Filling Identifier Type: KVK');
    const typeDropdown = page
      .locator('select, .k-dropdown')
      .filter({ hasText: /type|identifier type/i })
      .first();
    if (await typeDropdown.isVisible({ timeout: 3000 })) {
      await typeDropdown.click();
      await page.waitForTimeout(500);
      const kvkOption = page.locator('option:has-text("KVK"), li:has-text("KVK")').first();
      if (await kvkOption.isVisible({ timeout: 2000 })) {
        await kvkOption.click();
      }
    }

    // Fill Identifier Value
    console.log('   Filling Identifier Value: 95944192');
    const valueInput = page.locator('input[type="text"]').last();
    await valueInput.fill('95944192');

    // Fill Validation Status (if present)
    console.log('   Setting Validation Status: PENDING');
    const statusDropdown = page
      .locator('select, .k-dropdown')
      .filter({ hasText: /status|validation/i })
      .first();
    if (await statusDropdown.isVisible({ timeout: 2000 })) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      const pendingOption = page
        .locator('option:has-text("PENDING"), li:has-text("PENDING")')
        .first();
      if (await pendingOption.isVisible({ timeout: 2000 })) {
        await pendingOption.click();
      }
    }

    console.log('✅ Form filled\n');

    // Take screenshot before save
    await page.screenshot({ path: 'diagnostic-04-form-filled.png', fullPage: true });

    // Step 8: Click Save/Add button
    console.log('📍 Step 8: Clicking Save button...');
    const saveButton = page
      .locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Submit")')
      .first();

    if (await saveButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Save button, clicking...');
      await saveButton.click();
    } else {
      console.log('❌ Save button not found!');
      await page.screenshot({ path: 'diagnostic-error-no-save-button.png', fullPage: true });
      throw new Error('Save button not visible');
    }

    // Step 9: Wait for API response
    console.log('\n📍 Step 9: Waiting for API response...');
    await page.waitForTimeout(5000);

    // Take screenshot after save
    await page.screenshot({ path: 'diagnostic-05-after-save.png', fullPage: true });

    // Step 10: Check for error messages on page
    console.log('\n📍 Step 10: Checking for error messages...');
    const errorMessage = page.locator('.k-notification-error, .error, [role="alert"]').first();
    if (await errorMessage.isVisible({ timeout: 2000 })) {
      const errorText = await errorMessage.textContent();
      console.log('🚨 ERROR MESSAGE ON PAGE:', errorText);
    } else {
      console.log('ℹ️  No error message found on page');
    }

    // Step 11: Generate comprehensive report
    console.log('\n========== DIAGNOSTIC REPORT ==========\n');

    console.log('1. CONSOLE ERRORS:');
    if (capturedData.consoleErrors.length > 0) {
      capturedData.consoleErrors.forEach((err, i) => {
        console.log(`   [${i + 1}] ${err}`);
      });
    } else {
      console.log('   ✅ No console errors captured');
    }

    console.log('\n2. CONSOLE WARNINGS:');
    if (capturedData.consoleWarnings.length > 0) {
      capturedData.consoleWarnings.forEach((warn, i) => {
        console.log(`   [${i + 1}] ${warn}`);
      });
    } else {
      console.log('   ✅ No console warnings captured');
    }

    console.log('\n3. API REQUESTS:');
    const identifierRequests = capturedData.networkRequests.filter((req) =>
      req.url.includes('identifiers')
    );
    if (identifierRequests.length > 0) {
      identifierRequests.forEach((req, i) => {
        console.log(`\n   [${i + 1}] ${req.method} ${req.url}`);
        console.log(
          `   Authorization Header: ${req.headers.authorization ? '✅ Present' : '❌ MISSING'}`
        );
        if (req.postData) {
          console.log(`   Request Body: ${req.postData}`);
        }
      });
    } else {
      console.log('   ⚠️  No identifier-related requests captured');
    }

    console.log('\n4. API RESPONSES:');
    const identifierResponses = capturedData.apiResponses.filter((res) =>
      res.url.includes('identifiers')
    );
    if (identifierResponses.length > 0) {
      identifierResponses.forEach((res, i) => {
        console.log(`\n   [${i + 1}] ${res.method} ${res.url}`);
        console.log(`   Status: ${res.status} ${res.statusText}`);
        console.log('   Response Headers:', JSON.stringify(res.headers, null, 2));
        console.log('   Response Body:', JSON.stringify(res.body, null, 2));
      });
    } else {
      console.log('   ⚠️  No identifier-related responses captured');
    }

    console.log('\n5. ERROR ANALYSIS:');
    const errorResponses = capturedData.apiResponses.filter((res) => res.status >= 400);
    if (errorResponses.length > 0) {
      errorResponses.forEach((res) => {
        console.log(`\n   🚨 ${res.status} Error: ${res.method} ${res.url}`);
        console.log(`   Status Text: ${res.statusText}`);
        console.log('   Response Body:', JSON.stringify(res.body, null, 2));

        // Provide diagnosis
        if (res.status === 401) {
          console.log('\n   ⚠️  DIAGNOSIS: Authentication failure');
          console.log('      - Check if Authorization header was sent');
          console.log('      - Check if token is valid (not expired)');
          console.log(`      - Check token format (should be "Bearer <token>")`);
        } else if (res.status === 403) {
          console.log('\n   ⚠️  DIAGNOSIS: Authorization failure');
          console.log('      - User authenticated but lacks permissions');
          console.log('      - Check RBAC configuration');
        } else if (res.status === 404) {
          console.log('\n   ⚠️  DIAGNOSIS: Resource not found');
          console.log('      - Check if entity ID is correct');
          console.log('      - Check API route configuration');
        } else if (res.status === 409) {
          console.log('\n   ⚠️  DIAGNOSIS: Conflict');
          console.log('      - Identifier may already exist');
          console.log('      - Check database constraints');
        } else if (res.status === 500) {
          console.log('\n   ⚠️  DIAGNOSIS: Server error');
          console.log('      - Check API logs for stack trace');
          console.log('      - Check database connection');
          console.log('      - Check audit logging');

          // Parse error details if available
          if (typeof res.body === 'object' && res.body !== null) {
            const errorBody = res.body as Record<string, unknown>;
            if (errorBody.error) {
              console.log(`      - Error: ${errorBody.error}`);
            }
            if (errorBody.details) {
              console.log(`      - Details: ${errorBody.details}`);
            }
            if (errorBody.error_code) {
              console.log(`      - Error Code: ${errorBody.error_code}`);
            }
          }
        }
      });
    } else {
      console.log('   ✅ No error responses captured');
    }

    console.log('\n========== END OF DIAGNOSTIC REPORT ==========\n');

    // Save full diagnostic data to file
    const diagnosticReport = JSON.stringify(capturedData, null, 2);
    const fs = require('node:fs');
    fs.writeFileSync('diagnostic-full-report.json', diagnosticReport);
    console.log('✅ Full diagnostic report saved to: diagnostic-full-report.json\n');
  });
});
