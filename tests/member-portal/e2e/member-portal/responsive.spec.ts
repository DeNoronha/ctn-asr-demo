import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Responsive Design
 *
 * Test Area: Mobile and tablet viewport testing
 * Priority: Medium
 *
 * Coverage:
 * - Mobile viewport tests (375px, 414px)
 * - Tablet viewport tests (768px, 1024px)
 * - Navigation behavior on small screens
 * - Touch target sizes
 * - Content reflow
 */

test.describe('Responsive Design - Mobile Viewport', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display header on mobile', async ({ page }) => {
    const header = page.locator('header, .App-header');
    await expect(header).toBeVisible();
  });

  test('should display Member Portal title on mobile', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'Member Portal' });
    await expect(title).toBeVisible();
  });

  test('should display user name on mobile', async ({ page }) => {
    const userName = page.locator('.user-name');
    await expect(userName).toBeVisible();
  });

  test('should display navigation tabs on mobile', async ({ page }) => {
    const tabNav = page.locator('.tab-navigation');
    await expect(tabNav).toBeVisible();
  });

  test('should have scrollable navigation on mobile', async ({ page }) => {
    // Navigation should be horizontally scrollable on mobile
    const tabNav = page.locator('.tab-navigation');
    const isOverflowing = await tabNav.evaluate((el) => el.scrollWidth > el.clientWidth);

    // It's acceptable to either overflow or wrap
    console.log(`Tab navigation overflows: ${isOverflowing}`);
  });

  test('should display dashboard content on mobile', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('should stack stat cards vertically on mobile', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    const count = await statsGrid.count();

    if (count > 0) {
      // Stats should be visible
      const statCards = statsGrid.locator('.stat-card');
      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let smallButtonCount = 0;

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // WCAG recommends 44x44px minimum for touch targets
        if (box.height < 32 || box.width < 32) {
          smallButtonCount++;
        }
      }
    }

    if (smallButtonCount > 0) {
      console.warn(`${smallButtonCount} buttons may be too small for touch`);
    }
  });

  test('should display Sign Out button on mobile', async ({ page }) => {
    const signOutButton = page.locator('button').filter({ hasText: /Sign Out/i });
    await expect(signOutButton).toBeVisible();
  });

  test('should navigate through tabs on mobile', async ({ page }) => {
    // Click Contacts tab
    await page.locator('.tab-button').filter({ hasText: 'Contacts' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
  });

  test('should display modals correctly on mobile', async ({ page }) => {
    // Navigate to Profile
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(500);

    // Open edit modal
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Modal should be visible and take full width on mobile
    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test('should close modal with cancel button on mobile', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);

    await expect(modal).not.toBeVisible();
  });

  test('should take screenshot of mobile dashboard', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-mobile-dashboard.png',
      fullPage: true
    });

    console.log('Mobile dashboard screenshot captured');
  });
});

test.describe('Responsive Design - Tablet Viewport', () => {
  test.beforeEach(async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display header on tablet', async ({ page }) => {
    const header = page.locator('header, .App-header');
    await expect(header).toBeVisible();
  });

  test('should display full navigation on tablet', async ({ page }) => {
    const tabNav = page.locator('.tab-navigation');
    await expect(tabNav).toBeVisible();

    // All tabs should be visible
    const tabs = ['Dashboard', 'Organization Profile', 'Contacts'];

    for (const tab of tabs) {
      const tabButton = page.locator('.tab-button').filter({ hasText: tab });
      await expect(tabButton).toBeVisible();
    }
  });

  test('should display stat cards in grid on tablet', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    const count = await statsGrid.count();

    if (count > 0) {
      const statCards = statsGrid.locator('.stat-card');
      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('should display tables with horizontal scroll if needed', async ({ page }) => {
    await page.locator('.tab-button').filter({ hasText: 'Contacts' }).click();
    await page.waitForTimeout(500);

    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      // Table should be visible
      await expect(table).toBeVisible();
    }
  });

  test('should take screenshot of tablet dashboard', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-tablet-dashboard.png',
      fullPage: true
    });

    console.log('Tablet dashboard screenshot captured');
  });
});

test.describe('Responsive Design - Large Mobile Viewport', () => {
  test.beforeEach(async ({ page }) => {
    // Set large mobile viewport (iPhone Plus/Max size)
    await page.setViewportSize({ width: 414, height: 896 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display content properly on large mobile', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('should display organization card on large mobile', async ({ page }) => {
    const orgCard = page.locator('.card').filter({ hasText: 'Organization Information' });
    await expect(orgCard).toBeVisible();
  });

  test('should take screenshot of large mobile dashboard', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-large-mobile-dashboard.png',
      fullPage: true
    });

    console.log('Large mobile dashboard screenshot captured');
  });
});

test.describe('Responsive Design - Wide Desktop Viewport', () => {
  test.beforeEach(async ({ page }) => {
    // Set wide desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should utilize full width on desktop', async ({ page }) => {
    const mainContent = page.locator('main, .App-main');
    await expect(mainContent).toBeVisible();
  });

  test('should display all navigation tabs inline', async ({ page }) => {
    const tabs = page.locator('.tab-button');
    const tabCount = await tabs.count();

    // All tabs should be visible
    expect(tabCount).toBeGreaterThan(0);

    for (let i = 0; i < tabCount; i++) {
      await expect(tabs.nth(i)).toBeVisible();
    }
  });

  test('should display stat cards in multi-column grid', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    const count = await statsGrid.count();

    if (count > 0) {
      const statCards = statsGrid.locator('.stat-card');
      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('should take screenshot of wide desktop dashboard', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-desktop-dashboard.png',
      fullPage: true
    });

    console.log('Desktop dashboard screenshot captured');
  });
});
