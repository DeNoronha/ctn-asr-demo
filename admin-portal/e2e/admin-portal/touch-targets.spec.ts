import { expect, test } from '../../playwright/fixtures';

/**
 * Admin Portal E2E Tests - Touch Target Verification (DA-006)
 *
 * Test Area: WCAG 2.1 Level AAA - 2.5.5 Target Size
 * Priority: High
 *
 * Coverage:
 * - All interactive elements meet minimum 44x44px touch target size
 * - Grid action buttons (Edit, Delete icons)
 * - Sidebar navigation items
 * - Form submit buttons
 * - Icon-only buttons
 * - Toolbar buttons
 * - Modal/Dialog buttons
 *
 * Success Criteria:
 * - 100% of interactive elements have minimum 44x44px hit area
 * - Buttons, links, and clickable elements are easily tappable on touch devices
 * - Adequate spacing between touch targets to prevent mis-taps
 */

test.describe('Touch Target Verification - WCAG 2.1 AAA (2.5.5)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should verify sidebar navigation items meet 44px minimum', async ({ page }) => {
    const sidebarItems = page.locator('.admin-sidebar button, .admin-sidebar [role="button"]');
    const count = await sidebarItems.count();

    console.log(`\n🔍 Testing ${count} sidebar navigation items...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const item = sidebarItems.nth(i);
      const isVisible = await item.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await item.boundingBox();
      if (!box) continue;

      const label = await item.getAttribute('aria-label').catch(() => 'Unknown');
      const text = await item.textContent().catch(() => '');

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${label || text}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${label || text}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} sidebar items meet 44px minimum touch target size\n`);
  });

  test('should verify toolbar buttons meet 44px minimum', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const toolbarButtons = page.locator('.grid-toolbar button, .toolbar-left button');
    const count = await toolbarButtons.count();

    console.log(`\n🔍 Testing ${count} toolbar buttons...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const button = toolbarButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => '');
      const text = await button.textContent().catch(() => '');

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${label || text}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${label || text}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} toolbar buttons meet 44px minimum touch target size\n`);
  });

  test('should verify grid action buttons meet 44px minimum', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Wait for grid to load
    const grid = page.locator('.mantine-DataTable-root').first();
    await grid.waitFor({ state: 'visible', timeout: 5000 });

    // Find action buttons in grid rows (Edit, Delete, View Details, etc.)
    const actionButtons = page.locator(
      '.mantine-DataTable-root button, .mantine-DataTable-root [role="button"]'
    );
    const count = await actionButtons.count();

    console.log(`\n🔍 Testing ${count} grid action buttons...`);

    let failedItems = 0;

    for (let i = 0; i < Math.min(count, 20); i++) {
      // Test first 20 to avoid long test
      const button = actionButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => '');
      const title = await button.getAttribute('title').catch(() => '');
      const text = await button.textContent().catch(() => '');

      const identifier = label || title || text || `Button ${i}`;

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All grid action buttons meet 44px minimum touch target size\n`);
  });

  test('should verify form submit buttons meet 44px minimum', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    const hasButton = await registerButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasButton) {
      console.log('⚠️  Register button not visible - skipping form button test');
      return;
    }

    await registerButton.click();
    await page.waitForTimeout(1000);

    // Find all buttons in the form/dialog
    const formButtons = page.locator('form button, [role="dialog"] button');
    const count = await formButtons.count();

    console.log(`\n🔍 Testing ${count} form buttons...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const button = formButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => '');
      const text = await button.textContent().catch(() => '');
      const type = await button.getAttribute('type').catch(() => '');

      const identifier = label || text || `${type} button` || `Button ${i}`;

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} form buttons meet 44px minimum touch target size\n`);

    // Close form
    await page.keyboard.press('Escape');
  });

  test('should verify icon-only buttons meet 44px minimum', async ({ page }) => {
    // Find icon-only buttons (buttons without visible text, only icons)
    const iconButtons = page.locator(
      'button:not(:has-text("")),' +
        'button[aria-label]:not(:has(span:not([class*="icon"]))),' +
        '.icon-button,' +
        '[class*="IconButton"]'
    );
    const count = await iconButtons.count();

    console.log(`\n🔍 Testing ${count} icon-only buttons...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const button = iconButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => '');
      const title = await button.getAttribute('title').catch(() => `Icon button ${i}`);

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${label || title}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${label || title}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} icon-only buttons meet 44px minimum touch target size\n`);
  });

  test('should verify header action buttons meet 44px minimum', async ({ page }) => {
    // Test header buttons (logout, menu toggle, language switcher, etc.)
    const headerButtons = page.locator('.app-header button, .header-right button');
    const count = await headerButtons.count();

    console.log(`\n🔍 Testing ${count} header buttons...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const button = headerButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => '');
      const title = await button.getAttribute('title').catch(() => '');
      const text = await button.textContent().catch(() => '');

      const identifier = label || title || text || `Header button ${i}`;

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${identifier}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} header buttons meet 44px minimum touch target size\n`);
  });

  test('should verify modal/dialog close buttons meet 44px minimum', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const registerButton = page.getByRole('button', { name: /Register New Member/i });
    const hasButton = await registerButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasButton) {
      console.log('⚠️  Register button not visible - skipping dialog test');
      return;
    }

    await registerButton.click();
    await page.waitForTimeout(1000);

    // Find close button in dialog
    const closeButtons = page.locator('[role="dialog"] button[aria-label*="close" i]');
    const count = await closeButtons.count();

    console.log(`\n🔍 Testing ${count} dialog close buttons...`);

    let failedItems = 0;

    for (let i = 0; i < count; i++) {
      const button = closeButtons.nth(i);
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (!box) continue;

      const label = await button.getAttribute('aria-label').catch(() => 'Close button');

      if (box.height < 44 || box.width < 44) {
        console.error(
          `❌ FAILED: "${label}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
        failedItems++;
      } else {
        console.log(
          `✅ PASSED: "${label}" - Size: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
        );
      }
    }

    expect(failedItems).toBe(0);
    console.log(`\n✅ All ${count} dialog close buttons meet 44px minimum touch target size\n`);

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should verify all interactive elements summary', async ({ page }) => {
    // Navigate to Members view for full test
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Get all interactive elements
    const allInteractive = page.locator(
      'button, a[href], input[type="button"], input[type="submit"], [role="button"], [tabindex="0"]'
    );
    const count = await allInteractive.count();

    console.log(`\n📊 Touch Target Summary - Testing ${count} total interactive elements...`);

    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < count; i++) {
      const element = allInteractive.nth(i);
      const isVisible = await element.isVisible({ timeout: 500 }).catch(() => false);

      if (!isVisible) {
        skippedCount++;
        continue;
      }

      const box = await element.boundingBox();
      if (!box) {
        skippedCount++;
        continue;
      }

      if (box.height >= 44 && box.width >= 44) {
        passedCount++;
      } else {
        failedCount++;

        // Log first 5 failures for debugging
        if (failedCount <= 5) {
          const tagName = await element.evaluate((el) => el.tagName);
          const label = await element.getAttribute('aria-label').catch(() => '');
          const text = await element.textContent().catch(() => '');
          console.error(
            `❌ ${tagName}: "${label || text}" - ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`
          );
        }
      }
    }

    console.log('\n📊 Touch Target Test Results:');
    console.log(`   ✅ Passed: ${passedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   ⊘  Skipped (hidden): ${skippedCount}`);
    console.log(`   Total tested: ${count}\n`);

    const passRate = ((passedCount / (passedCount + failedCount)) * 100).toFixed(1);
    console.log(`📈 Pass Rate: ${passRate}%\n`);

    expect(failedCount).toBe(0);
    console.log('✅ All interactive elements meet WCAG 2.1 AAA touch target requirements\n');
  });
});
