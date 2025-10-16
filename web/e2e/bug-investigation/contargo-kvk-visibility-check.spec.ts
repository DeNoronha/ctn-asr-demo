import { expect, test } from '../../playwright/fixtures';

/**
 * BUG INVESTIGATION: Check if KvK 95944192 is visible for Contargo
 *
 * User reported that despite running add-kvk-to-contargo.sh script last night,
 * the KvK number 95944192 is NOT visible in the admin portal for Contargo.
 *
 * This test checks:
 * 1. Can we navigate to Contargo's detail page?
 * 2. Is the Identifiers section visible?
 * 3. Is KvK 95944192 displayed in the identifiers list?
 * 4. What identifiers ARE shown (if any)?
 *
 * Expected: KvK 95944192 should be visible
 * Actual: User reports it's not visible
 */

test.describe('Bug Investigation: Contargo KvK Visibility', () => {
  test('Check if KvK 95944192 is visible in Contargo identifiers', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('🔍 Bug Investigation: Checking Contargo KvK visibility');
    console.log('Expected KvK: 95944192');
    console.log('');

    // Step 1: Navigate to admin portal
    console.log('Step 1: Loading admin portal...');
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(5000); // Wait for MSAL + React

    await page.screenshot({
      path: 'playwright-report/bug-investigation/01-portal-loaded.png',
      fullPage: true
    });
    console.log('✓ Portal loaded');
    console.log('');

    // Step 2: Navigate to Members
    console.log('Step 2: Navigating to Members page...');
    const membersLink = page.locator('text=Members').first();
    await expect(membersLink).toBeVisible({ timeout: 10000 });
    await membersLink.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'playwright-report/bug-investigation/02-members-page.png',
      fullPage: true
    });
    console.log('✓ Members page loaded');
    console.log('');

    // Step 3: Search for Contargo
    console.log('Step 3: Searching for Contargo...');
    const searchBox = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchBox.fill('Contargo');
      await page.waitForTimeout(2000);
      console.log('✓ Searched for "Contargo"');
    } else {
      console.log('⚠️ No search box found, will look for Contargo in table');
    }

    await page.screenshot({
      path: 'playwright-report/bug-investigation/03-search-contargo.png',
      fullPage: true
    });

    // Step 4: Click Contargo row
    console.log('Step 4: Clicking on Contargo...');
    const contargoRow = page.locator('text=Contargo').first();

    if (await contargoRow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await contargoRow.click();
      await page.waitForTimeout(3000);
      console.log('✓ Clicked Contargo row');
    } else {
      console.error('✗ CRITICAL: Contargo not found in members list');
      await page.screenshot({
        path: 'playwright-report/bug-investigation/ERROR-contargo-not-found.png',
        fullPage: true
      });
      throw new Error('Contargo member not found in list');
    }

    await page.screenshot({
      path: 'playwright-report/bug-investigation/04-contargo-details.png',
      fullPage: true
    });
    console.log('');

    // Step 5: Capture console logs and network requests
    console.log('Step 5: Capturing browser diagnostics...');

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 Browser Console Error:', msg.text());
      }
    });

    // Listen for network failures
    page.on('requestfailed', request => {
      console.error('🔴 Network Request Failed:', request.url());
    });

    // Step 6: Check for Identifiers section
    console.log('Step 6: Looking for Identifiers section...');

    // Try multiple possible selector patterns
    const possibleSelectors = [
      'text=Identifiers',
      '[data-test-id="identifiers-section"]',
      'h2:has-text("Identifiers")',
      'h3:has-text("Identifiers")',
      '.identifiers-section',
      '#identifiers'
    ];

    let identifiersSectionFound = false;
    let usedSelector = '';

    for (const selector of possibleSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        identifiersSectionFound = true;
        usedSelector = selector;
        console.log(`✓ Found Identifiers section with selector: ${selector}`);
        break;
      }
    }

    if (!identifiersSectionFound) {
      console.error('✗ WARNING: Could not find Identifiers section');
      console.error('  Checked selectors:', possibleSelectors.join(', '));
    }

    await page.screenshot({
      path: 'playwright-report/bug-investigation/05-identifiers-section.png',
      fullPage: true
    });
    console.log('');

    // Step 7: Check if KvK 95944192 is visible
    console.log('Step 7: Checking if KvK 95944192 is visible...');

    const kvkNumber = page.locator('text=95944192').first();
    const isKvkVisible = await kvkNumber.isVisible({ timeout: 5000 }).catch(() => false);

    if (isKvkVisible) {
      console.log('✅ SUCCESS: KvK 95944192 IS VISIBLE!');
      console.log('  This means the API has the data and UI displays it correctly.');
      console.log('  Bug report was likely stale or already fixed.');

      await page.screenshot({
        path: 'playwright-report/bug-investigation/SUCCESS-kvk-visible.png',
        fullPage: true
      });
    } else {
      console.error('✗ BUG CONFIRMED: KvK 95944192 is NOT VISIBLE');
      console.error('  This confirms the user\'s bug report.');

      await page.screenshot({
        path: 'playwright-report/bug-investigation/BUG-kvk-not-visible.png',
        fullPage: true
      });
    }
    console.log('');

    // Step 8: Capture what identifiers ARE visible (if any)
    console.log('Step 8: Capturing visible identifiers...');

    // Try to find any identifier-like patterns (numbers, codes)
    const pageContent = await page.textContent('body');

    // Look for KvK-like patterns (8 digits)
    const kvkPattern = /\b\d{8}\b/g;
    const foundNumbers = pageContent?.match(kvkPattern) || [];

    if (foundNumbers.length > 0) {
      console.log('  Found 8-digit numbers on page:', foundNumbers.slice(0, 10));
      console.log('  Total 8-digit numbers found:', foundNumbers.length);
    } else {
      console.log('  No 8-digit numbers found on page');
    }

    // Check if there's an "empty state" message
    const emptyStateMessages = [
      'No identifiers',
      'No records found',
      'Add your first identifier',
      'No data available'
    ];

    for (const message of emptyStateMessages) {
      if (await page.locator(`text=${message}`).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ⚠️ Found empty state message: "${message}"`);
      }
    }

    await page.screenshot({
      path: 'playwright-report/bug-investigation/06-visible-identifiers.png',
      fullPage: true
    });
    console.log('');

    // Step 9: Capture network requests for identifiers API
    console.log('Step 9: Checking network requests for identifiers API...');

    // Reload page to capture fresh network requests
    const identifierRequests: any[] = [];

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/identifiers') || url.includes('/entities/')) {
        identifierRequests.push({
          url,
          status: response.status(),
          ok: response.ok()
        });

        console.log(`  API Request: ${response.status()} ${url}`);

        // Try to capture response body if it's an identifiers endpoint
        if (url.includes('/identifiers')) {
          try {
            const body = await response.json();
            console.log('  Response body:', JSON.stringify(body, null, 2));
          } catch (e) {
            console.log('  Could not parse response body as JSON');
          }
        }
      }
    });

    console.log('  Reloading page to capture network requests...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('  Network requests captured:', identifierRequests.length);
    console.log('');

    // Step 10: Final verdict
    console.log('========================================');
    console.log('Bug Investigation Summary');
    console.log('========================================');
    console.log('Portal URL:', page.url());
    console.log('Contargo found:', identifiersSectionFound ? 'YES' : 'NO');
    console.log('Identifiers section found:', identifiersSectionFound ? 'YES' : 'NO');
    console.log('KvK 95944192 visible:', isKvkVisible ? 'YES ✅' : 'NO ✗');
    console.log('Network requests:', identifierRequests.length);
    console.log('');

    if (!isKvkVisible) {
      console.log('🔴 ROOT CAUSE ANALYSIS NEEDED:');
      console.log('  1. Check API test results (run investigate-contargo-kvk.sh)');
      console.log('  2. If API has the identifier → Frontend display bug');
      console.log('  3. If API missing the identifier → Backend/script issue');
      console.log('');
      console.log('📸 Screenshots saved to: playwright-report/bug-investigation/');
    }

    console.log('========================================');

    // Fail the test if KvK is not visible (this confirms the bug)
    expect(isKvkVisible).toBe(true);
  });
});
