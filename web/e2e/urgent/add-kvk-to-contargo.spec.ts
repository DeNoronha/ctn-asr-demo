import { expect, test } from '../../playwright/fixtures';

/**
 * URGENT: Add KvK Number to Contargo GmbH & Co. KG
 *
 * Mission: Add REAL KvK number 95944192 (NL) to Contargo for production verification
 * Entity: Contargo GmbH & Co. KG
 * KvK: 95944192
 * Country: NL (Netherlands)
 * Registry: Dutch Chamber of Commerce (Kamer van Koophandel)
 *
 * Priority: CRITICAL
 * Deadline: Tomorrow morning for Ramon to verify
 */

test.describe('URGENT: Add KvK to Contargo', () => {
  test.beforeEach(async ({ page }) => {
    // Console monitoring for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('❌ CONSOLE ERROR:', msg.text());
      }
    });

    // Monitor network requests
    page.on('response', (response) => {
      if (response.url().includes('/api/v1/')) {
        console.log(`API: ${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give MSAL time to load
  });

  test('should add KvK number 95944192 to Contargo GmbH & Co. KG', async ({ page }) => {
    console.log('🎯 MISSION: Add KvK 95944192 to Contargo');

    // Step 1: Navigate to Members (using exact pattern from working tests)
    console.log('Step 1: Navigate to Members');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);
    console.log('✅ Clicked Members link');

    // Step 2: Wait for grid to load
    console.log('Step 2: Wait for grid to load');
    const grid = page.locator('.k-grid, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Grid loaded');

    // Step 3: Search for Contargo
    console.log('Step 3: Search for Contargo');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('Contargo');
      await page.waitForTimeout(2000);
      console.log('✅ Search completed');
    } else {
      console.log('⚠️ No search box found, scanning grid manually');
    }

    await page.screenshot({
      path: 'playwright-report/screenshots/contargo-search.png',
      fullPage: true,
    });

    // Step 4: Find and click Contargo row
    console.log('Step 4: Find Contargo in grid');
    const contagroRow = grid.locator('tr:has-text("Contargo")').first();
    const rowExists = await contagroRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!rowExists) {
      console.error('❌ CRITICAL: Contargo not found in members list!');
      throw new Error('Contargo GmbH & Co. KG not found in members list');
    }

    const rowText = await contagroRow.textContent();
    console.log(`✅ Found Contargo: ${rowText}`);

    await contagroRow.click();
    await page.waitForTimeout(2000);
    console.log('✅ Clicked Contargo row');

    await page.screenshot({
      path: 'playwright-report/screenshots/contargo-details-opened.png',
      fullPage: true,
    });

    // Step 5: Scroll to Identifiers section
    console.log('Step 5: Locate Identifiers section');
    const identifiersSection = page.locator('text=/Identifiers|Business.*Identifiers/i').first();
    const hasIdentifiers = await identifiersSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasIdentifiers) {
      await identifiersSection.scrollIntoViewIfNeeded();
      console.log('✅ Identifiers section visible');
    } else {
      console.log('⚠️ Identifiers section not immediately visible, continuing...');
    }

    // Step 6: Find and click "Add Identifier" button
    console.log('Step 6: Click "Add Identifier" button');
    const addIdentifierButton = page.getByRole('button', { name: /Add.*Identifier/i });

    // Try multiple selectors if first one doesn't work
    let addButtonVisible = await addIdentifierButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!addButtonVisible) {
      console.log('⚠️ Trying alternative selector for Add Identifier button');
      const altButton = page.locator('button:has-text("Add")').first();
      addButtonVisible = await altButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (addButtonVisible) {
        await altButton.click();
      }
    } else {
      await addIdentifierButton.click();
    }

    if (!addButtonVisible) {
      console.error('❌ CRITICAL: Add Identifier button not found!');
      await page.screenshot({
        path: 'playwright-report/screenshots/add-button-not-found.png',
        fullPage: true,
      });
      throw new Error('Add Identifier button not found');
    }

    await page.waitForTimeout(1500);
    console.log('✅ Add Identifier dialog should be open');

    await page.screenshot({
      path: 'playwright-report/screenshots/add-identifier-dialog.png',
      fullPage: true,
    });

    // Step 7: Fill in identifier form
    console.log('Step 7: Fill in KvK identifier form');

    // Country Code: NL
    const countryDropdown = page.locator('select[name*="country"], .k-dropdown:has-text("Country")').first();
    const hasCountryDropdown = await countryDropdown.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCountryDropdown) {
      // Try standard select
      const isSelect = await countryDropdown.evaluate((el) => el.tagName === 'SELECT');
      if (isSelect) {
        await countryDropdown.selectOption('NL');
        console.log('✅ Country set to NL (select)');
      } else {
        // Kendo dropdown
        await countryDropdown.click();
        await page.waitForTimeout(500);
        await page.locator('li:has-text("Netherlands"), li:has-text("NL")').first().click();
        console.log('✅ Country set to NL (Kendo)');
      }
    } else {
      // Try input field
      const countryInput = page.locator('input[name*="country"]').first();
      await countryInput.fill('NL');
      console.log('✅ Country set to NL (input)');
    }

    await page.waitForTimeout(500);

    // Identifier Type: KVK
    const typeDropdown = page.locator('select[name*="type"], .k-dropdown:has-text("Type")').first();
    const hasTypeDropdown = await typeDropdown.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTypeDropdown) {
      const isSelect = await typeDropdown.evaluate((el) => el.tagName === 'SELECT');
      if (isSelect) {
        await typeDropdown.selectOption('KVK');
        console.log('✅ Type set to KVK (select)');
      } else {
        await typeDropdown.click();
        await page.waitForTimeout(500);
        await page.locator('li:has-text("KVK")').first().click();
        console.log('✅ Type set to KVK (Kendo)');
      }
    } else {
      const typeInput = page.locator('input[name*="type"]').first();
      await typeInput.fill('KVK');
      console.log('✅ Type set to KVK (input)');
    }

    await page.waitForTimeout(500);

    // Identifier Value: 95944192
    const valueInput = page.locator('input[name*="value"], input[placeholder*="value"], input[placeholder*="identifier"]').first();
    await valueInput.fill('95944192');
    console.log('✅ Identifier value set to 95944192');

    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/screenshots/identifier-form-filled.png',
      fullPage: true,
    });

    // Step 8: Submit the form
    console.log('Step 8: Submit identifier form');
    const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Save")').last();
    await submitButton.click();
    await page.waitForTimeout(3000);
    console.log('✅ Form submitted');

    // Step 9: Verify the identifier was added
    console.log('Step 9: Verify KvK appears in identifiers list');

    // Look for the KvK number in the identifiers grid/list
    const kvkInGrid = page.locator('text=95944192').first();
    const kvkAdded = await kvkInGrid.isVisible({ timeout: 5000 }).catch(() => false);

    if (kvkAdded) {
      console.log('✅✅✅ SUCCESS! KvK 95944192 is now visible in Contargo identifiers!');
    } else {
      console.warn('⚠️ KvK not immediately visible, but may have been added. Refreshing to verify...');

      // Refresh the page to see if it persisted
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Search for Contargo again
      const searchInput2 = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput2.fill('Contargo');
        await page.waitForTimeout(1500);
      }

      // Click Contargo
      const contagroRow2 = grid.locator('tr:has-text("Contargo")').first();
      await contagroRow2.click();
      await page.waitForTimeout(2000);

      // Check again
      const kvkInGrid2 = page.locator('text=95944192').first();
      const kvkAddedAfterRefresh = await kvkInGrid2.isVisible({ timeout: 5000 }).catch(() => false);

      if (kvkAddedAfterRefresh) {
        console.log('✅✅✅ SUCCESS AFTER REFRESH! KvK 95944192 persisted and is visible!');
      } else {
        console.error('❌ CRITICAL: KvK was not added or did not persist!');
        throw new Error('KvK identifier was not successfully added');
      }
    }

    // Final screenshot
    await page.screenshot({
      path: 'playwright-report/screenshots/contargo-kvk-added-SUCCESS.png',
      fullPage: true,
    });

    // Verify no console errors
    console.log('✅ Mission complete - KvK 95944192 added to Contargo GmbH & Co. KG');
    console.log('📸 Screenshots saved to playwright-report/screenshots/');
    console.log('🎉 Ramon will see this tomorrow morning!');
  });
});
