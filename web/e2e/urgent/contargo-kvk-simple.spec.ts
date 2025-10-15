import { expect, test } from '../../playwright/fixtures';

/**
 * URGENT: Simple test to add KvK to Contargo
 *
 * This is a minimal version that skips complex selectors and uses direct interaction
 */

test.describe.configure({ mode: 'serial' });

test.describe('Add KvK to Contargo - Simple Version', () => {
  test('URGENT: Add KvK 95944192 to Contargo', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('🎯 Starting mission: Add KvK 95944192 to Contargo');

    // Navigate to the portal
    await page.goto('/', { waitUntil: 'load' });
    console.log('✅ Portal loaded');

    // Wait a bit for MSAL and React to initialize
    await page.waitForTimeout(5000);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'playwright-report/01-portal-loaded.png',
      fullPage: true
    });

    // Click Members in sidebar
    console.log('Clicking Members...');
    try {
      await page.click('text=Members', { timeout: 10000 });
      console.log('✅ Clicked Members');
    } catch (e) {
      console.error('Could not click Members link:', e.message);
      await page.screenshot({ path: 'playwright-report/ERROR-members-not-found.png', fullPage: true });
      throw e;
    }

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'playwright-report/02-members-page.png',
      fullPage: true
    });

    // Search for Contargo
    console.log('Searching for Contargo...');
    const searchBox = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchBox.fill('Contargo');
      await page.waitForTimeout(2000);
      console.log('✅ Searched for Contargo');
    } else {
      console.log('⚠️ No search box found, will click first Contargo row');
    }

    await page.screenshot({
      path: 'playwright-report/03-search-contargo.png',
      fullPage: true
    });

    // Click on Contargo row
    console.log('Clicking Contargo row...');
    try {
      await page.click('text=Contargo', { timeout: 10000 });
      console.log('✅ Clicked Contargo row');
    } catch (e) {
      console.error('Could not click Contargo row:', e.message);
      await page.screenshot({ path: 'playwright-report/ERROR-contargo-not-found.png', fullPage: true });
      throw e;
    }

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'playwright-report/04-contargo-details.png',
      fullPage: true
    });

    // Look for "Add Identifier" or "Add" button
    console.log('Looking for Add Identifier button...');
    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.scrollIntoViewIfNeeded();
      await addButton.click();
      console.log('✅ Clicked Add button');
    } else {
      console.error('❌ Add Identifier button not found');
      await page.screenshot({ path: 'playwright-report/ERROR-add-button-not-found.png', fullPage: true });
      throw new Error('Add Identifier button not found');
    }

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'playwright-report/05-add-identifier-dialog.png',
      fullPage: true
    });

    // Fill in the form
    console.log('Filling identifier form...');

    // Country Code: NL
    const countryInput = page.locator('input[name*="country"], select[name*="country"]').first();
    await countryInput.fill('NL');
    console.log('✅ Country: NL');

    await page.waitForTimeout(500);

    // Identifier Type: KVK
    const typeInput = page.locator('input[name*="type"], select[name*="type"]').first();
    await typeInput.fill('KVK');
    console.log('✅ Type: KVK');

    await page.waitForTimeout(500);

    // Identifier Value: 95944192
    const valueInput = page.locator('input[name*="value"], input[placeholder*="value"]').first();
    await valueInput.fill('95944192');
    console.log('✅ Value: 95944192');

    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/06-form-filled.png',
      fullPage: true
    });

    // Submit
    console.log('Submitting form...');
    const submitButton = page.locator('button:has-text("Add"), button:has-text("Save"), button[type="submit"]').last();
    await submitButton.click();
    console.log('✅ Form submitted');

    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'playwright-report/07-after-submit.png',
      fullPage: true
    });

    // Verify
    console.log('Verifying KvK was added...');
    const kvkNumber = page.locator('text=95944192');
    const isVisible = await kvkNumber.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅✅✅ SUCCESS! KvK 95944192 is visible!');
      await page.screenshot({
        path: 'playwright-report/SUCCESS-kvk-added.png',
        fullPage: true
      });
    } else {
      console.log('⚠️ KvK not immediately visible, refreshing page...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Try finding Contargo again
      await page.click('text=Contargo', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const kvkAfterRefresh = page.locator('text=95944192');
      const isVisibleAfterRefresh = await kvkAfterRefresh.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisibleAfterRefresh) {
        console.log('✅✅✅ SUCCESS AFTER REFRESH! KvK persisted!');
        await page.screenshot({
          path: 'playwright-report/SUCCESS-kvk-persisted.png',
          fullPage: true
        });
      } else {
        console.error('❌ KvK was not added successfully');
        throw new Error('KvK identifier was not successfully added');
      }
    }

    console.log('🎉 MISSION COMPLETE!');
    console.log('📸 Screenshots saved to: playwright-report/');
    console.log('✅ Ramon will see KvK 95944192 on Contargo tomorrow morning!');
  });
});
