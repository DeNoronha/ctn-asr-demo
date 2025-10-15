import { expect, test } from '../../playwright/fixtures';

/**
 * Admin Portal E2E Tests - Authentication & Authorization
 *
 * Test Area: Azure AD authentication flow and authorization checks
 * Priority: Critical
 *
 * Coverage:
 * - Azure AD login flow
 * - Session persistence
 * - Token refresh
 * - Authorization checks (admin vs member roles)
 * - Logout functionality
 */

test.describe('Authentication & Authorization - Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    // Monitor network failures
    page.on('requestfailed', (request) => {
      console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
  });

  test('should successfully authenticate with Azure AD', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify user is authenticated (check for user info in header)
    await expect(page.locator('.user-info, .user-name')).toBeVisible({ timeout: 10000 });

    // Verify we're not on a login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login.microsoftonline.com');

    console.log('✅ Azure AD authentication successful');
  });

  test('should display authenticated user information', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify user details are displayed
    const userNameElement = page.locator('.user-name, [data-testid="user-name"]');
    await expect(userNameElement).toBeVisible();

    const userName = await userNameElement.textContent();
    expect(userName).toBeTruthy();
    expect(userName?.length).toBeGreaterThan(0);

    console.log(`Authenticated user: ${userName}`);
  });

  test('should display user role correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify role is displayed
    const userRoleElement = page.locator('.user-role, [data-testid="user-role"]');
    await expect(userRoleElement).toBeVisible();

    const userRole = await userRoleElement.textContent();
    expect(userRole).toBeTruthy();

    // Verify it's a valid role
    const validRoles = ['SystemAdmin', 'AssociationAdmin', 'Member'];
    const hasValidRole = validRoles.some(role => userRole?.includes(role));
    expect(hasValidRole).toBe(true);

    console.log(`User role: ${userRole}`);
  });

  test('should have valid Bearer token in API requests', async ({ page }) => {
    let authHeaderFound = false;
    let bearerToken = '';

    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) {
        const headers = request.headers();
        if (headers.authorization?.startsWith('Bearer ')) {
          authHeaderFound = true;
          bearerToken = headers.authorization;
          console.log('✅ Found Bearer token in API request');
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to members to trigger API call
    await page.locator('.sidebar, .drawer-content').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    expect(authHeaderFound).toBe(true);
    expect(bearerToken).toBeTruthy();
    expect(bearerToken.startsWith('Bearer ')).toBe(true);
  });

  test('should maintain session on page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify initial authentication
    await expect(page.locator('.user-name')).toBeVisible();
    const initialUserName = await page.locator('.user-name').textContent();

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });

    // Verify still authenticated after reload
    await expect(page.locator('.user-name')).toBeVisible({ timeout: 10000 });
    const reloadedUserName = await page.locator('.user-name').textContent();

    expect(reloadedUserName).toBe(initialUserName);
    console.log('✅ Session persisted after page reload');
  });

  test('should handle unauthorized access (401) gracefully', async ({ page }) => {
    const unauthorizedResponses: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() === 401) {
        unauthorizedResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to different sections
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Verify no unauthorized responses
    expect(unauthorizedResponses.length).toBe(0);

    if (unauthorizedResponses.length > 0) {
      console.error('Unauthorized requests found:', unauthorizedResponses);
    } else {
      console.log('✅ No unauthorized (401) responses detected');
    }
  });

  test('should display logout button', async ({ page }) => {
    await page.goto('/');

    // Look for logout/sign out button
    const logoutButton = page.locator('button[title="Sign out"], button:has-text("Sign out"), button:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: 5000 });

    console.log('✅ Logout button is visible');
  });

  test('should have admin-only features visible for admin role', async ({ page }) => {
    await page.goto('/');

    // Check user role
    const userRole = await page.locator('.user-role').textContent();

    if (userRole?.includes('Admin')) {
      // Navigate to members
      await page.locator('.sidebar').getByText('Members', { exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();

      // Verify "Register New Member" button exists (admin-only feature)
      const registerButton = page.getByRole('button', { name: /Register New Member/i });
      await expect(registerButton).toBeVisible({ timeout: 5000 });

      console.log('✅ Admin-only features are visible');
    } else {
      console.log('⏭️ User is not admin, skipping admin-only feature check');
    }
  });

  test('should verify sessionStorage contains MSAL tokens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check sessionStorage for MSAL entries
    const msalEntries = await page.evaluate(() => {
      const entries: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.includes('msal')) {
          entries.push(key);
        }
      }
      return entries;
    });

    expect(msalEntries.length).toBeGreaterThan(0);
    console.log(`✅ Found ${msalEntries.length} MSAL sessionStorage entries`);
  });

  test('should not expose sensitive data in browser console', async ({ page }) => {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /private[_-]?key/i,
      /access[_-]?token/i,
    ];

    const consoleMessages: string[] = [];

    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for sensitive data in console
    const exposedData = consoleMessages.filter(msg =>
      sensitivePatterns.some(pattern => pattern.test(msg))
    );

    if (exposedData.length > 0) {
      console.warn('⚠️ Potentially sensitive data in console:', exposedData);
    } else {
      console.log('✅ No sensitive data exposed in console');
    }

    // This is a warning, not a hard failure
    expect(exposedData.length).toBe(0);
  });
});
