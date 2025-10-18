import { test, expect } from './fixtures/auth';

test.describe('Dashboard Page', () => {
  test('should load dashboard with all components', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Verify page title
    await expect(page.locator('h1, h2').first()).toContainText(/Dashboard|Overview/i);

    // Verify stats cards are visible
    const statsCards = page.locator('[class*="card"], [class*="stat"]');
    await expect(statsCards.first()).toBeVisible();

    // Should show at least 3-4 stat cards (Total, Active, Completed, Delayed)
    const cardCount = await statsCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('should display orchestration status breakdown chart', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Wait for Kendo chart to render
    await page.waitForSelector('div[class*="k-chart"]', { timeout: 10000 });

    // Verify chart container exists
    const chart = page.locator('div[class*="k-chart"]').first();
    await expect(chart).toBeVisible();

    // Verify SVG chart is rendered
    const chartSvg = chart.locator('svg');
    await expect(chartSvg).toBeVisible();

    // Verify chart has data (check for path elements in donut chart)
    const chartPaths = chartSvg.locator('path');
    const pathCount = await chartPaths.count();
    expect(pathCount).toBeGreaterThan(0);
  });

  test('should display recent activity feed', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Verify activity feed section exists
    await expect(page.locator('text=/Recent Activity|Activity Feed|Recent Events/i')).toBeVisible();

    // Verify activity items are present
    const activityItems = page.locator('[class*="activity"], [class*="event"], li');
    const itemCount = await activityItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should navigate to orchestrations page from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Click link to orchestrations (could be in nav or button)
    const orchestrationsLink = page.locator('a:has-text("Orchestrations"), button:has-text("View All")').first();
    await orchestrationsLink.click();

    // Should navigate to orchestrations page
    await expect(page).toHaveURL(/\/orchestrations/);
  });

  test('should display correct data for ITG tenant', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // ITG should see their tenant name
    await expect(page.locator('text=/ITG/i')).toBeVisible();

    // Stats should be visible and non-zero
    const statsValues = page.locator('[class*="stat"] [class*="value"], h2, h3').filter({ hasText: /^\d+$/ });
    const firstStat = statsValues.first();
    await expect(firstStat).toBeVisible();
  });

  test('should display correct data for Rotterdam tenant', async ({ authenticatedPageAsRotterdam: page }) => {
    await page.goto('/dashboard');

    // Rotterdam should see their tenant name
    await expect(page.locator('text=/Rotterdam/i')).toBeVisible();

    // Stats should be visible
    const statsValues = page.locator('[class*="stat"] [class*="value"], h2, h3').filter({ hasText: /^\d+$/ });
    const firstStat = statsValues.first();
    await expect(firstStat).toBeVisible();
  });

  test('should refresh dashboard data', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Wait for initial load
    await page.waitForSelector('div[class*="k-chart"]', { timeout: 10000 });

    // Reload page
    await page.reload();

    // Dashboard should reload successfully
    await expect(page.locator('h1, h2').first()).toContainText(/Dashboard|Overview/i);
    await page.waitForSelector('div[class*="k-chart"]', { timeout: 10000 });
  });

  test('should handle empty state gracefully', async ({ authenticatedPage: page }) => {
    // This test assumes the dashboard handles cases where no data exists
    await page.goto('/dashboard');

    // Even with no data, core components should render
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Chart container should exist even if empty
    const hasChart = await page.locator('div[class*="k-chart"]').count();
    const hasEmptyState = await page.locator('text=/No data|No orchestrations/i').count();

    // Either chart or empty state should be present
    expect(hasChart + hasEmptyState).toBeGreaterThan(0);
  });
});
