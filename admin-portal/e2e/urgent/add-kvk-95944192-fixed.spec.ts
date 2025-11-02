import { expect, test } from '../../playwright/fixtures';

/**
 * FIXED: Add KvK 95944192 to Contargo
 *
 * This test correctly navigates via the View button
 */

test.describe.configure({ mode: 'serial' });

test.describe('Add KvK 95944192 to Contargo - FIXED', () => {
  test('Add KvK number 95944192 to Contargo', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('🎯 Mission: Add KvK 95944192 to Contargo');

    // Navigate to portal
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    console.log('✅ Portal loaded');

    // Click Members in sidebar
    await page.click('text=Members', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Members');

    // Search for Contargo
    const searchBox = page.locator('input[placeholder*="Search"]').first();
    await searchBox.fill('Contargo');
    await page.waitForTimeout(2000);
    console.log('✅ Searched for Contargo');

    await page.screenshot({
      path: 'playwright-report/01-contargo-found.png',
      fullPage: true,
    });

    // Click the View button for Contargo row
    console.log('Clicking View button...');
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();
    await page.waitForTimeout(3000);
    console.log('✅ Clicked View button, navigating to detail page');

    await page.screenshot({
      path: 'playwright-report/02-contargo-detail-page.png',
      fullPage: true,
    });

    // Look for Identifiers tab or section
    console.log('Looking for Identifiers section...');

    // Try clicking Identifiers tab if it exists
    const identifiersTab = page.locator('text=/Identifiers?/i').first();
    const hasIdentifiersTab = await identifiersTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasIdentifiersTab) {
      await identifiersTab.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked Identifiers tab');
    } else {
      console.log('⚠️ No Identifiers tab found, checking for section on same page');
    }

    await page.screenshot({
      path: 'playwright-report/03-identifiers-section.png',
      fullPage: true,
    });

    // Check if KvK 95944192 already exists
    const existingKvK = page.locator('text=95944192');
    const alreadyExists = await existingKvK.isVisible({ timeout: 2000 }).catch(() => false);

    if (alreadyExists) {
      console.log('✅✅✅ KvK 95944192 ALREADY EXISTS! No need to add it.');
      await page.screenshot({
        path: 'playwright-report/SUCCESS-kvk-already-exists.png',
        fullPage: true,
      });
      return;
    }

    // Look for Add Identifier button
    console.log('Looking for Add Identifier button...');
    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.scrollIntoViewIfNeeded();
      await addButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked Add button');
    } else {
      console.error('❌ Add button not found');
      await page.screenshot({
        path: 'playwright-report/ERROR-no-add-button.png',
        fullPage: true,
      });

      // Log what buttons ARE visible
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons);

      throw new Error('Add Identifier button not found on detail page');
    }

    await page.screenshot({
      path: 'playwright-report/04-add-identifier-dialog.png',
      fullPage: true,
    });

    // Fill the form
    console.log('Filling identifier form...');

    // Try multiple selectors for Country
    const countrySelectors = [
      'input[name*="country"]',
      'select[name*="country"]',
      'input[placeholder*="Country"]',
      '.mantine-Select-root:has-text("Country")',
      'label:has-text("Country") + input',
      'label:has-text("Country") ~ input',
    ];

    let countryFilled = false;
    for (const selector of countrySelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.fill('NL');
        console.log(`✅ Country: NL (using selector: ${selector})`);
        countryFilled = true;
        break;
      }
    }

    if (!countryFilled) {
      console.error('❌ Could not find Country field');
      await page.screenshot({
        path: 'playwright-report/ERROR-no-country-field.png',
        fullPage: true,
      });
    }

    await page.waitForTimeout(1000);

    // Select Identifier Type (Kendo dropdown)
    console.log('Selecting Identifier Type: KVK...');

    // Click on the Identifier Type dropdown to open it
    // The dropdown is right after the "Identifier Type *" label
    const typeDropdownSelector =
      'label:has-text("Identifier Type") ~ span.mantine-Select-root, label:has-text("Identifier Type") + * span.mantine-Select-root';
    let typeDropdown = page.locator(typeDropdownSelector).first();

    // Try various methods to find and click the dropdown
    let dropdownClicked = false;

    // Method 1: Direct Kendo dropdown selector
    if (await typeDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      await typeDropdown.click();
      dropdownClicked = true;
      console.log('✅ Clicked Identifier Type dropdown (Method 1)');
    }

    // Method 2: Find any dropdown after "Identifier Type" label
    if (!dropdownClicked) {
      typeDropdown = page
        .locator('text=Identifier Type')
        .locator('..')
        .locator('span[role="combobox"], button[aria-haspopup="listbox"]')
        .first();
      if (await typeDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeDropdown.click();
        dropdownClicked = true;
        console.log('✅ Clicked Identifier Type dropdown (Method 2)');
      }
    }

    // Method 3: Click any clickable element with dropdown arrow after Identifier Type
    if (!dropdownClicked) {
      const dropdownArrow = page
        .locator('text=Identifier Type')
        .locator('..')
        .locator('.mantine-Select-root-wrap, .mantine-Select-dropdown')
        .first();
      if (await dropdownArrow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dropdownArrow.click();
        dropdownClicked = true;
        console.log('✅ Clicked Identifier Type dropdown (Method 3)');
      }
    }

    if (!dropdownClicked) {
      console.error('❌ Could not find Identifier Type dropdown');
      await page.screenshot({
        path: 'playwright-report/ERROR-dropdown-not-found.png',
        fullPage: true,
      });
      throw new Error('Could not find Identifier Type dropdown');
    }

    await page.waitForTimeout(1000);

    // Now select KVK from the dropdown list
    console.log('Selecting KVK from dropdown list...');
    const kvkOption = page
      .locator('li:has-text("KVK"), [role="option"]:has-text("KVK"), [role="option"]:has-text("KVK")')
      .first();

    if (await kvkOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kvkOption.click();
      console.log('✅ Selected KVK from dropdown');
    } else {
      console.error('❌ KVK option not found in dropdown');
      await page.screenshot({
        path: 'playwright-report/ERROR-kvk-option-not-found.png',
        fullPage: true,
      });

      // Try alternative: type KVK
      await page.keyboard.type('KVK');
      await page.keyboard.press('Enter');
      console.log('⚠️ Tried typing KVK as fallback');
    }

    await page.waitForTimeout(500);

    // Try multiple selectors for Value
    const valueSelectors = [
      'input[name*="value"]',
      'input[name*="number"]',
      'input[placeholder*="value"]',
      'input[placeholder*="number"]',
      'label:has-text("Value") + input',
      'label:has-text("Number") + input',
      'label:has-text("Value") ~ input',
    ];

    let valueFilled = false;
    for (const selector of valueSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.fill('95944192');
        console.log(`✅ Value: 95944192 (using selector: ${selector})`);
        valueFilled = true;
        break;
      }
    }

    if (!valueFilled) {
      console.error('❌ Could not find Value field');
      await page.screenshot({ path: 'playwright-report/ERROR-no-value-field.png', fullPage: true });

      // Log all visible inputs for debugging
      const allInputs = await page.locator('input').evaluateAll((inputs) =>
        inputs.map((input) => ({
          name: input.getAttribute('name'),
          placeholder: input.getAttribute('placeholder'),
          type: input.getAttribute('type'),
          visible: input.offsetWidth > 0 && input.offsetHeight > 0,
        }))
      );
      console.log('All input fields:', JSON.stringify(allInputs, null, 2));
    }

    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/05-form-filled.png',
      fullPage: true,
    });

    // Submit the form
    console.log('Submitting form...');
    const submitButton = page
      .locator(
        'button:has-text("Add"), button:has-text("Save"), button:has-text("Submit"), button[type="submit"]'
      )
      .last();
    await submitButton.click();
    console.log('✅ Form submitted');

    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'playwright-report/06-after-submit.png',
      fullPage: true,
    });

    // Verify KvK was added
    console.log('Verifying KvK 95944192 was added...');
    const kvkNumber = page.locator('text=95944192');
    const isVisible = await kvkNumber.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('✅✅✅ SUCCESS! KvK 95944192 is now visible!');
      await page.screenshot({
        path: 'playwright-report/SUCCESS-kvk-added.png',
        fullPage: true,
      });
    } else {
      console.log('⚠️ KvK not immediately visible, refreshing...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Navigate back to Contargo
      await page.click('text=Members', { timeout: 10000 });
      await page.waitForTimeout(1000);

      const searchBox2 = page.locator('input[placeholder*="Search"]').first();
      await searchBox2.fill('Contargo');
      await page.waitForTimeout(1000);

      await page.locator('button:has-text("View")').first().click();
      await page.waitForTimeout(2000);

      const kvkAfterRefresh = page.locator('text=95944192');
      const isVisibleAfterRefresh = await kvkAfterRefresh
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isVisibleAfterRefresh) {
        console.log('✅✅✅ SUCCESS AFTER REFRESH! KvK 95944192 persisted!');
        await page.screenshot({
          path: 'playwright-report/SUCCESS-kvk-persisted.png',
          fullPage: true,
        });
      } else {
        console.error('❌ KvK 95944192 was not successfully added');
        await page.screenshot({
          path: 'playwright-report/FAILURE-kvk-not-added.png',
          fullPage: true,
        });
        throw new Error('KvK identifier 95944192 was not successfully added');
      }
    }

    console.log('🎉 MISSION COMPLETE! KvK 95944192 added to Contargo!');
  });
});
