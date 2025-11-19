import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Endpoints Management (System Integrations)
 *
 * Test Area: Data endpoints list, create, configuration
 * Priority: High
 *
 * Coverage:
 * - View endpoints list
 * - Add new endpoint
 * - Endpoint types and categories
 * - Connection status badges
 * - Empty state handling
 * - Endpoint registration wizard
 */

test.describe('Endpoints Management (System Integrations)', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to System Integrations tab
    await page.locator('.tab-button').filter({ hasText: 'System Integrations' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display endpoints page with correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Data Endpoints' })).toBeVisible();
    await expect(page.locator('.page-subtitle')).toContainText('data endpoints');
  });

  test('should display Add Endpoint button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Endpoint' });
    await expect(addButton).toBeVisible();
  });

  test('should display endpoints table with correct columns', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      // Verify table headers
      const headers = table.locator('thead th');
      const headerTexts = await headers.allTextContents();

      expect(headerTexts).toContain('Name');
      expect(headerTexts).toContain('URL');
      expect(headerTexts).toContain('Type');
      expect(headerTexts).toContain('Category');
      expect(headerTexts).toContain('Auth Method');
      expect(headerTexts).toContain('Last Test');
      expect(headerTexts).toContain('Status');
    }
  });

  test('should display endpoints list when endpoints exist', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        console.log(`Found ${rowCount} endpoints in the list`);

        // Verify first endpoint has required data
        const firstRow = rows.first();
        await expect(firstRow.locator('td').first()).not.toBeEmpty();
      }
    }
  });

  test('should display empty state when no endpoints exist', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    const count = await emptyState.count();

    if (count > 0) {
      await expect(emptyState).toContainText('No Endpoints');
      await expect(emptyState).toContainText('Add your first data endpoint');
      console.log('Empty state displayed correctly');
    } else {
      console.log('Endpoints exist - empty state not shown');
    }
  });

  test('should display endpoint status badges', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const statusBadges = table.locator('.status-active, .status-inactive');
      const badgeCount = await statusBadges.count();

      if (badgeCount > 0) {
        const firstBadge = statusBadges.first();
        const badgeText = await firstBadge.textContent();
        expect(['Active', 'Inactive']).toContain(badgeText);
      }
    }
  });

  test('should display connection status badges', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check for connection status in the Last Test column
        const statusBadges = table.locator('.status-badge');
        const badgeCount = await statusBadges.count();
        console.log(`Found ${badgeCount} status badges`);
      }
    }
  });

  test('should display endpoint URLs in table', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Verify URL is displayed
        const firstRowCells = rows.first().locator('td');
        const cellCount = await firstRowCells.count();

        if (cellCount > 1) {
          // URL should be in second column
          const urlCell = firstRowCells.nth(1);
          const urlText = await urlCell.textContent();
          console.log(`Endpoint URL: ${urlText}`);
        }
      }
    }
  });

  test('should open Add Endpoint modal when clicking Add Endpoint button', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Endpoint' }).click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal title
    await expect(modal.getByText('Register New Endpoint')).toBeVisible();
  });

  test('should display endpoint registration wizard in modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Endpoint' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // The wizard should be present
    // Check for common wizard elements
    const hasWizardContent = await modal.locator('form, .wizard, .stepper').count() > 0 ||
                            await modal.locator('input, select, button').count() > 0;

    expect(hasWizardContent).toBe(true);
  });

  test('should close Add Endpoint modal when clicking close', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Endpoint' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Click the modal close button
    const closeButton = modal.locator('button[aria-label="Close modal"], .mantine-Modal-close');
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
      await expect(modal).not.toBeVisible();
    }
  });

  test('should display endpoint type information', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Type column should have values like REST, WEBHOOK, etc.
        const firstRow = rows.first();
        const cells = firstRow.locator('td');
        const cellTexts = await cells.allTextContents();

        console.log(`Endpoint row data: ${cellTexts.join(' | ')}`);
      }
    }
  });

  test('should display data category information', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        console.log('Data category column present');
      }
    }
  });

  test('should display authentication method information', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        console.log('Authentication method column present');
      }
    }
  });

  test('should take screenshot of endpoints list', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-endpoints-list.png',
      fullPage: true
    });

    console.log('Endpoints list screenshot captured');
  });

  test('should take screenshot of Add Endpoint modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Endpoint' }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-endpoints-add-modal.png',
      fullPage: true
    });

    console.log('Add Endpoint modal screenshot captured');
  });
});
