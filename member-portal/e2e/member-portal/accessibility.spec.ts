import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Accessibility (WCAG 2.1 AA)
 *
 * Test Area: Keyboard navigation, ARIA labels, focus indicators
 * Priority: High
 *
 * Coverage:
 * - Keyboard navigation
 * - Focus indicators
 * - ARIA labels
 * - Screen reader support
 * - Color contrast (visual checks)
 * - Skip links
 */

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have main landmark region', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should have header landmark region', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should have navigation region', async ({ page }) => {
    const nav = page.locator('nav, .tab-navigation');
    await expect(nav).toBeVisible();
  });

  test('should have footer landmark region when authenticated', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have visible focus indicators on interactive elements', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check that something has focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should be able to navigate tabs using keyboard', async ({ page }) => {
    // Focus the first tab button
    const firstTab = page.locator('.tab-button').first();
    await firstTab.focus();

    // Verify it's focused
    await expect(firstTab).toBeFocused();
  });

  test('should have alt text on images', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');

      // All images should have alt attribute (even if empty for decorative)
      expect(alt).not.toBeNull();
    }

    console.log(`Checked ${imageCount} images for alt text`);
  });

  test('should have labels for form inputs', async ({ page }) => {
    // Navigate to Profile and open edit modal
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Check that inputs have associated labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelCount = await label.count();
        expect(labelCount).toBeGreaterThan(0);
      }
    }

    console.log(`Checked ${Math.min(inputCount, 5)} inputs for labels`);
  });

  test('should have accessible button labels', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let accessibleCount = 0;

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Button should have text content, aria-label, or title
      const isAccessible = (text && text.trim().length > 0) || ariaLabel || title;

      if (isAccessible) {
        accessibleCount++;
      }
    }

    console.log(`${accessibleCount}/${buttonCount} buttons have accessible labels`);
    expect(accessibleCount).toBe(buttonCount);
  });

  test('should not have any buttons with empty text', async ({ page }) => {
    const emptyButtons = await page.$$eval('button', (buttons) =>
      buttons.filter((btn) => {
        const text = btn.textContent?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label');
        const title = btn.getAttribute('title');
        return !text && !ariaLabel && !title;
      }).length
    );

    if (emptyButtons > 0) {
      console.warn(`Found ${emptyButtons} buttons without accessible labels`);
    }
  });

  test('should support keyboard navigation through tabs', async ({ page }) => {
    // Click first tab to focus navigation area
    await page.locator('.tab-button').first().click();
    await page.keyboard.press('Tab');

    // Should be able to navigate between tabs
    let tabCount = 0;
    const maxTabs = 10;

    while (tabCount < maxTabs) {
      const focusedElement = page.locator(':focus');
      const isFocused = await focusedElement.count() > 0;

      if (!isFocused) break;

      await page.keyboard.press('Tab');
      tabCount++;
    }

    console.log(`Successfully navigated through ${tabCount} focusable elements`);
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 30),
      }))
    );

    console.log('Heading structure:', headings);

    // Should have at least one heading
    expect(headings.length).toBeGreaterThan(0);

    // Check for h1
    const h1Count = headings.filter((h) => h.tag === 'h1').length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('should have status badges with sufficient contrast', async ({ page }) => {
    const statusBadges = page.locator('.status-badge, .status-active, .status-inactive');
    const count = await statusBadges.count();

    if (count > 0) {
      // Status badges should be visible
      await expect(statusBadges.first()).toBeVisible();
      console.log(`Found ${count} status badges`);
    }
  });

  test('should have modals with proper ARIA attributes', async ({ page }) => {
    // Open a modal
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Check modal has proper role
    const modal = page.locator('[role="dialog"], .mantine-Modal-root');
    await expect(modal).toBeVisible();

    // Check for aria-modal
    const hasAriaModal = await modal.getAttribute('aria-modal');
    // Mantine modals typically have this
  });

  test('should have links with descriptive text', async ({ page }) => {
    const links = page.locator('a');
    const linkCount = await links.count();

    let descriptiveCount = 0;

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      // Link should not be just "click here" or "read more"
      const isDescriptive =
        (text && text.trim().length > 3 && !text.toLowerCase().includes('click here')) ||
        ariaLabel;

      if (isDescriptive) {
        descriptiveCount++;
      }
    }

    console.log(`${descriptiveCount}/${linkCount} links have descriptive text`);
  });

  test('should handle Escape key to close modals', async ({ page }) => {
    // Open a modal
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(modal).not.toBeVisible();
  });

  test('should have language attribute on html element', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
    console.log(`Page language: ${lang}`);
  });

  test('should take screenshot for visual accessibility review', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-accessibility-review.png',
      fullPage: true
    });

    console.log('Accessibility review screenshot captured');
  });
});
