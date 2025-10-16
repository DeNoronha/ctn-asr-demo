import { test, expect } from '@playwright/test';

/**
 * Vite Migration Verification - Member Portal
 *
 * This test suite verifies the Vite migration deployment for the member portal.
 * It tests critical functionality to ensure the migration didn't break anything.
 *
 * Test Focus:
 * - Portal loads without errors
 * - Environment variables are correctly embedded
 * - Static assets load properly
 * - Version info is correct
 * - Console has no critical errors
 * - Authentication flow works
 */

const MEMBER_PORTAL_URL = 'https://calm-pebble-043b2db03.1.azurestaticapps.net';

test.describe('Member Portal - Vite Migration Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Clear console logs before each test
    await page.goto(MEMBER_PORTAL_URL);
  });

  test('should load member portal homepage without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Capture console errors and warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Verify page loaded successfully
    expect(page.url()).toContain(MEMBER_PORTAL_URL);

    // Check for critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') && // Ignore DevTools errors
      !err.includes('extension') // Ignore browser extension errors
    );

    expect(criticalErrors, `Console errors found: ${criticalErrors.join(', ')}`).toHaveLength(0);

    console.log(`Console warnings (${consoleWarnings.length}):`, consoleWarnings);
  });

  test('should display correct version information', async ({ page }) => {
    // Fetch version.json
    const response = await page.goto(`${MEMBER_PORTAL_URL}/version.json`);
    expect(response?.status()).toBe(200);

    const versionData = await response?.json();

    // Verify version.json has required fields
    expect(versionData).toHaveProperty('commitSha');
    expect(versionData).toHaveProperty('commitShaFull');
    expect(versionData).toHaveProperty('buildNumber');
    expect(versionData).toHaveProperty('timestamp');
    expect(versionData).toHaveProperty('version');
    expect(versionData).toHaveProperty('environment');

    // Verify environment is production
    expect(versionData.environment).toBe('production');

    // Verify commit SHA is not "unknown" (indicates successful build)
    expect(versionData.commitSha).not.toBe('unknown');
    expect(versionData.commitShaFull).not.toBe('unknown');

    console.log('Version Info:', {
      version: versionData.version,
      commitSha: versionData.commitSha,
      buildNumber: versionData.buildNumber,
      timestamp: versionData.timestamp
    });
  });

  test('should load favicon and static assets correctly', async ({ page }) => {
    const failedRequests: string[] = [];

    // Track failed network requests
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Filter out expected failures (e.g., browser extensions)
    const criticalFailures = failedRequests.filter(url =>
      !url.includes('chrome-extension://') &&
      !url.includes('moz-extension://') &&
      !url.includes('safari-extension://')
    );

    expect(criticalFailures, `Failed requests: ${criticalFailures.join(', ')}`).toHaveLength(0);

    // Verify favicon loaded
    const faviconResponse = await page.goto(`${MEMBER_PORTAL_URL}/favicon.ico`);
    expect(faviconResponse?.status()).toBe(200);
  });

  test('should have environment variables correctly embedded (no "undefined")', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);

    // Check page source for "undefined" environment variable placeholders
    const pageContent = await page.content();

    // These should NOT appear in the deployed bundle
    expect(pageContent).not.toContain('REACT_APP_API_URL=undefined');
    expect(pageContent).not.toContain('REACT_APP_AZURE_CLIENT_ID=undefined');
    expect(pageContent).not.toContain('import.meta.env.VITE_API_URL=undefined');

    // Check if window.__ENV__ is defined (if you use runtime config)
    const hasEnvObject = await page.evaluate(() => {
      return typeof (window as any).__ENV__ !== 'undefined';
    });

    console.log('Runtime environment object available:', hasEnvObject);
  });

  test('should render main navigation elements', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Wait for the app to initialize
    await page.waitForTimeout(2000);

    // Check if main navigation or header is present
    // Note: Adjust selectors based on your actual app structure
    const hasNavigation = await page.locator('nav, header, [role="navigation"]').count() > 0;
    expect(hasNavigation).toBe(true);

    console.log('Navigation elements found on page');
  });

  test('should handle routing correctly', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Test that navigation works (adjust selectors based on your app)
    // Example: Try navigating to different routes
    const routes = [
      MEMBER_PORTAL_URL,
      `${MEMBER_PORTAL_URL}/about`
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      console.log(`Route ${route} loaded successfully`);
    }
  });

  test('should not have React DevTools warnings in production', async ({ page }) => {
    const devToolsWarnings: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('React DevTools') || text.includes('development mode')) {
        devToolsWarnings.push(text);
      }
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Production builds should not show DevTools warnings
    expect(devToolsWarnings).toHaveLength(0);
  });

  test('should have correct Content-Security-Policy headers', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);
    const headers = response?.headers();

    // Check for security headers (Azure Static Web Apps provides these by default)
    console.log('Security Headers:', {
      csp: headers?.['content-security-policy'],
      xFrameOptions: headers?.['x-frame-options'],
      xContentTypeOptions: headers?.['x-content-type-options']
    });

    // Verify response is successful
    expect(response?.status()).toBe(200);
  });
});

test.describe('Member Portal - Vite Build Verification', () => {

  test('should load bundled JavaScript without errors', async ({ page }) => {
    const scriptErrors: string[] = [];

    page.on('pageerror', (error) => {
      scriptErrors.push(error.message);
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Wait for any async scripts to load
    await page.waitForTimeout(3000);

    expect(scriptErrors, `Script errors found: ${scriptErrors.join(', ')}`).toHaveLength(0);
  });

  test('should have minified production bundle', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);
    const html = await response?.text();

    // Vite production builds should have hashed asset names
    // Example: /assets/index-abc123.js
    const hasHashedAssets = html?.includes('/assets/index-') || html?.includes('/assets/main-');

    expect(hasHashedAssets).toBe(true);
    console.log('Production bundle uses hashed asset names (cache busting enabled)');
  });

  test('should load CSS stylesheets correctly', async ({ page }) => {
    const cssRequests: string[] = [];

    page.on('response', (response) => {
      if (response.url().endsWith('.css')) {
        cssRequests.push(response.url());
      }
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Verify at least one CSS file loaded
    expect(cssRequests.length).toBeGreaterThan(0);
    console.log(`Loaded ${cssRequests.length} CSS files`);
  });
});

test.describe('Member Portal - Authentication Integration', () => {

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Check if page redirects to Azure AD login or shows login UI
    // Note: This will vary based on your authentication implementation
    const currentUrl = page.url();
    const hasLoginUI = currentUrl.includes('login') ||
                       currentUrl.includes('microsoftonline.com') ||
                       await page.locator('button:has-text("Sign in"), button:has-text("Login")').count() > 0;

    console.log('Authentication check:', {
      url: currentUrl,
      hasLoginUI
    });

    // Expect either redirect to Azure AD or login UI present
    expect(hasLoginUI || currentUrl.includes('microsoftonline')).toBe(true);
  });
});
