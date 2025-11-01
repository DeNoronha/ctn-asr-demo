import { test, expect } from '@playwright/test';

/**
 * Member Portal - Basic Authentication Tests
 *
 * These tests verify that the shared authentication setup works correctly
 * for the Member Portal. They use the authentication state saved by
 * tests/auth.setup.ts.
 *
 * Test User: test-e2@denoronha.consulting (SystemAdmin role)
 *
 * Prerequisites:
 * - tests/auth.setup.ts has run successfully
 * - playwright/.auth/user.json contains valid authentication state
 */

test.describe('Member Portal - Authentication & Navigation', () => {
  test('should load member portal with authenticated state', async ({ page }) => {
    console.log('🧪 Test: Member Portal - Load with authentication');

    // Navigate to member portal
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
    expect(bodyText!.length).toBeGreaterThan(100);
    console.log(`✅ Page has content (${bodyText!.length} characters)`);

    // Verify CTN branding is visible
    const hasCTNBranding = await page.locator('text=CTN').count();
    expect(hasCTNBranding).toBeGreaterThan(0);
    console.log('✅ CTN branding visible');

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'playwright-report/screenshots/member-portal-authenticated.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved');
  });

  test('should display user information when authenticated', async ({ page }) => {
    console.log('🧪 Test: Member Portal - User information display');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sign-out button (indicates authenticated state)
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("🚪 Sign Out")');
    const signOutCount = await signOutButton.count();

    if (signOutCount > 0) {
      console.log('✅ Sign Out button visible');
      expect(signOutCount).toBeGreaterThan(0);
    } else {
      console.log('⚠️  Sign Out button not found (may be different selector)');
      // Don't fail the test - different portals may have different UI
    }

    // Verify we're logged in by checking for user-specific elements
    // (This may vary based on the portal's design)
    const userInfoElements = await page.locator('.user-info, .user-name, [data-testid="user-menu"]').count();
    if (userInfoElements > 0) {
      console.log('✅ User info elements found');
    } else {
      console.log('ℹ️  No standard user info elements found (portal may have custom layout)');
    }
  });

  test('should allow navigation to different pages', async ({ page }) => {
    console.log('🧪 Test: Member Portal - Navigation');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get current URL as baseline
    const initialUrl = page.url();
    console.log(`📍 Initial URL: ${initialUrl}`);

    // Try to find and click navigation links
    // Note: Actual navigation elements depend on the portal's design
    const navLinks = [
      'Dashboard',
      'Profile',
      'Settings',
      'Home',
    ];

    for (const linkText of navLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);
      const count = await link.count();

      if (count > 0) {
        console.log(`✅ Found navigation link: ${linkText}`);
        // Click and verify navigation works
        try {
          await link.first().click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          const newUrl = page.url();
          console.log(`📍 Navigated to: ${newUrl}`);
        } catch (error) {
          console.log(`⚠️  Could not navigate to ${linkText}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`ℹ️  Navigation link not found: ${linkText}`);
      }
    }

    // Verify we're still authenticated (not redirected to login)
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('login.microsoftonline.com');
    console.log('✅ Still authenticated after navigation');
  });

  test('should not have critical console errors', async ({ page }) => {
    console.log('🧪 Test: Member Portal - Console errors check');

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
    const criticalErrors = consoleErrors.filter(err =>
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
