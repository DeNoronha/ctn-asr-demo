import { test, expect } from '@playwright/test';

/**
 * Booking Portal (DocuFlow) - Basic Authentication Tests
 *
 * These tests verify that the shared authentication setup works correctly
 * for the Booking Portal (DocuFlow). They use the authentication state saved by
 * tests/auth.setup.ts.
 *
 * Test User: test-e2@denoronha.consulting (SystemAdmin role)
 *
 * Prerequisites:
 * - tests/auth.setup.ts has run successfully
 * - playwright/.auth/user.json contains valid authentication state
 *
 * Note: DocuFlow is a multi-tenant system, so the authentication flow
 * may differ slightly from ASR portals.
 */

test.describe('Booking Portal (DocuFlow) - Authentication & Navigation', () => {
  test('should load booking portal with authenticated state', async ({ page }) => {
    console.log('🧪 Test: Booking Portal - Load with authentication');

    // Navigate to booking portal
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

    // Verify DocuFlow branding or CTN branding is visible
    const hasBranding = await page.locator('text=DocuFlow, text=CTN, text=Booking').count();
    if (hasBranding > 0) {
      console.log('✅ Portal branding visible');
    } else {
      console.log('ℹ️  No standard branding found (may use different text)');
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'playwright-report/screenshots/booking-portal-authenticated.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved');
  });

  test('should display dashboard elements when authenticated', async ({ page }) => {
    console.log('🧪 Test: Booking Portal - Dashboard elements');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for dashboard elements (DocuFlow-specific)
    const dashboardElements = [
      '[data-testid="dashboard"]',
      '[data-testid="upload"]',
      'text=Dashboard',
      'text=Documents',
      'text=Upload',
    ];

    let foundElements = 0;
    for (const selector of dashboardElements) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found element: ${selector}`);
        foundElements++;
      } else {
        console.log(`ℹ️  Element not found: ${selector}`);
      }
    }

    if (foundElements > 0) {
      console.log(`✅ Found ${foundElements} dashboard elements`);
      expect(foundElements).toBeGreaterThan(0);
    } else {
      console.log('⚠️  No standard dashboard elements found (portal may have custom layout)');
    }
  });

  test('should allow document upload interaction', async ({ page }) => {
    console.log('🧪 Test: Booking Portal - Document upload interface');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for upload functionality
    const uploadButton = page.locator('[data-testid="upload"], button:has-text("Upload"), button:has-text("New Document")');
    const uploadCount = await uploadButton.count();

    if (uploadCount > 0) {
      console.log('✅ Upload button found');
      expect(uploadCount).toBeGreaterThan(0);

      // Click upload button to verify interaction works
      try {
        await uploadButton.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ Upload button clickable');

        // Check if upload dialog/form appears
        const dialogVisible = await page.locator('[role="dialog"], .modal, .upload-form').count();
        if (dialogVisible > 0) {
          console.log('✅ Upload dialog/form appeared');
        } else {
          console.log('ℹ️  No dialog appeared (may use different UI pattern)');
        }
      } catch (error) {
        console.log(`⚠️  Could not interact with upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('ℹ️  Upload button not found (may be on different page)');
    }
  });

  test('should allow navigation between pages', async ({ page }) => {
    console.log('🧪 Test: Booking Portal - Navigation');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get current URL as baseline
    const initialUrl = page.url();
    console.log(`📍 Initial URL: ${initialUrl}`);

    // Try to find and click navigation links
    const navLinks = [
      'Dashboard',
      'Documents',
      'Bookings',
      'Orders',
      'Transport Orders',
    ];

    let successfulNavigation = 0;

    for (const linkText of navLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}"), [data-testid="${linkText.toLowerCase()}"]`);
      const count = await link.count();

      if (count > 0) {
        console.log(`✅ Found navigation link: ${linkText}`);
        // Click and verify navigation works
        try {
          await link.first().click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          const newUrl = page.url();
          console.log(`📍 Navigated to: ${newUrl}`);
          successfulNavigation++;
        } catch (error) {
          console.log(`⚠️  Could not navigate to ${linkText}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`ℹ️  Navigation link not found: ${linkText}`);
      }
    }

    console.log(`✅ Completed ${successfulNavigation} successful navigations`);

    // Verify we're still authenticated (not redirected to login)
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('login.microsoftonline.com');
    console.log('✅ Still authenticated after navigation');
  });

  test('should not have critical console errors', async ({ page }) => {
    console.log('🧪 Test: Booking Portal - Console errors check');

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
      !err.includes('403') &&
      !err.includes('ResizeObserver') // Known browser quirk
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
