/**
 * Admin Portal UI Inspection Test - October 26, 2025
 *
 * Test Area: Visual inspection and UI verification based on user-reported issues
 * Priority: High
 * Auth: Pre-authentication inspection (no login required for initial checks)
 *
 * Priority Test Areas:
 * 1. Endpoint Registration: Save button functionality
 * 2. Sidebar: Tasks, Subscriptions, Newsletters hidden
 * 3. Members Grid: "Member Since" column visible, Eye icon used
 * 4. Contact Modal: Email field label/placeholder, checkbox label
 * 5. Document Verification tab: UI improvements
 * 6. Health Monitor: Layout and data display
 * 7. Settings page: Links working
 * 8. About page: Information display
 */

import { expect, test } from '@playwright/test';

const ADMIN_PORTAL_URL =
  process.env.VITE_ADMIN_PORTAL_URL || 'https://calm-tree-03352ba03.1.azurestaticapps.net';

test.describe('Admin Portal UI Inspection - Pre-Auth Checks', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    // Monitor network failures
    page.on('requestfailed', (request) => {
      console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
  });

  test('Portal loads successfully and renders initial UI', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/ui-inspection/01-initial-load.png',
      fullPage: true,
    });

    // Verify page title
    await expect(page).toHaveTitle(/CTN Admin Portal/i);

    // Verify page has content (not a white page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);

    console.log('✅ Portal loaded successfully');
  });

  test('Check for authentication state and capture pre-auth UI', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if we need authentication
    const hasLoginButton = await page
      .locator('button:has-text("Sign in"), button:has-text("Login")')
      .count();
    const isAuthRedirect = page.url().includes('login.microsoftonline.com');

    if (hasLoginButton > 0 || isAuthRedirect) {
      console.log('⚠️ Authentication required - capturing pre-auth state');
      await page.screenshot({
        path: 'test-results/ui-inspection/02-auth-required.png',
        fullPage: true,
      });
    } else {
      console.log('✅ Already authenticated or public access available');
      await page.screenshot({
        path: 'test-results/ui-inspection/02-authenticated-state.png',
        fullPage: true,
      });
    }
  });

  test('Inspect visible UI elements and structure', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for common UI elements
    const uiElements = {
      header: await page.locator('header, [role="banner"], .app-header').count(),
      sidebar: await page.locator('nav, .sidebar, .drawer, [role="navigation"]').count(),
      mainContent: await page.locator('main, [role="main"], .main-content').count(),
      buttons: await page.locator('button').count(),
      links: await page.locator('a').count(),
    };

    console.log('UI Elements detected:', uiElements);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/ui-inspection/03-ui-structure.png',
      fullPage: true,
    });

    // Report findings
    expect(uiElements.buttons).toBeGreaterThan(0);
    console.log(`✅ Found ${uiElements.buttons} buttons, ${uiElements.links} links`);
  });

  test('Check visible navigation menu items', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for navigation elements
    const nav = page.locator('nav, .sidebar, .drawer, [role="navigation"]').first();

    if ((await nav.count()) > 0) {
      await nav.screenshot({
        path: 'test-results/ui-inspection/04-navigation-menu.png',
      });

      // Check for specific menu items mentioned in requirements
      const menuItems = {
        members: await nav.locator('text=/Members/i').count(),
        tasks: await nav.locator('text=/Tasks/i').count(),
        subscriptions: await nav.locator('text=/Subscriptions/i').count(),
        newsletters: await nav.locator('text=/Newsletters/i').count(),
        settings: await nav.locator('text=/Settings/i').count(),
        about: await nav.locator('text=/About/i').count(),
      };

      console.log('Navigation menu items:', menuItems);

      // Verify that Tasks, Subscriptions, Newsletters are hidden (should be 0)
      if (menuItems.tasks === 0 && menuItems.subscriptions === 0 && menuItems.newsletters === 0) {
        console.log('✅ Tasks, Subscriptions, Newsletters are correctly hidden');
      } else {
        console.warn('⚠️ ISSUE: Some menu items that should be hidden are visible:', {
          tasks: menuItems.tasks > 0,
          subscriptions: menuItems.subscriptions > 0,
          newsletters: menuItems.newsletters > 0,
        });
      }
    } else {
      console.log('⚠️ Navigation menu not visible (may require authentication)');
    }
  });

  test('Capture all visible text content for analysis', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Get all visible text
    const allText = await page.locator('body').textContent();

    // Look for specific keywords from requirements
    const keywords = {
      'Member Since': allText?.includes('Member Since') || false,
      'Endpoint Registration':
        allText?.includes('Endpoint Registration') || allText?.includes('Endpoint') || false,
      'Document Verification':
        allText?.includes('Document Verification') || allText?.includes('Documents') || false,
      'Health Monitor': allText?.includes('Health Monitor') || allText?.includes('Health') || false,
      Contact: allText?.includes('Contact') || false,
      Email: allText?.includes('Email') || allText?.includes('email') || false,
    };

    console.log('Keyword detection:', keywords);

    // Save text content to file for analysis
    const fs = require('fs');
    const path = require('path');
    const outputDir = 'test-results/ui-inspection';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outputDir, '05-page-content.txt'), allText || '');
    console.log('✅ Page content saved to file');
  });

  test('Check for JavaScript errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.error('Errors detected:', consoleErrors);
    }

    if (consoleWarnings.length > 0) {
      console.warn('Warnings detected:', consoleWarnings);
    }

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputDir = 'test-results/ui-inspection';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outputDir, '06-console-logs.json'),
      JSON.stringify({ errors: consoleErrors, warnings: consoleWarnings }, null, 2)
    );

    // Don't fail the test, just report
    console.log('✅ Console log analysis complete');
  });

  test('Check network requests and API connectivity', async ({ page }) => {
    const apiRequests: Array<{ url: string; status: number; method: string }> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`API Requests detected: ${apiRequests.length}`);

    if (apiRequests.length > 0) {
      console.log('API Requests:', apiRequests);

      // Check for failed requests
      const failedRequests = apiRequests.filter((req) => req.status >= 400);
      if (failedRequests.length > 0) {
        console.error('❌ Failed API requests:', failedRequests);
      }
    }

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputDir = 'test-results/ui-inspection';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outputDir, '07-api-requests.json'),
      JSON.stringify(apiRequests, null, 2)
    );

    console.log('✅ Network request analysis complete');
  });

  test('Capture viewport sizes for responsive design check', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `test-results/ui-inspection/08-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });

      console.log(`✅ Captured ${viewport.name} view (${viewport.width}x${viewport.height})`);
    }
  });
});

test.describe('Admin Portal UI Inspection - Accessibility Checks', () => {
  test('Check for basic accessibility attributes', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for ARIA attributes
    const ariaElements = {
      ariaLabels: await page.locator('[aria-label]').count(),
      ariaDescribedBy: await page.locator('[aria-describedby]').count(),
      roles: await page.locator('[role]').count(),
      altTexts: await page.locator('img[alt]').count(),
      totalImages: await page.locator('img').count(),
    };

    console.log('Accessibility attributes:', ariaElements);

    // Check if images have alt text
    const imagesWithoutAlt = ariaElements.totalImages - ariaElements.altTexts;
    if (imagesWithoutAlt > 0) {
      console.warn(`⚠️ ${imagesWithoutAlt} images without alt text`);
    }

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputDir = 'test-results/ui-inspection';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outputDir, '09-accessibility-check.json'),
      JSON.stringify(ariaElements, null, 2)
    );

    console.log('✅ Accessibility check complete');
  });

  test('Check for keyboard navigation support', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for focusable elements
    const focusableElements = {
      buttons: await page.locator('button:not([disabled])').count(),
      links: await page.locator('a[href]').count(),
      inputs: await page.locator('input:not([disabled])').count(),
      selects: await page.locator('select:not([disabled])').count(),
    };

    console.log('Focusable elements:', focusableElements);

    // Try tabbing through elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`First focused element after Tab: ${firstFocused}`);

    console.log('✅ Keyboard navigation check complete');
  });
});

test.describe('Admin Portal UI Inspection - Summary Report', () => {
  test('Generate comprehensive UI inspection report', async ({ page }) => {
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize(),
      summary: {
        authenticationRequired: page.url().includes('login.microsoftonline.com'),
        pageLoaded: (await page.locator('body').textContent())?.length! > 100,
        hasNavigation: (await page.locator('nav, .sidebar, [role="navigation"]').count()) > 0,
        hasButtons: (await page.locator('button').count()) > 0,
        hasContent: (await page.locator('main, [role="main"]').count()) > 0,
      },
      findings: {
        hiddenMenuItems: {
          tasks: (await page.locator('text=/Tasks/i').count()) === 0 ? 'Hidden ✅' : 'Visible ⚠️',
          subscriptions:
            (await page.locator('text=/Subscriptions/i').count()) === 0 ? 'Hidden ✅' : 'Visible ⚠️',
          newsletters:
            (await page.locator('text=/Newsletters/i').count()) === 0 ? 'Hidden ✅' : 'Visible ⚠️',
        },
      },
      nextSteps: [
        'Authentication required to test post-login features',
        'Run: npx playwright codegen --save-storage=playwright/.auth/user.json',
        'Then re-run tests with authenticated session',
      ],
    };

    console.log('=== UI INSPECTION REPORT ===');
    console.log(JSON.stringify(report, null, 2));

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputDir = 'test-results/ui-inspection';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outputDir, '10-final-report.json'), JSON.stringify(report, null, 2));

    console.log('✅ Comprehensive UI inspection report generated');
  });
});
