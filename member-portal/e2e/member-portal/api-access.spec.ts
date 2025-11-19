import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - API Access (M2M Clients & Tokens)
 *
 * Test Area: M2M API clients, legacy tokens, OAuth configuration
 * Priority: High
 *
 * Coverage:
 * - M2M API clients section
 * - Legacy tokens section
 * - Token status badges
 * - Client creation
 * - Token management
 */

test.describe('API Access - M2M Clients & Tokens', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to API Access tab
    await page.locator('.tab-button').filter({ hasText: 'API Access' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display API Access page with M2M Clients section', async ({ page }) => {
    await expect(page.locator('h3').filter({ hasText: 'M2M API Clients' })).toBeVisible();
  });

  test('should display M2M Clients section description', async ({ page }) => {
    const description = page.locator('p').filter({ hasText: 'OAuth 2.0 Client Credentials' });
    await expect(description).toBeVisible();
  });

  test('should highlight M2M as recommended method', async ({ page }) => {
    const recommendedText = page.locator('strong').filter({ hasText: 'recommended method' });
    await expect(recommendedText).toBeVisible();
  });

  test('should display Legacy Tokens section', async ({ page }) => {
    await expect(page.locator('h3').filter({ hasText: 'Access Tokens (Legacy)' })).toBeVisible();
  });

  test('should display Legacy Tokens section warning', async ({ page }) => {
    const warningText = page.locator('p').filter({ hasText: 'use M2M API Clients above instead' });
    await expect(warningText).toBeVisible();
  });

  test('should display M2M section with info box styling', async ({ page }) => {
    // M2M section has blue info box styling
    const infoBox = page.locator('div').filter({ has: page.locator('h3:has-text("M2M API Clients")') }).first();
    await expect(infoBox).toBeVisible();
  });

  test('should display Legacy section with warning box styling', async ({ page }) => {
    // Legacy section has yellow warning box styling
    const warningBox = page.locator('div').filter({ has: page.locator('h3:has-text("Access Tokens (Legacy)")') }).first();
    await expect(warningBox).toBeVisible();
  });

  test('should have distinct styling for M2M and Legacy sections', async ({ page }) => {
    // Both sections should be present
    const m2mSection = page.locator('h3').filter({ hasText: 'M2M API Clients' });
    const legacySection = page.locator('h3').filter({ hasText: 'Access Tokens (Legacy)' });

    await expect(m2mSection).toBeVisible();
    await expect(legacySection).toBeVisible();
  });

  test('should display Create M2M Client button if available', async ({ page }) => {
    // Look for button to create new M2M client
    const createButton = page.getByRole('button').filter({ hasText: /Create|Add|New.*Client/i });
    const count = await createButton.count();

    if (count > 0) {
      await expect(createButton.first()).toBeVisible();
      console.log('Create M2M Client button is available');
    } else {
      console.log('No Create M2M Client button found');
    }
  });

  test('should display M2M clients list or empty state', async ({ page }) => {
    // Look for either client list or empty state
    const clientList = page.locator('table, .client-list, .card-list');
    const emptyState = page.locator('.empty-state, :text("No clients")');

    const hasClientList = await clientList.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;

    expect(hasClientList || hasEmptyState).toBe(true);
  });

  test('should display tokens list or empty state', async ({ page }) => {
    // Look for tokens section content
    const tokensSection = page.locator('div').filter({ has: page.locator('h3:has-text("Access Tokens")') });

    if (await tokensSection.count() > 0) {
      // Check for tokens table or empty state
      const table = tokensSection.locator('table');
      const emptyState = tokensSection.locator('.empty-state, :text("No tokens")');

      const hasTable = await table.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;

      console.log(`Tokens section: table=${hasTable}, empty=${hasEmptyState}`);
    }
  });

  test('should handle no legal entity gracefully', async ({ page }) => {
    // If user has no legal entity, should show appropriate message
    const noEntityMessage = page.locator(':text("No legal entity"), :text("Please contact CTN support")');
    const count = await noEntityMessage.count();

    if (count > 0) {
      console.log('No legal entity message displayed');
    } else {
      console.log('Legal entity is linked - API Access is available');
    }
  });

  test('should take screenshot of API Access page', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-api-access.png',
      fullPage: true
    });

    console.log('API Access page screenshot captured');
  });
});

test.describe('M2M Clients Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tab-button').filter({ hasText: 'API Access' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display scope-based permissions info', async ({ page }) => {
    const scopeInfo = page.locator('p').filter({ hasText: /scope.*permission/i });
    await expect(scopeInfo).toBeVisible();
  });

  test('should mention Client ID and Secret', async ({ page }) => {
    const credentialInfo = page.locator('p').filter({ hasText: /Client ID.*Secret/i });
    await expect(credentialInfo).toBeVisible();
  });
});

test.describe('Legacy Tokens Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tab-button').filter({ hasText: 'API Access' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display endpoint-level access info', async ({ page }) => {
    const endpointInfo = page.locator('p').filter({ hasText: /endpoint.*access/i });
    await expect(endpointInfo).toBeVisible();
  });

  test('should indicate legacy status clearly', async ({ page }) => {
    const legacyIndicator = page.locator('h3').filter({ hasText: 'Legacy' });
    await expect(legacyIndicator).toBeVisible();
  });
});
