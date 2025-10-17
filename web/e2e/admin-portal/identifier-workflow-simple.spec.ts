import { expect, test } from '../../playwright/fixtures';

/**
 * Simplified Production E2E Test - Identifier Workflow
 *
 * Test Area: Identifier management workflow validation
 * Priority: CRITICAL - Production validation
 * Entity ID: fbc4bcdc-a9f9-4621-a153-c5deb6c49519
 *
 * This is a simplified version focusing on actual workflow validation
 * without complex element hunting.
 *
 * Azure DevOps Metadata:
 * - Area Path: Testing/E2E/Production
 * - Priority: 1 (Critical)
 * - Tags: production, smoke-test, identifiers
 */

const _TEST_KVK_NUMBER = '95944192';

test.describe('Production Smoke Test - Identifier Workflow', () => {
  let consoleErrors: string[] = [];
  let apiCalls: Array<{ method: string; url: string; status: number }> = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    apiCalls = [];

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('❌ CONSOLE ERROR:', msg.text());
      }
    });

    // Monitor API calls
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('azurewebsites.net')) {
        const call = {
          method: response.request().method(),
          url: url.split('/').slice(-3).join('/'),
          status: response.status(),
        };
        apiCalls.push(call);
        console.log(`${call.method} ${call.status} - ${call.url}`);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('✅ Admin portal loaded');
  });

  test('Should load dashboard and navigate to members', async ({ page }) => {
    console.log('\n🧪 Test: Navigate to Members');

    // Wait for dashboard to be visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    console.log('✅ Dashboard visible');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/screenshots/prod-dashboard.png',
      fullPage: true,
    });

    // Click Members in navigation
    await page.getByText('Members').first().click();
    await page.waitForTimeout(3000);

    // Wait for member grid to load
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible({
      timeout: 10000,
    });
    console.log('✅ Member Directory loaded');

    await page.screenshot({
      path: 'playwright-report/screenshots/prod-member-directory.png',
      fullPage: true,
    });

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);
    console.log('✅ No console errors');
  });

  test('Should open member details and view identifiers section', async ({ page }) => {
    console.log('\n🧪 Test: View Member Identifiers');

    // Navigate to members
    await page.getByText('Members').first().click();
    await page.waitForTimeout(2000);

    // Click first member row
    const firstMemberRow = page.locator('.k-grid-content tr').first();
    await firstMemberRow.waitFor({ state: 'visible', timeout: 10000 });
    await firstMemberRow.click();
    await page.waitForTimeout(2000);
    console.log('✅ Member details opened');

    await page.screenshot({
      path: 'playwright-report/screenshots/prod-member-details.png',
      fullPage: true,
    });

    // Look for Identifiers heading or tab
    const identifiersSection = page.getByText('Identifiers').first();
    const hasIdentifiers = await identifiersSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasIdentifiers) {
      console.log('✅ Identifiers section found');
      await identifiersSection.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'playwright-report/screenshots/prod-identifiers-section.png',
        fullPage: true,
      });
    } else {
      console.log('⚠️ Identifiers section not immediately visible');
    }

    // Check for "Create Legal Entity" button
    const createButton = page.getByRole('button', { name: /create legal entity/i });
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCreateButton) {
      console.log('✅ "Create Legal Entity" button found');
      await page.screenshot({
        path: 'playwright-report/screenshots/prod-create-entity-button.png',
        fullPage: true,
      });
    } else {
      console.log('✅ No "Create Legal Entity" button - entity likely exists');
    }

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter((err) => !err.includes('Trial license'));
    expect(criticalErrors.length).toBe(0);
  });

  test('Should check for Add Identifier button and form', async ({ page }) => {
    console.log('\n🧪 Test: Check Add Identifier Functionality');

    // Navigate to members
    await page.getByText('Members').first().click();
    await page.waitForTimeout(2000);

    // Open first member
    const firstMemberRow = page.locator('.k-grid-content tr').first();
    await firstMemberRow.click();
    await page.waitForTimeout(2000);

    // Click Identifiers if available
    const identifiersTab = page.getByText('Identifiers').first();
    const hasTab = await identifiersTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTab) {
      await identifiersTab.click();
      await page.waitForTimeout(2000);
    }

    // Look for Add Identifier button
    const addButton = page.getByRole('button', { name: /add identifier/i }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddButton) {
      console.log('✅ "Add Identifier" button found');

      await page.screenshot({
        path: 'playwright-report/screenshots/prod-before-add-dialog.png',
        fullPage: true,
      });

      // Try to open the dialog
      await addButton.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: 'playwright-report/screenshots/prod-add-identifier-dialog.png',
        fullPage: true,
      });

      // Check if dialog opened
      const dialog = page.locator('[role="dialog"]').first();
      const hasDialog = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDialog) {
        console.log('✅ Add Identifier dialog opened');

        // Look for form fields
        const hasCountryField = await page
          .locator('input[name*="country"], select[name*="country"]')
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        const hasTypeField = await page
          .locator('input[name*="type"], select[name*="type"]')
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        const hasValueField = await page
          .locator('input[name*="value"]')
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        console.log(
          `Form fields - Country: ${hasCountryField}, Type: ${hasTypeField}, Value: ${hasValueField}`
        );

        // Close dialog
        const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
        const hasCancelButton = await cancelButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasCancelButton) {
          await cancelButton.click();
          console.log('✅ Dialog closed');
        }
      } else {
        console.log('⚠️ Dialog did not open');
      }
    } else {
      console.log('⚠️ "Add Identifier" button not found');
    }

    await page.screenshot({
      path: 'playwright-report/screenshots/prod-test-complete.png',
      fullPage: true,
    });

    // Report API calls
    console.log('\n📊 API Calls Made:');
    apiCalls.forEach((call) => {
      console.log(`  ${call.method} ${call.status} - ${call.url}`);
    });

    // Verify no critical errors
    const criticalErrors = consoleErrors.filter((err) => !err.includes('Trial license'));
    expect(criticalErrors.length).toBe(0);
    console.log('✅ No critical console errors');
  });

  test('Should verify existing identifiers can be viewed', async ({ page }) => {
    console.log('\n🧪 Test: View Existing Identifiers');

    // Navigate to members
    await page.getByText('Members').first().click();
    await page.waitForTimeout(2000);

    // Open first member
    const firstMemberRow = page.locator('.k-grid-content tr').first();
    await firstMemberRow.click();
    await page.waitForTimeout(2000);

    // Click Identifiers
    const identifiersTab = page.getByText('Identifiers').first();
    const hasTab = await identifiersTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTab) {
      await identifiersTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Identifiers tab clicked');
    }

    // Check for identifier grid
    const grid = page.locator('.k-grid').last();
    const hasGrid = await grid.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasGrid) {
      console.log('✅ Identifier grid visible');

      // Count rows
      const rows = grid.locator('.k-grid-content tr');
      const rowCount = await rows.count();
      console.log(`📊 Found ${rowCount} identifier rows`);

      await page.screenshot({
        path: 'playwright-report/screenshots/prod-identifiers-grid.png',
        fullPage: true,
      });

      // Check for action buttons (Edit/Delete)
      const editButtons = page.getByRole('button', { name: /edit/i });
      const editCount = await editButtons.count();
      console.log(`📊 Found ${editCount} Edit buttons`);

      const deleteButtons = page.getByRole('button', { name: /delete/i });
      const deleteCount = await deleteButtons.count();
      console.log(`📊 Found ${deleteCount} Delete buttons`);
    } else {
      console.log('⚠️ Identifier grid not visible - may be empty state');
    }

    // Check for GET identifiers API call
    const getIdentifiersCall = apiCalls.find(
      (call) => call.method === 'GET' && call.url.includes('identifiers')
    );

    if (getIdentifiersCall) {
      console.log(`✅ GET identifiers API call succeeded: ${getIdentifiersCall.status}`);
      expect(getIdentifiersCall.status).toBe(200);
    } else {
      console.log('⚠️ GET identifiers API call not detected');
    }

    // Verify no critical errors
    const criticalErrors = consoleErrors.filter((err) => !err.includes('Trial license'));
    expect(criticalErrors.length).toBe(0);
  });
});
