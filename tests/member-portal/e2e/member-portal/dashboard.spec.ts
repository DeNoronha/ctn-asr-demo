import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Dashboard
 *
 * Test Area: Dashboard overview, statistics, organization info
 * Priority: High
 *
 * Coverage:
 * - Dashboard loads correctly
 * - Statistics/metrics display
 * - Organization information
 * - Recent activity section
 * - Quick navigation
 * - Authentication tier display
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard as default view after login', async ({ page }) => {
    // Verify Dashboard tab is active
    const dashboardTab = page.locator('.tab-button').filter({ hasText: 'Dashboard' });
    await expect(dashboardTab).toHaveClass(/active/);

    // Verify dashboard content is visible
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('should display welcome message with page subtitle', async ({ page }) => {
    await expect(page.locator('.page-subtitle').first()).toContainText('Welcome back');
  });

  test('should display organization status card', async ({ page }) => {
    // Find the stat card with Organization Status
    const statusCard = page.locator('.stat-card').filter({ hasText: 'Organization Status' });
    await expect(statusCard).toBeVisible();

    // Verify status badge exists
    const statusBadge = statusCard.locator('.status-badge');
    await expect(statusBadge).toBeVisible();

    // Verify membership level is shown
    await expect(statusCard).toContainText(/Membership:/);
  });

  test('should display authentication tier card', async ({ page }) => {
    // The tier card may or may not be present depending on data
    const tierCard = page.locator('.stat-card').filter({ hasText: 'Authentication Tier' });

    // Check if tier card exists (data dependent)
    const count = await tierCard.count();
    if (count > 0) {
      await expect(tierCard).toBeVisible();
      // Verify tier badge exists
      const tierBadge = tierCard.locator('.tier-badge');
      await expect(tierBadge).toBeVisible();
      console.log('Authentication tier card is displayed');
    } else {
      console.log('Authentication tier card not displayed (no tier info available)');
    }
  });

  test('should display contacts count stat card', async ({ page }) => {
    const contactsCard = page.locator('.stat-card').filter({ hasText: 'Contacts' });
    await expect(contactsCard).toBeVisible();

    // Verify stat value is a number
    const statValue = contactsCard.locator('.stat-value');
    const value = await statValue.textContent();
    expect(value).toMatch(/^\d+$/);
  });

  test('should display data endpoints count stat card', async ({ page }) => {
    const endpointsCard = page.locator('.stat-card').filter({ hasText: 'Data Endpoints' });
    await expect(endpointsCard).toBeVisible();

    // Verify stat value is a number
    const statValue = endpointsCard.locator('.stat-value');
    const value = await statValue.textContent();
    expect(value).toMatch(/^\d+$/);
  });

  test('should display API tokens count stat card', async ({ page }) => {
    const tokensCard = page.locator('.stat-card').filter({ hasText: 'API Tokens' });
    await expect(tokensCard).toBeVisible();

    // Verify stat value is a number
    const statValue = tokensCard.locator('.stat-value');
    const value = await statValue.textContent();
    expect(value).toMatch(/^\d+$/);
  });

  test('should display organization information card', async ({ page }) => {
    const orgCard = page.locator('.card').filter({ hasText: 'Organization Information' });
    await expect(orgCard).toBeVisible();

    // Verify essential fields are present
    await expect(orgCard).toContainText('Legal Name:');
    await expect(orgCard).toContainText('Organization ID:');
    await expect(orgCard).toContainText('Domain:');
    await expect(orgCard).toContainText('Member Since:');
  });

  test('should display registry identifiers in organization card', async ({ page }) => {
    const orgCard = page.locator('.card').filter({ hasText: 'Organization Information' });

    // Check if registry identifiers section exists (data dependent)
    const identifiersSection = orgCard.locator('h4').filter({ hasText: 'Registry Identifiers' });
    const count = await identifiersSection.count();

    if (count > 0) {
      await expect(identifiersSection).toBeVisible();
      console.log('Registry identifiers section is displayed');
    } else {
      console.log('No registry identifiers available');
    }
  });

  test('should display recent activity card', async ({ page }) => {
    const activityCard = page.locator('.card').filter({ hasText: 'Recent Activity' });
    await expect(activityCard).toBeVisible();
  });

  test('should display recent endpoints section when endpoints exist', async ({ page }) => {
    // This section only appears if there are endpoints
    const endpointsSection = page.locator('.card').filter({ hasText: 'Recent Endpoints' });
    const count = await endpointsSection.count();

    if (count > 0) {
      await expect(endpointsSection).toBeVisible();
      // Verify list items are shown
      const listItems = endpointsSection.locator('.list-item');
      expect(await listItems.count()).toBeGreaterThan(0);
      console.log('Recent endpoints section is displayed');
    } else {
      console.log('No recent endpoints to display');
    }
  });

  test('should have all navigation tabs visible', async ({ page }) => {
    // Verify all tabs are present
    const tabs = [
      'Dashboard',
      'Organization Profile',
      'Contacts',
      'System Integrations',
      'API Access',
      'DNS Verification',
      'Support'
    ];

    for (const tab of tabs) {
      const tabButton = page.locator('.tab-button').filter({ hasText: tab });
      await expect(tabButton).toBeVisible();
    }
  });

  test('should navigate to Profile when clicking Organization Profile tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(1000);

    // Verify profile view is displayed
    await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
  });

  test('should navigate to Contacts when clicking Contacts tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'Contacts' }).click();
    await page.waitForTimeout(1000);

    // Verify contacts view is displayed
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
  });

  test('should navigate to System Integrations when clicking tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'System Integrations' }).click();
    await page.waitForTimeout(1000);

    // Verify endpoints view is displayed
    await expect(page.getByRole('heading', { name: 'Data Endpoints' })).toBeVisible();
  });

  test('should navigate to API Access when clicking tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'API Access' }).click();
    await page.waitForTimeout(1000);

    // Verify API access view is displayed
    await expect(page.locator('h3').filter({ hasText: 'M2M API Clients' })).toBeVisible();
  });

  test('should navigate to DNS Verification when clicking tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'DNS Verification' }).click();
    await page.waitForTimeout(1000);

    // Verify DNS verification view is displayed
    await expect(page.getByRole('heading', { name: /DNS Verification/ })).toBeVisible();
  });

  test('should navigate to Support when clicking tab', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'Support' }).click();
    await page.waitForTimeout(1000);

    // Verify support view is displayed
    await expect(page.getByRole('heading', { name: 'Support & Resources' })).toBeVisible();
  });

  test('should take screenshot of complete dashboard', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for data to load

    await page.screenshot({
      path: 'playwright-report/screenshots/member-dashboard.png',
      fullPage: true
    });

    console.log('Dashboard screenshot captured');
  });
});
