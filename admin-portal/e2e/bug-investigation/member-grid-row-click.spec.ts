/**
 * Bug Investigation: Member Grid Row Click Not Responding
 *
 * Issue: Clicking on rows in the members grid (eye icon or row itself) does nothing
 * - No console.log output
 * - No alert() popup
 * - No navigation to member details
 *
 * Latest commit: ef6d9fb4 - Added onRowClick handler to Grid component
 *
 * This test will:
 * 1. Navigate to members page
 * 2. Wait for grid to load with data
 * 3. Try clicking on a row
 * 4. Capture console logs, alerts, and any errors
 * 5. Check if member detail view opens
 *
 * Created: 2025-10-30
 */

import { expect, test } from '../../playwright/fixtures';

test.describe('Member Grid Row Click Investigation', () => {
  let consoleLogs: Array<{ type: string; text: string }> = [];
  let alerts: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture all console messages
    consoleLogs = [];
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
      console.log(`[${msg.type().toUpperCase()}]`, msg.text());
    });

    // Capture alert dialogs
    alerts = [];
    page.on('dialog', async (dialog) => {
      alerts.push(dialog.message());
      console.log(`[ALERT] ${dialog.message()}`);
      await dialog.accept();
    });

    // Navigate to admin portal
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should detect click on member grid row', async ({ page }) => {
    console.log('\n=== TEST START ===\n');

    // Navigate to Members page
    console.log('Step 1: Navigate to Members page...');
    await page.locator('.sidebar, .drawer-content').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible({
      timeout: 10000,
    });
    console.log('✓ Members page loaded');

    // Wait for grid to load with data
    console.log('\nStep 2: Wait for grid to load...');
    const grid = page.locator('.mantine-DataTable-root, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Wait for data rows (not header row)
    const dataRows = grid.locator('tbody tr, tbody tr').filter({ hasNot: page.locator('.mantine-DataTable-root-norecords') });
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 });

    const rowCount = await dataRows.count();
    console.log(`✓ Grid loaded with ${rowCount} data rows`);
    expect(rowCount).toBeGreaterThan(0);

    // Get first row data for logging
    const firstRow = dataRows.first();
    const firstRowText = await firstRow.textContent();
    console.log(`\nFirst row content: ${firstRowText?.substring(0, 100)}...`);

    // Take screenshot before click
    await page.screenshot({
      path: 'playwright-report/bug-investigation/before-row-click.png',
      fullPage: true,
    });

    // Clear previous console logs and alerts
    consoleLogs = [];
    alerts = [];

    // Step 3: Try clicking on the row
    console.log('\nStep 3: Attempting to click on first row...');

    // Wait a moment for any event listeners to be attached
    await page.waitForTimeout(1000);

    // Try clicking on the row (onRowClick handler)
    await firstRow.click({ force: true });
    console.log('✓ Click executed on row');

    // Wait to see if anything happens
    await page.waitForTimeout(2000);

    // Take screenshot after click
    await page.screenshot({
      path: 'playwright-report/bug-investigation/after-row-click.png',
      fullPage: true,
    });

    // Step 4: Check for expected behaviors
    console.log('\nStep 4: Checking for expected behaviors...');

    // Check 1: Did we get an alert?
    console.log(`\nAlerts captured: ${alerts.length}`);
    if (alerts.length > 0) {
      console.log('✓ ALERT APPEARED:', alerts);
      expect(alerts[0]).toContain('Row clicked! Member:');
    } else {
      console.log('✗ NO ALERT - onRowClick handler may not be firing');
    }

    // Check 2: Did we get console.log output?
    const rowClickLogs = consoleLogs.filter(log =>
      log.text.includes('Row clicked') || log.text.includes('dataItem')
    );
    console.log(`\nRow click console logs: ${rowClickLogs.length}`);
    if (rowClickLogs.length > 0) {
      console.log('✓ CONSOLE LOGS FOUND:', rowClickLogs);
    } else {
      console.log('✗ NO CONSOLE LOGS - onRowClick handler may not be firing');
    }

    // Check 3: Did we get any errors?
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    console.log(`\nJavaScript errors: ${errorLogs.length}`);
    if (errorLogs.length > 0) {
      console.log('⚠ ERRORS DETECTED:', errorLogs);
    }

    // Check 4: Did member detail view open?
    const memberDetailHeading = page.getByRole('heading', { name: /Member Details|Edit Member/i });
    const memberDetailVisible = await memberDetailHeading.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`\nMember detail view visible: ${memberDetailVisible}`);
    if (memberDetailVisible) {
      console.log('✓ MEMBER DETAIL VIEW OPENED');
    } else {
      console.log('✗ MEMBER DETAIL VIEW DID NOT OPEN');
    }

    // Check 5: Inspect the DOM for onRowClick handler
    console.log('\nStep 5: Inspect DOM for event listeners...');
    const gridElement = await grid.elementHandle();
    if (gridElement) {
      const hasOnRowClick = await page.evaluate((el) => {
        // Check if Grid has onRowClick prop
        const reactProps = Object.keys(el as any).find(key => key.startsWith('__reactProps'));
        if (reactProps) {
          const props = (el as any)[reactProps];
          return {
            hasOnRowClick: typeof props?.onRowClick === 'function',
            hasClickHandler: !!el.onclick,
            eventListeners: 'getEventListeners' in window ? Object.keys((window as any).getEventListeners(el)) : 'Not available'
          };
        }
        return null;
      }, gridElement);
      console.log('Grid element inspection:', JSON.stringify(hasOnRowClick, null, 2));
    }

    console.log('\n=== TEST END ===\n');

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Alerts: ${alerts.length > 0 ? '✓ YES' : '✗ NO'}`);
    console.log(`Console logs: ${rowClickLogs.length > 0 ? '✓ YES' : '✗ NO'}`);
    console.log(`Errors: ${errorLogs.length > 0 ? '⚠ YES' : '✓ NO'}`);
    console.log(`Detail view opened: ${memberDetailVisible ? '✓ YES' : '✗ NO'}`);

    // The test passes if we detected ANY of the expected behaviors
    // If NONE of them happened, the bug is confirmed
    const anyBehaviorDetected = alerts.length > 0 || rowClickLogs.length > 0 || memberDetailVisible;

    if (!anyBehaviorDetected) {
      console.log('\n🚨 BUG CONFIRMED: Row click is not firing any handlers');
      expect.soft(anyBehaviorDetected).toBeTruthy(); // Soft assertion to see full output
    }
  });

  test('should try clicking on action button directly', async ({ page }) => {
    console.log('\n=== TEST START: Direct Button Click ===\n');

    // Navigate to Members page
    await page.locator('.sidebar, .drawer-content').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    // Wait for grid
    const grid = page.locator('.mantine-DataTable-root, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Wait for data rows
    const dataRows = grid.locator('tbody tr, tbody tr').filter({ hasNot: page.locator('.mantine-DataTable-root-norecords') });
    await expect(dataRows.first()).toBeVisible();

    // Clear logs
    consoleLogs = [];
    alerts = [];

    // Try clicking on the eye icon (view button) in the Actions column
    console.log('\nAttempting to click on action button...');

    // Look for the eye icon or "View" text in the first row
    const firstRow = dataRows.first();
    const actionButton = firstRow.locator('button').first(); // First button in row

    const buttonExists = await actionButton.count() > 0;
    console.log(`Action button exists: ${buttonExists}`);

    if (buttonExists) {
      await actionButton.click({ force: true });
      console.log('✓ Clicked on action button');

      await page.waitForTimeout(2000);

      // Check results
      console.log(`\nAlerts: ${alerts.length}`);
      console.log(`Row click logs: ${consoleLogs.filter(log => log.text.includes('Row clicked')).length}`);

      const memberDetailVisible = await page.getByRole('heading', { name: /Member Details|Edit Member/i }).isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`Member detail view: ${memberDetailVisible}`);
    } else {
      console.log('⚠ No action button found in first row');
    }
  });

  test('should inspect grid HTML structure', async ({ page }) => {
    console.log('\n=== TEST START: Inspect Grid Structure ===\n');

    // Navigate to Members page
    await page.locator('.sidebar, .drawer-content').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    // Wait for grid
    const grid = page.locator('.mantine-DataTable-root, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Get the HTML structure of the first few rows
    const gridHTML = await grid.locator('.mantine-DataTable-root-content').innerHTML();
    console.log('\n=== Grid HTML (first 2000 chars) ===');
    console.log(gridHTML.substring(0, 2000));
    console.log('...\n');

    // Check for any overlaying elements that might be blocking clicks
    const firstRow = grid.locator('tbody tr, tbody tr').first();
    const rowBoundingBox = await firstRow.boundingBox();

    if (rowBoundingBox) {
      console.log('\n=== First Row Bounding Box ===');
      console.log(JSON.stringify(rowBoundingBox, null, 2));

      // Check if any elements are overlaying the row
      const elementAtPoint = await page.evaluate((point) => {
        const el = document.elementFromPoint(point.x, point.y);
        return {
          tagName: el?.tagName,
          className: el?.className,
          id: el?.id,
          zIndex: window.getComputedStyle(el as Element).zIndex,
          pointerEvents: window.getComputedStyle(el as Element).pointerEvents
        };
      }, { x: rowBoundingBox.x + 10, y: rowBoundingBox.y + 10 });

      console.log('\n=== Element at row position ===');
      console.log(JSON.stringify(elementAtPoint, null, 2));
    }
  });
});
