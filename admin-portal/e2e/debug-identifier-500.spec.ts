import { expect, test } from '../playwright/fixtures';

test.describe('Debug Identifier 500 Error', () => {
  test('capture full error details when adding identifier', async ({ page, context }) => {
    // Listen to all API responses
    const apiResponses: Array<{
      url: string;
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: unknown;
    }> = [];
    page.on('response', async (response) => {
      if (response.url().includes('identifiers')) {
        const status = response.status();
        const url = response.url();
        let body = null;

        try {
          body = await response.json();
        } catch (_e) {
          try {
            body = await response.text();
          } catch (_e2) {
            body = 'Unable to parse response';
          }
        }

        apiResponses.push({
          url,
          status,
          statusText: response.statusText(),
          headers: response.headers(),
          body,
        });

        console.log('\n========== API Response ==========');
        console.log('URL:', url);
        console.log('Status:', status, response.statusText());
        console.log('Headers:', JSON.stringify(response.headers(), null, 2));
        console.log('Body:', JSON.stringify(body, null, 2));
        console.log('==================================\n');
      }
    });

    // Also listen to console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });

    // Navigate to admin portal
    console.log('Navigating to admin portal...');
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net/admin');
    await page.waitForLoadState('networkidle');

    // Wait for members grid to load
    console.log('Waiting for members grid...');
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Find and click on a member (first row)
    console.log('Clicking on first member...');
    const firstRow = page.locator('.mantine-DataTable-root tbody tr').first();
    await firstRow.click();

    // Wait for member detail view
    console.log('Waiting for member detail view...');
    await page.waitForSelector('text=/Member Details|Organization Details/i', { timeout: 10000 });

    // Look for the Identifiers section
    console.log('Looking for Identifiers section...');
    await page.waitForTimeout(2000); // Give time for tabs to load

    // Try to find and click Identifiers tab or section
    const identifiersTab = page.locator('text=/Identifiers/i').first();
    if (await identifiersTab.isVisible()) {
      console.log('Clicking Identifiers tab...');
      await identifiersTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for Add Identifier button
    console.log('Looking for Add Identifier button...');
    const addButton = page
      .locator('button:has-text("Add"), button:has-text("add")')
      .filter({ hasText: /identifier/i })
      .first();

    if (await addButton.isVisible({ timeout: 5000 })) {
      console.log('Clicking Add Identifier button...');
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill in the identifier form
      console.log('Filling identifier form...');

      // Select KVK as identifier type
      const typeDropdown = page
        .locator('select, .mantine-Select-root')
        .filter({ hasText: /type|identifier type/i })
        .first();
      if (await typeDropdown.isVisible({ timeout: 2000 })) {
        await typeDropdown.click();
        await page.locator('option:has-text("KVK"), li:has-text("KVK")').first().click();
      }

      // Enter KVK number
      const valueInput = page
        .locator('input[type="text"]')
        .filter({ hasText: /value|number/i })
        .first();
      if (await valueInput.isVisible({ timeout: 2000 })) {
        await valueInput.fill('95944192');
      } else {
        // Try a more generic approach
        const inputs = page.locator('input[type="text"]');
        const count = await inputs.count();
        if (count > 0) {
          await inputs.last().fill('95944192');
        }
      }

      // Click Save button
      console.log('Clicking Save button...');
      const saveButton = page.locator('button:has-text("Save"), button:has-text("save")').first();
      await saveButton.click();

      // Wait for API response
      console.log('Waiting for API response...');
      await page.waitForTimeout(3000);

      // Check for error messages
      const errorMessage = page.locator('.mantine-Notification-root-error, .error, [role="alert"]').first();
      if (await errorMessage.isVisible({ timeout: 2000 })) {
        const errorText = await errorMessage.textContent();
        console.log('ERROR MESSAGE ON PAGE:', errorText);
      }

      console.log('\n========== CAPTURED API RESPONSES ==========');
      console.log(JSON.stringify(apiResponses, null, 2));
      console.log('============================================\n');

      // Find the 500 error response
      const errorResponse = apiResponses.find((r) => r.status === 500);
      if (errorResponse) {
        console.log('\n========== 500 ERROR DETAILS ==========');
        console.log(JSON.stringify(errorResponse, null, 2));
        console.log('========================================\n');
      }
    } else {
      console.log('Add Identifier button not found. Taking screenshot...');
      await page.screenshot({ path: 'debug-no-add-button.png', fullPage: true });
    }

    // Take final screenshot
    await page.screenshot({ path: 'debug-identifier-final.png', fullPage: true });
  });
});
