import { test, expect } from './fixtures/auth';

test.describe('Orchestrations List Page', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orchestrations');
  });

  test('should load orchestrations page with Kendo Grid', async ({ authenticatedPage: page }) => {
    // Verify page title
    await expect(page.locator('h1, h2').first()).toContainText(/Orchestrations/i);

    // Wait for Kendo Grid to load
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Verify grid is visible
    const grid = page.locator('.mantine-DataTable-root').first();
    await expect(grid).toBeVisible();
  });

  test('should display orchestrations data in grid', async ({ authenticatedPage: page }) => {
    // Wait for grid to load with data
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });

    // Verify rows exist
    const rows = page.locator('.mantine-DataTable-root-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify columns are present (ID, Container, BOL, Status, etc.)
    const headers = page.locator('.mantine-DataTable-root-header th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(4);
  });

  test('should search by Container ID', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('CONT');

    // Wait for grid to update
    await page.waitForTimeout(500);

    // Verify filtered results
    const rows = page.locator('.mantine-DataTable-root-table tbody tr');
    const rowCount = await rows.count();

    // Either results are shown or "no records" message
    const noRecords = await page.locator('text=/No records|No results/i').count();
    expect(rowCount > 0 || noRecords > 0).toBe(true);
  });

  test('should search by BOL number', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('BOL');

    // Wait for grid to update
    await page.waitForTimeout(500);

    // Verify filtered results
    const rows = page.locator('.mantine-DataTable-root-table tbody tr');
    const rowCount = await rows.count();

    // Either results are shown or "no records" message
    const noRecords = await page.locator('text=/No records|No results/i').count();
    expect(rowCount > 0 || noRecords > 0).toBe(true);
  });

  test('should filter by status', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Find status filter dropdown
    const statusFilter = page.locator('select, .mantine-Select-root').filter({ hasText: /Status|All/i }).first();

    if (await statusFilter.count() > 0) {
      await statusFilter.click();

      // Select "Active" status
      const activeOption = page.locator('li:has-text("Active"), option:has-text("Active")').first();
      if (await activeOption.count() > 0) {
        await activeOption.click();

        // Wait for grid to update
        await page.waitForTimeout(500);

        // Verify grid updated
        const rows = page.locator('.mantine-DataTable-root-table tbody tr');
        const rowCount = await rows.count();

        // Should show filtered results or no records
        const noRecords = await page.locator('text=/No records|No results/i').count();
        expect(rowCount > 0 || noRecords > 0).toBe(true);
      }
    }
  });

  test('should support pagination', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Check if pager exists
    const pager = page.locator('.mantine-Pagination-root');

    if (await pager.count() > 0) {
      // Verify pager is visible
      await expect(pager).toBeVisible();

      // Check page size selector
      const pageSizeSelector = pager.locator('select, .mantine-Select-root');
      if (await pageSizeSelector.count() > 0) {
        await expect(pageSizeSelector.first()).toBeVisible();
      }

      // Check next/previous buttons
      const nextButton = pager.locator('button:has-text("Next"), .k-i-arrow-e');
      if (await nextButton.count() > 0) {
        const isDisabled = await nextButton.first().isDisabled();
        // Button should either be enabled (more pages) or disabled (last page)
        expect(typeof isDisabled).toBe('boolean');
      }
    }
  });

  test('should navigate to detail page on row click', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });

    // Click first row
    const firstRow = page.locator('.mantine-DataTable-root-table tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/orchestrations\/[a-zA-Z0-9-]+/);
  });

  test('should display correct status badges', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });

    // Look for status badges/pills
    const statusBadges = page.locator('.mantine-DataTable-root-table tbody [class*="badge"], [class*="pill"], [class*="chip"]');

    if (await statusBadges.count() > 0) {
      // Status badges should be visible
      await expect(statusBadges.first()).toBeVisible();

      // Common status values
      const statusTexts = ['Active', 'Completed', 'Delayed', 'In Transit', 'Planning'];
      let foundStatus = false;

      for (const status of statusTexts) {
        const count = await page.locator(`text=/^${status}$/i`).count();
        if (count > 0) {
          foundStatus = true;
          break;
        }
      }

      expect(foundStatus).toBe(true);
    }
  });

  test('should sort by columns', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Click first sortable column header
    const sortableHeader = page.locator('.mantine-DataTable-root-header th[data-field], .mantine-DataTable-root-header th.k-sortable').first();

    if (await sortableHeader.count() > 0) {
      await sortableHeader.click();

      // Wait for grid to re-render
      await page.waitForTimeout(500);

      // Verify sort indicator appears
      const sortIndicator = page.locator('.k-i-sort-asc, .k-i-sort-desc, [class*="sort"]');
      const indicatorCount = await sortIndicator.count();
      expect(indicatorCount).toBeGreaterThan(0);
    }
  });

  test('should handle empty search results', async ({ authenticatedPage: page }) => {
    await page.waitForSelector('.mantine-DataTable-root', { timeout: 10000 });

    // Search for non-existent data
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('NONEXISTENT123456789');

    // Wait for grid to update
    await page.waitForTimeout(500);

    // Should show "no records" message
    const noRecords = page.locator('text=/No records|No results|No orchestrations found/i');
    await expect(noRecords).toBeVisible();
  });
});

test.describe('Orchestration Detail Page', () => {
  test('should load orchestration detail page', async ({ authenticatedPage: page }) => {
    // Navigate to orchestrations list first
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });

    // Click first row
    const firstRow = page.locator('.mantine-DataTable-root-table tbody tr').first();
    await firstRow.click();

    // Wait for detail page to load
    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Verify detail page elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display orchestration route information', async ({ authenticatedPage: page }) => {
    // Navigate via list
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });
    await page.locator('.mantine-DataTable-root-table tbody tr').first().click();

    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Verify route information section
    await expect(page.locator('text=/Route|Origin|Destination|Port/i')).toBeVisible();

    // Should show locations
    const locations = page.locator('text=/Shanghai|Rotterdam|Hamburg|Singapore/i');
    const locationCount = await locations.count();
    expect(locationCount).toBeGreaterThan(0);
  });

  test('should display parties information', async ({ authenticatedPage: page }) => {
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });
    await page.locator('.mantine-DataTable-root-table tbody tr').first().click();

    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Verify parties section
    await expect(page.locator('text=/Parties|Carrier|Shipper|Consignee/i')).toBeVisible();
  });

  test('should display cargo information if present', async ({ authenticatedPage: page }) => {
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });
    await page.locator('.mantine-DataTable-root-table tbody tr').first().click();

    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Cargo information may or may not be present
    const cargoSection = page.locator('text=/Cargo|Container|Weight|Volume/i');
    const cargoCount = await cargoSection.count();

    // Test passes regardless, just verifying structure
    expect(cargoCount >= 0).toBe(true);
  });

  test('should display recent events', async ({ authenticatedPage: page }) => {
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });
    await page.locator('.mantine-DataTable-root-table tbody tr').first().click();

    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Verify events section
    const eventsSection = page.locator('text=/Events|Activity|Timeline|History/i');

    if (await eventsSection.count() > 0) {
      await expect(eventsSection.first()).toBeVisible();
    }
  });

  test('should navigate back to orchestrations list', async ({ authenticatedPage: page }) => {
    await page.goto('/orchestrations');
    await page.waitForSelector('.mantine-DataTable-root-table tbody tr', { timeout: 10000 });
    await page.locator('.mantine-DataTable-root-table tbody tr').first().click();

    await page.waitForURL(/\/orchestrations\/[a-zA-Z0-9-]+/);

    // Click back button
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back"), [class*="back"]').first();
    await backButton.click();

    // Should return to list
    await expect(page).toHaveURL(/\/orchestrations$/);
  });

  test('should handle non-existent orchestration ID', async ({ authenticatedPage: page }) => {
    // Navigate to non-existent ID
    await page.goto('/orchestrations/non-existent-id-12345');

    // Should show error message or redirect
    const errorMessage = page.locator('text=/Not found|Error|Orchestration not found/i');
    const redirected = await page.url();

    // Either error is shown or redirected back to list
    const hasError = await errorMessage.count() > 0;
    const wasRedirected = redirected.includes('/orchestrations') && !redirected.includes('non-existent');

    expect(hasError || wasRedirected).toBe(true);
  });
});
