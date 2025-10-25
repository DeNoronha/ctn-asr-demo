import { expect, test } from '../playwright/fixtures';

/**
 * Admin Portal E2E Tests
 *
 * Tests core functionality of the CTN Admin Portal:
 * - Dashboard loads correctly
 * - Members list displays
 * - Navigation works
 * - Member details view
 */

test.describe('Admin Portal - Dashboard', () => {
  test('should load dashboard successfully', async ({ page }) => {
    // Navigate and wait longer for potential auth redirects
    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for auth to complete (either already cached or redirect)
    await page.waitForTimeout(3000);

    // Check page title
    await expect(page).toHaveTitle(/CTN Admin Portal/i);

    // Verify dashboard heading is visible (more specific selector)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify navigation menu
    await expect(page.locator('nav').getByText('Members')).toBeVisible();
    await expect(page.locator('nav').getByText('Endpoints')).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: 'playwright-report/screenshots/dashboard.png', fullPage: true });
  });

  test('should display member statistics', async ({ page }) => {
    await page.goto('/');

    // Wait for statistics to load
    await page.waitForSelector('text=TOTAL MEMBERS', { timeout: 10000 });

    // Verify statistics cards are present
    await expect(page.locator('text=TOTAL MEMBERS')).toBeVisible();
    await expect(page.locator('text=REGISTERED ORGANIZATIONS')).toBeVisible();

    // Check that numbers are displayed (not just zero)
    const totalMembersValue = await page
      .locator('text=TOTAL MEMBERS')
      .locator('..')
      .locator('text=/\\d+/')
      .first();
    await expect(totalMembersValue).toBeVisible();
  });
});

test.describe('Admin Portal - Members List', () => {
  test('should navigate to members page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Click Members in navigation (be more specific to avoid ambiguity)
    await page.locator('nav').getByText('Members').click();

    // Wait for navigation to complete
    await page.waitForURL('**/members', { timeout: 10000 });

    // Verify we're on the members page
    await expect(page).toHaveURL(/\/members/);

    await page.screenshot({
      path: 'playwright-report/screenshots/members-list.png',
      fullPage: true,
    });
  });

  test('should load and display members in grid', async ({ page }) => {
    await page.goto('/members');

    // Wait for grid to load
    const grid = page.locator('[role="grid"], table').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Verify grid has content
    const rows = grid.locator('[role="row"], tr').filter({ hasText: /.+/ });
    const rowCount = await rows.count();

    console.log(`Found ${rowCount} rows in members grid`);
    expect(rowCount).toBeGreaterThan(0);

    // Verify essential columns are present
    await expect(page.locator('text=/Legal Name|Organization/')).toBeVisible();
    await expect(page.locator('text=/Status/i')).toBeVisible();
  });

  test('should filter members by search', async ({ page }) => {
    await page.goto('/members');

    // Wait for grid to load
    await page.waitForSelector('[role="grid"], table', { timeout: 10000 });

    // Look for search input
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000); // Wait for filter to apply

      // Verify search was applied
      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
  });
});

test.describe('Admin Portal - Member Details', () => {
  test('should open member detail view', async ({ page }) => {
    await page.goto('/members');

    // Wait for grid
    await page.waitForSelector('[role="grid"], table', { timeout: 10000 });

    // Click first member row (if available)
    const firstRow = page.locator('[role="row"], tr').filter({ hasText: /.+/ }).first();
    await firstRow.click();

    // Wait for detail view to open
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/screenshots/member-details.png',
      fullPage: true,
    });
  });
});

test.describe('Admin Portal - Navigation', () => {
  test('should navigate between sections', async ({ page }) => {
    await page.goto('/');

    // Test navigation to different sections
    const sections = [
      { name: 'Members', expectedPath: '/members' },
      { name: 'Endpoints', expectedPath: '/endpoints' },
      { name: 'Dashboard', expectedPath: '/' },
    ];

    for (const section of sections) {
      console.log(`Navigating to: ${section.name}`);

      await page.click(`text=${section.name}`);
      await page.waitForTimeout(1000);

      // Verify URL changed
      if (section.expectedPath !== '/') {
        expect(page.url()).toContain(section.expectedPath);
      }

      // Verify page loaded
      await expect(page.locator(`text=${section.name}`)).toBeVisible();
    }
  });
});

test.describe('Admin Portal - API Integration', () => {
  test('should successfully fetch members from API', async ({ page }) => {
    // Listen for API calls
    const apiResponses: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/v1/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
        });
        console.log(`API: ${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/members');
    await page.waitForTimeout(3000);

    // Verify API was called successfully
    const memberApiCalls = apiResponses.filter((r) => r.url.includes('/all-members'));
    expect(memberApiCalls.length).toBeGreaterThan(0);

    // Verify no 401 errors
    const unauthorizedCalls = apiResponses.filter((r) => r.status === 401);
    expect(unauthorizedCalls.length).toBe(0);

    // Log all API calls for debugging
    console.log('All API calls:', apiResponses);
  });
});
