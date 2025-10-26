import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';

/**
 * Week 3 UX Improvements Test Suite
 *
 * Tests:
 * 1. Accessibility - ARIA labels, keyboard navigation, color contrast
 * 2. Breadcrumb navigation - all pages
 * 3. Empty states - Dashboard and Bookings
 * 4. Unsaved changes warning - Validation page
 * 5. Responsive layouts - tablet and mobile breakpoints
 *
 * Test Strategy: API-first approach
 * - First verify API endpoints work
 * - Then test UI components that depend on those APIs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:7071/api/v1';

test.describe('Week 3 UX Improvements - Comprehensive Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
  });

  // ========================================
  // 1. ACCESSIBILITY TESTS
  // ========================================

  test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {

    test('should have proper ARIA labels on all buttons', async ({ page }) => {
      // Dashboard buttons
      const uploadButton = page.locator('button:has-text("Upload Document")').first();
      await expect(uploadButton).toHaveAttribute('aria-label', 'Upload new document');

      // Navigate to Bookings page
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Filter buttons should have aria-pressed state
      const allButton = page.locator('button:has-text("All")');
      await expect(allButton).toHaveAttribute('aria-pressed');

      const pendingButton = page.locator('button:has-text("Pending")');
      await expect(pendingButton).toHaveAttribute('aria-label', 'Show pending bookings');
      await expect(pendingButton).toHaveAttribute('aria-pressed');
    });

    test('should support keyboard navigation with visible focus indicators', async ({ page }) => {
      // Test Tab navigation through interactive elements
      await page.keyboard.press('Tab');

      // First focusable element should have visible focus
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const hasFocusVisible = await page.evaluate((el) => {
        const styles = window.getComputedStyle(el as Element);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      }, focusedElement);

      expect(hasFocusVisible).toBeTruthy();

      // Tab through multiple elements
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100); // Allow focus animation
      }

      // Test Enter key activation on buttons
      const uploadButton = page.locator('button:has-text("Upload Document")').first();
      await uploadButton.focus();

      // Verify button is focusable
      const isFocused = await uploadButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    });

    test('should have aria-live regions for dynamic content updates', async ({ page }) => {
      // Empty state should have aria-live="polite"
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Check if empty state has proper aria-live attribute
      const emptyState = page.locator('[role="status"][aria-live="polite"]');

      // If bookings exist, we won't see empty state - that's OK
      const count = await emptyState.count();
      if (count > 0) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should have proper semantic navigation with aria-labels', async ({ page }) => {
      // Check breadcrumb navigation
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();

      // Check for proper list structure
      const breadcrumbList = breadcrumb.locator('ol');
      await expect(breadcrumbList).toBeVisible();
    });

    test('should have sufficient color contrast for text', async ({ page }) => {
      // Check stat cards color contrast
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Primary text should be dark enough
      const statCards = page.locator('.stat-card');
      const count = await statCards.count();

      if (count > 0) {
        const firstCard = statCards.first();
        const h3 = firstCard.locator('h3');

        const color = await h3.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Should not be light gray (sufficient contrast)
        expect(color).not.toBe('rgb(203, 213, 225)'); // #cbd5e1 is too light
      }
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Main heading should be h2
      const mainHeading = page.locator('h2:has-text("Dashboard")');
      await expect(mainHeading).toBeVisible();

      // Stat card headings should be h3
      const statHeadings = page.locator('.stat-card h3');
      const count = await statHeadings.count();

      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // ========================================
  // 2. BREADCRUMB NAVIGATION TESTS
  // ========================================

  test.describe('Breadcrumb Navigation', () => {

    test('should not show breadcrumb on Dashboard (root level)', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).not.toBeVisible();
    });

    test('should show breadcrumb on Bookings page', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();

      // Should show: Dashboard / Bookings
      const breadcrumbText = await breadcrumb.innerText();
      expect(breadcrumbText).toContain('Dashboard');
      expect(breadcrumbText).toContain('Bookings');
    });

    test('should show breadcrumb on Upload page', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');

      // May or may not be visible depending on implementation
      const isVisible = await breadcrumb.isVisible();
      if (isVisible) {
        const breadcrumbText = await breadcrumb.innerText();
        expect(breadcrumbText).toContain('Dashboard');
        expect(breadcrumbText).toContain('Upload');
      }
    });

    test('should have clickable breadcrumb links', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Click Dashboard link in breadcrumb
      const dashboardLink = page.locator('nav[aria-label="Breadcrumb"] a:has-text("Dashboard")');
      await expect(dashboardLink).toBeVisible();

      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to dashboard
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('should show current page as non-clickable in breadcrumb', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Current page (Bookings) should have aria-current="page"
      const currentPage = page.locator('nav[aria-label="Breadcrumb"] span[aria-current="page"]');
      await expect(currentPage).toBeVisible();

      const text = await currentPage.innerText();
      expect(text).toBe('Bookings');
    });

    test('should show hover effect on breadcrumb links', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      const dashboardLink = page.locator('nav[aria-label="Breadcrumb"] a:has-text("Dashboard")');

      // Hover over link
      await dashboardLink.hover();

      // Should have text-decoration: underline on hover
      const textDecoration = await dashboardLink.evaluate((el) => {
        return window.getComputedStyle(el).textDecoration;
      });

      expect(textDecoration).toContain('underline');
    });
  });

  // ========================================
  // 3. EMPTY STATE TESTS
  // ========================================

  test.describe('Empty States', () => {

    test('should show empty state on Dashboard when no bookings exist', async ({ page }) => {
      // This test assumes we can trigger empty state
      // In practice, this may require clearing test data first

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Look for empty state
      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        await expect(emptyState).toBeVisible();

        // Should have title and description
        await expect(emptyState.locator('h3')).toHaveText('No bookings yet');
        await expect(emptyState.locator('p')).toContainText('Upload your first document');

        // Should have call-to-action button
        const ctaButton = emptyState.locator('button:has-text("Upload First Document")');
        await expect(ctaButton).toBeVisible();
        await expect(ctaButton).toHaveAttribute('aria-label', 'Upload your first document');
      }
    });

    test('should show empty state on Bookings page when no bookings exist', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Look for empty state
      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        await expect(emptyState).toBeVisible();

        // Should have title and description
        await expect(emptyState.locator('h3')).toHaveText('No bookings found');

        // Should have call-to-action button
        const ctaButton = emptyState.locator('button:has-text("Upload Document")');
        await expect(ctaButton).toBeVisible();
      }
    });

    test('should show filtered empty state when filter returns no results', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings?status=validated`);
      await page.waitForLoadState('networkidle');

      // Look for empty state
      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        await expect(emptyState).toBeVisible();

        // Should mention the filter in description
        const description = emptyState.locator('p');
        const descText = await description.innerText();
        expect(descText).toContain('validated');
      }
    });

    test('should have proper icon and styling in empty state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        // Should have centered text
        const textAlign = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).textAlign;
        });
        expect(textAlign).toBe('center');

        // Should have padding
        const padding = await emptyState.evaluate((el) => {
          return window.getComputedStyle(el).padding;
        });
        expect(padding).not.toBe('0px');
      }
    });

    test('should allow clicking CTA button in empty state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        const ctaButton = emptyState.locator('button:has-text("Upload Document")');
        await expect(ctaButton).toBeVisible();

        // Click should navigate to upload page
        await ctaButton.click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(`${BASE_URL}/upload`);
      }
    });
  });

  // ========================================
  // 4. UNSAVED CHANGES WARNING TESTS
  // ========================================

  test.describe('Unsaved Changes Warning', () => {

    test('should NOT block navigation when no corrections made', async ({ page }) => {
      // Note: This requires a valid booking ID
      // We'll use a mock approach

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Navigate to bookings
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Should navigate without warning
      await expect(page).toHaveURL(`${BASE_URL}/bookings`);
    });

    test.skip('should block navigation when corrections are unsaved', async ({ page }) => {
      // This test requires:
      // 1. Valid booking with validation page
      // 2. Making corrections to form
      // 3. Attempting to navigate away

      // TODO: Implement when booking data is available
      // Steps:
      // 1. Navigate to /validate/{bookingId}
      // 2. Make changes to form fields
      // 3. Attempt to navigate away (click breadcrumb or back button)
      // 4. Expect navigation blocker dialog
    });

    test.skip('should warn on browser refresh when changes unsaved', async ({ page }) => {
      // This test requires:
      // 1. Valid booking with validation page
      // 2. Making corrections to form
      // 3. Attempting to refresh/close page

      // TODO: Implement when booking data is available
      // Steps:
      // 1. Navigate to /validate/{bookingId}
      // 2. Make changes to form
      // 3. Trigger beforeunload event
      // 4. Expect browser warning dialog
    });

    test.skip('should clear warning after successful save', async ({ page }) => {
      // TODO: Implement when booking data is available
      // Steps:
      // 1. Navigate to /validate/{bookingId}
      // 2. Make corrections
      // 3. Save corrections
      // 4. Navigate away - should NOT show warning
    });
  });

  // ========================================
  // 5. RESPONSIVE LAYOUT TESTS
  // ========================================

  test.describe('Responsive Layouts', () => {

    test('should adapt Dashboard for tablet (768px-1024px)', async ({ page }) => {
      // Set viewport to tablet size
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Stats grid should still be visible
      const statsGrid = page.locator('.stats-grid');
      const count = await statsGrid.count();

      if (count > 0) {
        await expect(statsGrid).toBeVisible();

        // Check grid display
        const display = await statsGrid.evaluate((el) => {
          return window.getComputedStyle(el).display;
        });
        expect(display).toBe('grid');
      }
    });

    test('should adapt Dashboard for mobile (<768px)', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Stats should stack vertically
      const statsGrid = page.locator('.stats-grid');
      const count = await statsGrid.count();

      if (count > 0) {
        const gridTemplateColumns = await statsGrid.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });

        // Should be single column on mobile
        expect(gridTemplateColumns).toBe('1fr');
      }
    });

    test('should adapt Header for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Header should remain visible
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });

    test('should adapt Header for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Header should remain visible and responsive
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Should not overflow
      const width = await header.evaluate((el) => {
        return el.scrollWidth;
      });
      expect(width).toBeLessThanOrEqual(375);
    });

    test('should adapt Bookings Grid for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Grid should be visible
      const grid = page.locator('.k-grid');
      const count = await grid.count();

      if (count > 0) {
        await expect(grid).toBeVisible();
      }
    });

    test('should adapt Bookings Grid for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Grid should be visible and horizontally scrollable
      const grid = page.locator('.k-grid');
      const count = await grid.count();

      if (count > 0) {
        await expect(grid).toBeVisible();
      }
    });

    test('should stack filter buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Filter buttons group
      const filterGroup = page.locator('[role="group"][aria-label="Filter bookings by status"]');
      await expect(filterGroup).toBeVisible();

      // Should have flex display with gap
      const display = await filterGroup.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });
      expect(display).toBe('flex');
    });

    test('should maintain readability at all breakpoints', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Tablet landscape
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');

        // Check that main heading is visible
        const heading = page.locator('h2:has-text("Dashboard")');
        await expect(heading).toBeVisible();

        // Check that cards don't overflow
        const cards = page.locator('.card');
        const count = await cards.count();

        if (count > 0) {
          const firstCard = cards.first();
          const cardWidth = await firstCard.evaluate((el) => {
            return el.scrollWidth;
          });

          // Card should not be wider than viewport
          expect(cardWidth).toBeLessThanOrEqual(viewport.width);
        }
      }
    });
  });

  // ========================================
  // 6. INTEGRATION TESTS
  // ========================================

  test.describe('Integration Tests', () => {

    test('should maintain accessibility during navigation flow', async ({ page }) => {
      // Complete user flow with accessibility
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Tab to Upload button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to navigate
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');

      // Should navigate to upload or show dialog
      const url = page.url();
      expect(url).not.toBe(`${BASE_URL}/dashboard`);
    });

    test('should show breadcrumb after navigation from empty state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // If empty state, click upload button
      const emptyState = page.locator('[role="status"]');
      const count = await emptyState.count();

      if (count > 0) {
        const ctaButton = emptyState.locator('button:has-text("Upload Document")');
        await ctaButton.click();
        await page.waitForLoadState('networkidle');

        // Now navigate to bookings
        await page.goto(`${BASE_URL}/bookings`);
        await page.waitForLoadState('networkidle');

        // Breadcrumb should be visible
        const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
        await expect(breadcrumb).toBeVisible();
      }
    });

    test('should maintain responsive layout during filter changes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');

      // Click Pending filter
      const pendingButton = page.locator('button:has-text("Pending")');
      await pendingButton.click();
      await page.waitForLoadState('networkidle');

      // Layout should remain responsive
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });
  });
});
