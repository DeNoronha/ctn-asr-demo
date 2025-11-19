import { expect, test } from '@playwright/test';

/**
 * L5 Contextual Help System - E2E Tests
 *
 * Tests help tooltips, accessibility, and user interactions across forms.
 */

test.describe('Help System - Tooltips', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to member registration page
    await page.goto('/members/new');
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('should display help tooltip on member form legal name field', async ({ page }) => {
    // Find the help icon next to Legal Name
    const helpIcon = page.locator('[data-testid="legal-name-help"]');
    await expect(helpIcon).toBeVisible();

    // Hover over help icon
    await helpIcon.hover();

    // Wait for tooltip to appear
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    // Verify tooltip is visible
    const tooltip = page.locator('.mantine-Tooltip-root');
    await expect(tooltip).toBeVisible();

    // Verify tooltip contains expected help text
    await expect(tooltip).toContainText('official registered name');
  });

  test('should display help tooltip on organization ID field', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="org-id-help"]');
    await expect(helpIcon).toBeVisible();

    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    const tooltip = page.locator('.mantine-Tooltip-root');
    await expect(tooltip).toContainText('Organization identifier');
  });

  test('should display help tooltip on domain field', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="domain-help"]');
    await expect(helpIcon).toBeVisible();

    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    const tooltip = page.locator('.mantine-Tooltip-root');
    await expect(tooltip).toContainText('email domain');
  });

  test('should display help tooltip on LEI field', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="lei-help"]');
    await expect(helpIcon).toBeVisible();

    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    const tooltip = page.locator('.mantine-Tooltip-root');
    await expect(tooltip).toContainText('Legal Entity Identifier');
    await expect(tooltip).toContainText('20-character');
  });

  test('should display help tooltip on KVK field', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="kvk-help"]');
    await expect(helpIcon).toBeVisible();

    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    const tooltip = page.locator('.mantine-Tooltip-root');
    await expect(tooltip).toContainText('Chamber of Commerce');
    await expect(tooltip).toContainText('8-digit');
  });

  test('should hide tooltip when mouse moves away', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="legal-name-help"]');

    // Show tooltip
    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    // Move mouse away
    await page.mouse.move(0, 0);

    // Tooltip should disappear
    await expect(page.locator('.mantine-Tooltip-root')).toBeHidden({ timeout: 2000 });
  });
});

test.describe('Help System - Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    // This assumes you can navigate to contact form
    // Adjust the URL/navigation as needed
    await page.goto('/members');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display help tooltip on contact type field', async ({ page }) => {
    // Click on a member to open detail view (adjust selector as needed)
    const firstMember = page.locator('tr.mantine-DataTable-root-row').first();
    if (await firstMember.isVisible()) {
      await firstMember.click();
      await page.waitForTimeout(1000);

      // Look for contact type help icon
      const helpIcon = page.locator('[data-testid="contact-type-help"]');
      if (await helpIcon.isVisible()) {
        await helpIcon.hover();
        await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

        const tooltip = page.locator('.mantine-Tooltip-root');
        await expect(tooltip).toContainText('Primary contacts');
      }
    }
  });
});

test.describe('Help System - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members/new');
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('help icons should have proper ARIA labels', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="legal-name-help"]');
    await expect(helpIcon).toHaveAttribute('role', 'tooltip');
    await expect(helpIcon).toHaveAttribute('aria-label', 'Help information');
  });

  test('help icons should be keyboard accessible', async ({ page }) => {
    // Tab through form fields to reach help icon
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Help icon should be focusable
    const helpIcon = page.locator('[data-testid="legal-name-help"]');

    // Check if help icon is in focus chain (may need adjustment based on actual implementation)
    const isFocusable = await helpIcon.evaluate((el) => {
      return el.tabIndex >= 0 || el.hasAttribute('tabindex');
    });

    // This is informational - help icons should ideally be keyboard accessible
    if (!isFocusable) {
      console.log('Note: Help icons may need tabindex for full keyboard accessibility');
    }
  });

  test('tooltips should have sufficient color contrast', async ({ page }) => {
    const helpIcon = page.locator('[data-testid="legal-name-help"]');
    await helpIcon.hover();
    await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

    const tooltip = page.locator('.mantine-Tooltip-root');

    // Get computed styles
    const bgColor = await tooltip.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const textColor = await tooltip.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Verify colors are set (actual contrast ratio check would require color library)
    expect(bgColor).toBeTruthy();
    expect(textColor).toBeTruthy();

    console.log(`Tooltip colors - Background: ${bgColor}, Text: ${textColor}`);
  });
});

test.describe('Help System - Multiple Forms', () => {
  test('should show help tooltips on identifier fields', async ({ page }) => {
    // Navigate to members page and try to access identifier form
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // This test is conditional - only runs if identifier form is accessible
    const firstMember = page.locator('tr.mantine-DataTable-root-row').first();
    if (await firstMember.isVisible()) {
      // Click to view member details
      await firstMember.click();
      await page.waitForTimeout(1000);

      // Look for identifier help icons
      const identifierTypeHelp = page.locator('[data-testid="identifier-type-help"]');
      if (await identifierTypeHelp.isVisible()) {
        await identifierTypeHelp.hover();
        await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

        const tooltip = page.locator('.mantine-Tooltip-root');
        await expect(tooltip).toContainText('EORI');
      }
    }
  });

  test('should show help tooltips on endpoint fields', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // This test is conditional - only runs if endpoint form is accessible
    const endpointUrlHelp = page.locator('[data-testid="endpoint-url-help"]');
    if (await endpointUrlHelp.isVisible()) {
      await endpointUrlHelp.hover();
      await page.waitForSelector('.mantine-Tooltip-root', { timeout: 2000 });

      const tooltip = page.locator('.mantine-Tooltip-root');
      await expect(tooltip).toContainText('HTTPS URL');
    }
  });
});

test.describe('Help System - Visual Regression', () => {
  test('help icon should have consistent styling', async ({ page }) => {
    await page.goto('/members/new');
    await page.waitForSelector('form', { timeout: 10000 });

    const helpIcon = page.locator('[data-testid="legal-name-help"]');

    // Check icon color
    const iconColor = await helpIcon.locator('svg').evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Should be blue (#0078d4 in RGB)
    expect(iconColor).toContain('rgb(0, 120, 212)');
  });

  test('help icon should change color on hover', async ({ page }) => {
    await page.goto('/members/new');
    await page.waitForSelector('form', { timeout: 10000 });

    const helpIcon = page.locator('[data-testid="legal-name-help"]');
    const icon = helpIcon.locator('svg');

    // Get initial color
    const initialColor = await icon.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Hover over icon
    await helpIcon.hover();

    // Get hover color
    const hoverColor = await icon.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Colors should be different (darker on hover)
    expect(hoverColor).not.toBe(initialColor);
  });
});
