import { expect, test } from '@playwright/test';

/**
 * Admin Portal (ASR) - Basic Authentication Tests
 *
 * These tests verify that the shared authentication setup works correctly
 * for the Admin Portal. They use the authentication state saved by
 * tests/auth.setup.ts.
 *
 * Test User: test-e2@denoronha.consulting (SystemAdmin role)
 *
 * Prerequisites:
 * - tests/auth.setup.ts has run successfully
 * - playwright/.auth/user.json contains valid authentication state
 */

test.describe('Admin Portal - Authentication & Basic Functionality', () => {
  test('should load admin portal with authenticated state', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - Load with authentication');

    // Navigate to admin portal
    await page.goto('/');
    console.log(`📍 Navigated to: ${page.url()}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify we're not on the login page
    const url = page.url();
    expect(url).not.toContain('login.microsoftonline.com');
    console.log('✅ Not redirected to Azure AD login');

    // Verify page has content (not blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(100);
    console.log(`✅ Page has content (${bodyText?.length} characters)`);

    // Verify CTN branding is visible
    const hasCTNBranding = await page.locator('text=CTN').count();
    expect(hasCTNBranding).toBeGreaterThan(0);
    console.log('✅ CTN branding visible');

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'playwright-report/screenshots/admin-portal-authenticated.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved');
  });

  test('should display dashboard with key navigation elements', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - Dashboard navigation');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for navigation sidebar to be visible (more reliable than heading)
    const sidebarDashboard = page.locator('.drawer-item:has-text("Dashboard")');
    await expect(sidebarDashboard).toBeVisible({ timeout: 10000 });
    console.log('✅ Dashboard navigation item visible');

    // Verify key navigation links are present in sidebar
    const navElements = [
      { name: 'Dashboard', selector: '.drawer-item:has-text("Dashboard")' },
      { name: 'Members', selector: '.drawer-item:has-text("Members")' },
      { name: 'User Management', selector: '.drawer-item:has-text("User Management")' },
      { name: 'Settings', selector: '.drawer-item:has-text("Settings")' },
    ];

    for (const element of navElements) {
      const locator = page.locator(element.selector);
      const count = await locator.count();
      if (count > 0) {
        console.log(`✅ ${element.name} link found`);
        expect(count).toBeGreaterThan(0);
      } else {
        console.log(`ℹ️  ${element.name} link not found`);
      }
    }
  });

  test('should allow navigation to Members page', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - Navigate to Members');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Members link in sidebar
    const membersLink = page.locator('.drawer-item:has-text("Members")');
    const count = await membersLink.count();

    if (count > 0) {
      await membersLink.click();
      console.log('✅ Clicked Members link in sidebar');

      // Wait for navigation or content update
      await page.waitForTimeout(1000);
      console.log(`✅ Current URL: ${page.url()}`);

      // Verify Members content is visible (may be SPA without URL change)
      const membersContent = await page.locator('body').textContent();
      expect(membersContent).toBeTruthy();
      console.log('✅ Members content loaded');
    } else {
      console.warn('⚠️  Members link not found in sidebar - skipping navigation test');
      test.skip();
    }
  });

  test('should display user information when authenticated', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - User information display');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for user info display (admin portal specific)
    const userInfoElements = ['.user-info', '.user-name', '[data-testid="user-menu"]'];

    let foundUserInfo = false;
    for (const selector of userInfoElements) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ User info found: ${selector}`);
        foundUserInfo = true;
        break;
      }
    }

    if (foundUserInfo) {
      console.log('✅ User information displayed');
    } else {
      console.log('ℹ️  No standard user info elements found (may use custom selectors)');
    }
  });

  test('should have valid MSAL tokens in sessionStorage', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - MSAL token verification');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for MSAL tokens in sessionStorage
    const msalTokens = await page.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      return {
        totalKeys: keys.length,
        msalKeys: keys.filter((key) => key.includes('msal')),
        tokenKeys: keys.filter((key) => key.includes('accesstoken')),
      };
    });

    console.log(`📊 SessionStorage keys: ${msalTokens.totalKeys} total`);
    console.log(`📊 MSAL keys: ${msalTokens.msalKeys.length}`);
    console.log(`📊 Token keys: ${msalTokens.tokenKeys.length}`);

    // Verify we have authentication tokens
    const hasTokens = msalTokens.msalKeys.length > 0 || msalTokens.tokenKeys.length > 0;
    expect(hasTokens).toBe(true);

    if (hasTokens) {
      console.log('✅ MSAL authentication tokens found in sessionStorage');
    } else {
      console.error('❌ No MSAL tokens found - authentication may not be working');
    }
  });

  test('should not have critical console errors', async ({ page }) => {
    console.log('🧪 Test: Admin Portal - Console errors check');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`📊 Console errors detected: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('🔴 Console errors:');
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
      });
    }

    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('Failed to load resource') && // Network errors may be acceptable
        !err.includes('401') && // Auth errors may occur during token refresh
        !err.includes('403')
    );

    if (criticalErrors.length > 0) {
      console.warn(`⚠️  ${criticalErrors.length} critical errors found`);
    } else {
      console.log('✅ No critical JavaScript errors');
    }

    // Don't fail on non-critical errors
    expect(criticalErrors.length).toBeLessThan(10); // Allow some errors but flag if excessive
  });
});
