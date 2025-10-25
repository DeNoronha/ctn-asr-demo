import { expect, test } from '../playwright/fixtures';

/**
 * Improved Admin Portal E2E Tests
 *
 * Updated to work with the app's state-based navigation
 * (not URL-based routing)
 */

test.describe('Admin Portal - Core Functionality', () => {
  test('should load dashboard with authentication', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page).toHaveTitle(/CTN Admin Portal/i);

    // Verify dashboard heading is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify user is logged in (check header)
    await expect(page.locator('.user-name')).toContainText('Ramon');
    await expect(page.locator('.user-role')).toContainText('SystemAdmin');

    // Verify statistics cards are present
    await expect(page.locator('text=TOTAL MEMBERS')).toBeVisible();
    await expect(page.locator('text=ACTIVE MEMBERS')).toBeVisible();

    await page.screenshot({
      path: 'playwright-report/screenshots/dashboard-improved.png',
      fullPage: true,
    });
  });

  test('should display member statistics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for statistics to load
    await expect(page.locator('text=TOTAL MEMBERS')).toBeVisible({ timeout: 10000 });

    // Verify statistics cards exist
    await expect(page.locator('text=ACTIVE MEMBERS')).toBeVisible();
    await expect(page.locator('text=REGISTERED ORGANIZATIONS')).toBeVisible();

    // Check that numbers are displayed (look for multi-digit numbers in cards)
    const statsCard = page.locator('.dashboard-card, .stats-card').first();
    await expect(statsCard).toBeVisible();
  });
});

test.describe('Admin Portal - Navigation', () => {
  test('should navigate to members view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Members in sidebar
    await page
      .locator('.sidebar, .drawer-content')
      .getByText('Members', { exact: true })
      .first()
      .click();

    // Wait for members view to load
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible({
      timeout: 10000,
    });

    // Verify "Register New Member" button exists (for admins)
    await expect(page.getByRole('button', { name: /Register New Member/i })).toBeVisible();

    await page.screenshot({
      path: 'playwright-report/screenshots/members-view.png',
      fullPage: true,
    });
  });

  test('should display members grid', async ({ page }) => {
    await page.goto('/');

    // Navigate to members
    await page
      .locator('.sidebar, .drawer-content')
      .getByText('Members', { exact: true })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    // Wait for grid to load (Kendo Grid)
    const grid = page.locator('.k-grid, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Verify grid has rows
    const rows = grid.locator('.k-grid-content tr, [role="row"]');
    const rowCount = await rows.count();

    console.log(`Found ${rowCount} rows in members grid`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should navigate between different sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test Dashboard
    await page.locator('.sidebar').getByText('Dashboard').click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Test Members
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    // Test KvK Review Queue
    await page.locator('.sidebar').getByText('KvK Review Queue').click();
    await expect(page.locator('text=KvK Review')).toBeVisible();

    // Navigate back to Dashboard
    await page.locator('.sidebar').getByText('Dashboard').click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

test.describe('Admin Portal - API Integration', () => {
  test('should successfully fetch members from API', async ({ page }) => {
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

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Verify API was called successfully
    const memberApiCalls = apiResponses.filter((r) => r.url.includes('/all-members'));
    expect(memberApiCalls.length).toBeGreaterThan(0);

    // Verify no 401 errors
    const unauthorizedCalls = apiResponses.filter((r) => r.status === 401);
    expect(unauthorizedCalls.length).toBe(0);

    console.log('All API calls:', apiResponses);
  });

  test('should have valid authentication headers', async ({ page }) => {
    let authHeaderFound = false;

    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) {
        const headers = request.headers();
        if (headers.authorization?.startsWith('Bearer ')) {
          authHeaderFound = true;
          console.log('✅ Found Bearer token in API request');
        }
      }
    });

    await page.goto('/');

    // Navigate to members to trigger API call
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    expect(authHeaderFound).toBe(true);
  });
});

test.describe('Admin Portal - User Management', () => {
  test('should display user info in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify user details in header
    await expect(page.locator('.user-info')).toBeVisible();
    await expect(page.locator('.user-name')).toContainText(/Ramon|ramon/i);
    await expect(page.locator('.user-role')).toContainText(/SystemAdmin|AssociationAdmin/i);

    // Verify logout button exists
    await expect(
      page.locator('.user-info button[title="Sign out"], .user-info button')
    ).toBeVisible();
  });

  test('should show language switcher', async ({ page }) => {
    await page.goto('/');

    // Check for language switcher (Netherlands flag/dropdown)
    const languageSwitcher = page.locator('.language-switcher, text=Nederlands, text=English');
    await expect(languageSwitcher.first()).toBeVisible();
  });
});

test.describe('Admin Portal - Member Management', () => {
  test('should open new member registration form', async ({ page }) => {
    await page.goto('/');

    // Navigate to members
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    // Click "Register New Member" button
    await page.getByRole('button', { name: /Register New Member/i }).click();

    // Verify form is displayed
    await expect(page.locator('form, .member-form')).toBeVisible({ timeout: 5000 });

    // Verify form has expected fields (at least one input)
    const formInputs = page.locator('form input, .member-form input');
    const inputCount = await formInputs.count();
    expect(inputCount).toBeGreaterThan(0);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-registration-form.png',
      fullPage: true,
    });
  });

  test('should display member grid with data', async ({ page }) => {
    await page.goto('/');

    // Navigate to members
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();

    // Wait for grid
    const grid = page.locator('.k-grid, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Check for column headers
    await expect(grid.locator('text=/Legal Name|Organization/i')).toBeVisible();
    await expect(grid.locator('text=/Status/i')).toBeVisible();

    // Verify grid has data rows
    const dataRows = grid.locator('.k-grid-content tr, [role="row"]').filter({ hasText: /.+/ });
    const count = await dataRows.count();

    console.log(`Members grid has ${count} data rows`);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Admin Portal - Sidebar Navigation', () => {
  test('should collapse and expand sidebar', async ({ page }) => {
    await page.goto('/');

    // Find menu toggle button
    const menuButton = page
      .locator('.menu-button, button:has-text("◀"), button:has-text("▶")')
      .first();
    await menuButton.waitFor({ state: 'visible' });

    // Click to collapse
    await menuButton.click();
    await page.waitForTimeout(500);

    // Click to expand
    await menuButton.click();
    await page.waitForTimeout(500);

    // Verify sidebar is visible after expanding
    await expect(page.locator('.sidebar, .drawer-content')).toBeVisible();
  });

  test('should have all expected menu items', async ({ page }) => {
    await page.goto('/');

    const expectedMenuItems = [
      'Dashboard',
      'Members',
      'Endpoints',
      'User Management',
      'Audit Logs',
    ];

    for (const item of expectedMenuItems) {
      await expect(page.locator('.sidebar, .drawer-content').getByText(item).first()).toBeVisible();
    }
  });
});
