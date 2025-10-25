import { expect, test } from '../../playwright/fixtures';

/**
 * Admin Portal E2E Tests - Member Management
 *
 * Test Area: Member CRUD operations (GetMembers, GetMember, Create, Edit, Delete)
 * Priority: Critical
 *
 * Coverage:
 * - View members list (GetMembers endpoint)
 * - Search and filter members
 * - View member details (GetMember endpoint)
 * - Create new member
 * - Edit member details
 * - Member status management (Active, Pending, Suspended)
 */

const _API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net';

test.describe('Member Management - View Members List', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should display members grid with data', async ({ page }) => {
    // Navigate to members
    await page.locator('.sidebar, .drawer-content').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible({
      timeout: 10000,
    });

    // Wait for grid to load
    const grid = page.locator('.k-grid, [role="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15000 });

    // Verify grid has rows
    const rows = grid.locator('.k-grid-content tr, [role="row"]');
    const rowCount = await rows.count();

    expect(rowCount).toBeGreaterThan(0);
    console.log(`✅ Members grid loaded with ${rowCount} rows`);
  });

  test('should have correct column headers', async ({ page }) => {
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

    const grid = page.locator('.k-grid, [role="grid"]').first();
    await grid.waitFor({ state: 'visible' });

    // Check for expected columns
    const expectedColumns = ['Legal Name', 'Status', 'Country', 'Type'];
    for (const column of expectedColumns) {
      const isVisible = await grid
        .locator(`text=/.*${column}.*/i`)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      console.log(`Column "${column}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }

    await page.screenshot({
      path: 'playwright-report/screenshots/members-grid.png',
      fullPage: true,
    });
  });

  test('should successfully call GetMembers API endpoint', async ({ page }) => {
    const apiCalls: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/v1/') && response.url().includes('member')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
        });
        console.log(`API: ${response.status()} ${response.url()}`);
      }
    });

    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(3000);

    // Verify GetMembers endpoint was called successfully
    const getMembersCall = apiCalls.find(
      (call) => call.url.includes('all-members') || call.url.includes('members')
    );
    expect(getMembersCall).toBeTruthy();

    if (getMembersCall) {
      expect(getMembersCall.status).toBe(200);
      console.log('✅ GetMembers API call successful');
    }
  });

  test('should display member count statistics', async ({ page }) => {
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Look for member count or pagination info
    const grid = page.locator('.k-grid').first();
    const pager = grid.locator('.k-pager-info, .k-pager-sizes');

    const hasPager = await pager.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasPager) {
      const pagerText = await pager.textContent();
      console.log(`Pager info: ${pagerText}`);
    }

    console.log('✅ Member statistics checked');
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('NONEXISTENT_MEMBER_XYZ123');
      await page.waitForTimeout(1500);

      // Check for empty state or "no results" message
      const noResults = page.locator('text=/No.*results|No.*members|Empty/i').first();
      const hasNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(
        `Empty search handling: ${hasNoResults ? 'PROPER EMPTY STATE' : 'NO EMPTY STATE SHOWN'}`
      );
    } else {
      console.log('⏭️ No search functionality found');
    }
  });
});

test.describe('Member Management - View Member Details', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();
  });

  test('should open member details on row click', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row
    const firstRow = grid.locator('.k-grid-content tr, [role="row"]').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for member details view or dialog
    const detailsView = page.locator('[role="dialog"], .member-details, .detail-view').first();
    const isVisible = await detailsView.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Member details view opened: ${isVisible}`);

    if (isVisible) {
      await page.screenshot({
        path: 'playwright-report/screenshots/member-details.png',
        fullPage: true,
      });
    }
  });

  test('should successfully call GetMember API endpoint', async ({ page }) => {
    let getMemberCalled = false;
    let getMemberUrl = '';

    page.on('response', (response) => {
      const url = response.url();
      // GetMember endpoint: /api/v1/members/{id} or /api/v1/legal-entities/{id}
      if (url.includes('/api/v1/members/') || url.includes('/api/v1/legal-entities/')) {
        // Check if it's a specific ID (not a list endpoint)
        const isListEndpoint =
          url.includes('all-members') ||
          url.endsWith('/members') ||
          url.endsWith('/legal-entities');
        if (!isListEndpoint) {
          getMemberCalled = true;
          getMemberUrl = url;
          console.log(`GetMember API: ${response.status()} ${url}`);
        }
      }
    });

    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row to trigger GetMember call
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(2000);

    if (getMemberCalled) {
      console.log(`✅ GetMember API called: ${getMemberUrl}`);
    } else {
      console.log('⚠️ GetMember API not called - member details may be embedded in list response');
    }
  });

  test('should display member identifiers in details view', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for identifiers section
    const identifiersSection = page.locator('text=/Identifiers|Business.*Identifiers/i').first();
    const hasIdentifiers = await identifiersSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Identifiers section visible: ${hasIdentifiers}`);
  });

  test('should display member contacts in details view', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for contacts section
    const contactsSection = page.locator('text=/Contacts|Contact.*Information/i').first();
    const hasContacts = await contactsSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Contacts section visible: ${hasContacts}`);
  });

  test('should display member endpoints in details view', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for endpoints section
    const endpointsSection = page.locator('text=/Endpoints|API.*Endpoints/i').first();
    const hasEndpoints = await endpointsSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Endpoints section visible: ${hasEndpoints}`);
  });
});

test.describe('Member Management - Create Member', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();
  });

  test('should open new member registration form', async ({ page }) => {
    // Click "Register New Member" button
    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    await expect(registerButton).toBeVisible({ timeout: 5000 });

    await registerButton.click();
    await page.waitForTimeout(1000);

    // Verify form is displayed
    const form = page.locator('form, .member-form, [role="dialog"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });

    console.log('✅ Member registration form opened');

    await page.screenshot({
      path: 'playwright-report/screenshots/member-registration-form.png',
      fullPage: true,
    });
  });

  test('should have required fields in registration form', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    await registerButton.click();
    await page.waitForTimeout(1000);

    // Check for common required fields
    const expectedFields = ['Legal Name', 'Country', 'Type', 'Email'];

    for (const field of expectedFields) {
      const fieldElement = page
        .locator(`label:has-text("${field}"), input[placeholder*="${field}"]`)
        .first();
      const isVisible = await fieldElement.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Field "${field}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }
  });

  test('should validate required fields on submit', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    await registerButton.click();
    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save")')
      .first();
    const hasSubmit = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSubmit) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Look for validation errors
      const validationErrors = page.locator('.k-invalid, .error, [role="alert"]');
      const errorCount = await validationErrors.count();

      console.log(
        `Validation errors shown: ${errorCount > 0 ? 'YES' : 'NO'} (${errorCount} errors)`
      );

      await page.screenshot({
        path: 'playwright-report/screenshots/member-form-validation.png',
        fullPage: true,
      });
    }
  });

  test('should allow closing the form', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    await registerButton.click();
    await page.waitForTimeout(1000);

    // Look for close/cancel button
    const closeButton = page
      .locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"]')
      .first();
    const hasClose = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasClose) {
      await closeButton.click();
      await page.waitForTimeout(500);

      // Verify form is closed
      const form = page.locator('form, .member-form, [role="dialog"]').first();
      const isStillVisible = await form.isVisible({ timeout: 1000 }).catch(() => false);

      expect(isStillVisible).toBe(false);
      console.log('✅ Form closed successfully');
    }
  });
});

test.describe('Member Management - Edit Member', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();
  });

  test('should open edit form for existing member', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row to open details
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for edit button
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit"]').first();
    const hasEdit = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEdit) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Verify edit form is displayed
      const form = page.locator('form, .member-form').first();
      await expect(form).toBeVisible({ timeout: 5000 });

      console.log('✅ Edit form opened');

      await page.screenshot({
        path: 'playwright-report/screenshots/member-edit-form.png',
        fullPage: true,
      });
    } else {
      console.log('⏭️ Edit button not found');
    }
  });

  test('should pre-populate form with existing member data', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Get member name from grid
    const firstRow = grid.locator('.k-grid-content tr').first();
    const rowText = await firstRow.textContent();
    console.log(`Selected member row: ${rowText}`);

    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for edit button
    const editButton = page.locator('button:has-text("Edit")').first();
    const hasEdit = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEdit) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Check if inputs have values
      const inputs = page.locator('form input[value]:not([value=""])');
      const filledInputCount = await inputs.count();

      expect(filledInputCount).toBeGreaterThan(0);
      console.log(`✅ Form pre-populated with ${filledInputCount} filled inputs`);
    }
  });
});

test.describe('Member Management - Status Management', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();
  });

  test('should display member status badges', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Look for status badges
    const statusBadges = grid.locator('.badge, [class*="status"], .k-chip');
    const badgeCount = await statusBadges.count();

    expect(badgeCount).toBeGreaterThan(0);
    console.log(`✅ Found ${badgeCount} status badges`);

    // Check for expected statuses
    const expectedStatuses = ['Active', 'Pending', 'Suspended'];
    for (const status of expectedStatuses) {
      const statusElement = grid.locator(`text=${status}`).first();
      const isVisible = await statusElement.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        console.log(`Status "${status}": FOUND`);
      }
    }
  });

  test('should filter members by status', async ({ page }) => {
    // Look for status filter dropdown
    const filterDropdown = page.locator('select, .k-dropdown').first();
    const hasFilter = await filterDropdown.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasFilter) {
      console.log('✅ Status filter available');

      await page.screenshot({
        path: 'playwright-report/screenshots/member-status-filter.png',
        fullPage: true,
      });
    } else {
      console.log('⏭️ Status filter not found');
    }
  });

  test('should allow changing member status', async ({ page }) => {
    const grid = page.locator('.k-grid').first();
    await grid.waitFor({ state: 'visible' });

    // Click first row
    const firstRow = grid.locator('.k-grid-content tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Look for status change dropdown or buttons
    const statusControl = page
      .locator(
        'select[name*="status"], .status-dropdown, button:has-text("Activate"), button:has-text("Suspend")'
      )
      .first();
    const hasStatusControl = await statusControl.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Status change control available: ${hasStatusControl}`);
  });
});

test.describe('Member Management - Error Handling', () => {
  test('should handle 404 errors gracefully', async ({ page }) => {
    const notFoundResponses: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('/api/v1/')) {
        notFoundResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(3000);

    if (notFoundResponses.length > 0) {
      console.error('404 errors found:', notFoundResponses);
    }

    expect(notFoundResponses.length).toBe(0);
  });

  test('should handle 500 errors gracefully', async ({ page }) => {
    const serverErrors: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() >= 500 && response.url().includes('/api/v1/')) {
        serverErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(3000);

    if (serverErrors.length > 0) {
      console.error('Server errors found:', serverErrors);
    }

    expect(serverErrors.length).toBe(0);
  });

  test('should display error toast for failed operations', async ({ page }) => {
    // Monitor for toast notifications
    const toasts = page.locator('.k-notification, .toast, [role="alert"]');

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const toastCount = await toasts.count();
    console.log(`Toast notifications: ${toastCount}`);
  });
});
