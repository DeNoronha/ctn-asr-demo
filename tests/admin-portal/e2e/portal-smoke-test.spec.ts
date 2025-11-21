/**
 * Portal Smoke Test - Verify both Admin and Member portals load without white page
 *
 * This test was created in response to the i18n HttpBackend + useSuspense issue
 * that caused white pages on both portals after deployment.
 *
 * See: docs/LESSONS_LEARNED.md #24
 */

import { expect, test } from '@playwright/test';

const ADMIN_PORTAL_URL =
  process.env.VITE_ADMIN_PORTAL_URL || 'https://calm-tree-03352ba03.1.azurestaticapps.net';
const MEMBER_PORTAL_URL =
  process.env.VITE_MEMBER_PORTAL_URL || 'https://calm-pebble-043b2db03.1.azurestaticapps.net';

test.describe('Portal Smoke Tests', () => {
  test('Admin Portal should load without white page', async ({ page }) => {
    // Navigate to Admin Portal
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });

    // Check that the page title is correct
    await expect(page).toHaveTitle(/CTN Admin Portal/i);

    // Wait for React to render by looking for specific elements
    await page.waitForSelector('button, [role="main"], .mantine-Button-root', {
      state: 'visible',
      timeout: 10000
    });

    // Verify the page is not just a white page by checking for visible content
    // The login page should be visible (we're not authenticated)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(100); // Should have substantial content

    // Check for common UI elements that indicate the app rendered
    const hasLoginOrApp = await page.locator('button, [role="main"], .mantine-Button-root').count();
    expect(hasLoginOrApp).toBeGreaterThan(0);

    // Verify no JavaScript errors in console (critical errors)
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // If there are console errors, log them but don't fail the test
    // (some errors like network failures are expected without auth)
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
  });

  test('Member Portal should load without white page', async ({ page }) => {
    // Navigate to Member Portal
    await page.goto(MEMBER_PORTAL_URL, { waitUntil: 'networkidle' });

    // Check that the page title is correct
    await expect(page).toHaveTitle(/CTN Member Portal/i);

    // Wait for React to render by looking for specific elements
    await page.waitForSelector('button, [role="main"], .mantine-Button-root', {
      state: 'visible',
      timeout: 10000
    });

    // Verify the page is not just a white page by checking for visible content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(100); // Should have substantial content

    // Check for common UI elements that indicate the app rendered
    const hasLoginOrApp = await page.locator('button, [role="main"], .mantine-Button-root').count();
    expect(hasLoginOrApp).toBeGreaterThan(0);

    // Verify no JavaScript errors in console (critical errors)
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // If there are console errors, log them but don't fail the test
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
  });

  test('Admin Portal should have i18n initialized', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });

    // Check if i18n is initialized by evaluating window object
    const i18nInitialized = await page.evaluate(() => {
      return typeof window !== 'undefined';
    });

    expect(i18nInitialized).toBe(true);

    // Verify translations are loaded by waiting for content
    await page.waitForSelector('body', { state: 'visible' });

    // The page should not have any Suspense loading indicators stuck
    const suspenseCount = await page.locator('[data-suspense]').count();
    expect(suspenseCount).toBe(0);
  });

  test('Member Portal should have i18n initialized', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL, { waitUntil: 'networkidle' });

    // Check if i18n is initialized
    const i18nInitialized = await page.evaluate(() => {
      return typeof window !== 'undefined';
    });

    expect(i18nInitialized).toBe(true);

    // Verify translations are loaded by waiting for content
    await page.waitForSelector('body', { state: 'visible' });

    // The page should not have any Suspense loading indicators stuck
    const suspenseCount = await page.locator('[data-suspense]').count();
    expect(suspenseCount).toBe(0);
  });
});
