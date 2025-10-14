import { test, expect } from '@playwright/test';

/**
 * Quick Test - Verify basic functionality
 * This is a minimal test to verify Playwright is working
 */

test.describe('Quick Smoke Test', () => {
  test('should load admin portal successfully', async ({ page }) => {
    console.log('🚀 Navigating to admin portal...');

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/screenshots/homepage.png',
      fullPage: true,
    });

    console.log('✅ Page loaded, screenshot saved');

    // Check title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for main content
    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    console.log('✅ Test passed!');
  });

  test('should verify authentication state', async ({ page }) => {
    console.log('🔐 Checking authentication...');

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check if we see authenticated content
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);

    // We should NOT be redirected to Microsoft login
    expect(url).not.toContain('login.microsoftonline.com');

    console.log('✅ User is authenticated!');
  });

  test('should intercept API calls', async ({ page }) => {
    console.log('🌐 Monitoring API calls...');

    const apiCalls: string[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        apiCalls.push(`${status} ${url}`);
        console.log(`API: ${status} ${url}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    console.log(`📊 Total API calls: ${apiCalls.length}`);
    console.log('API calls:', apiCalls);

    // Verify we made some API calls
    expect(apiCalls.length).toBeGreaterThan(0);
  });
});
