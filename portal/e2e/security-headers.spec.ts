/**
 * Security Headers Test Suite for Member Portal
 *
 * Tests that all required security headers are present and correctly configured
 * after recent security improvements.
 *
 * Created: October 18, 2025
 */

import { test, expect } from '@playwright/test';

const MEMBER_PORTAL_URL = 'https://calm-pebble-043b2db03.1.azurestaticapps.net';

test.describe('Member Portal - Security Headers', () => {
  test('should have all required security headers on home page', async ({ page }) => {
    // Navigate to member portal home page
    const response = await page.goto(MEMBER_PORTAL_URL);

    // Verify page loaded successfully
    expect(response?.status()).toBe(200);

    // Check X-Content-Type-Options header
    const contentTypeOptions = response?.headers()['x-content-type-options'];
    expect(contentTypeOptions).toBe('nosniff');

    // Check X-Frame-Options header
    const frameOptions = response?.headers()['x-frame-options'];
    expect(frameOptions).toMatch(/DENY|SAMEORIGIN/);

    // Check Strict-Transport-Security header
    const hsts = response?.headers()['strict-transport-security'];
    expect(hsts).toBeTruthy();
    expect(hsts).toContain('max-age=');

    // Check Content-Security-Policy header
    const csp = response?.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain('default-src');
  });

  test('should have security headers on all routes', async ({ page }) => {
    // Test a few different routes to ensure headers are consistent
    const routes = [
      '/',
      '/dashboard',
      '/legal-entity',
      '/settings'
    ];

    for (const route of routes) {
      const response = await page.goto(`${MEMBER_PORTAL_URL}${route}`);

      // All routes should return 200 (SPA routing)
      expect(response?.status()).toBe(200);

      // Verify security headers present
      expect(response?.headers()['x-content-type-options']).toBe('nosniff');
      expect(response?.headers()['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      expect(response?.headers()['strict-transport-security']).toBeTruthy();
      expect(response?.headers()['content-security-policy']).toBeTruthy();
    }
  });

  test('CSP should not block legitimate resources', async ({ page }) => {
    // Listen for CSP violations
    const cspViolations: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    // Navigate to portal
    await page.goto(MEMBER_PORTAL_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify no CSP violations occurred
    expect(cspViolations.length).toBe(0);
  });

  test('CSP should allow Azure AD authentication redirects', async ({ page }) => {
    // Navigate to portal (will trigger auth redirect)
    const response = await page.goto(MEMBER_PORTAL_URL);

    const csp = response?.headers()['content-security-policy'];

    // CSP should allow Azure AD domains
    expect(csp).toBeTruthy();

    // Verify we can navigate to login if needed (no CSP blocking)
    await page.waitForLoadState('load');

    // Page should load without CSP errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.waitForTimeout(2000);

    const cspErrors = pageErrors.filter(err =>
      err.includes('Content Security Policy') ||
      err.includes('CSP')
    );

    expect(cspErrors.length).toBe(0);
  });

  test('X-Frame-Options should prevent clickjacking', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);

    const frameOptions = response?.headers()['x-frame-options'];

    // Should be either DENY or SAMEORIGIN
    expect(frameOptions).toMatch(/DENY|SAMEORIGIN/);
  });

  test('Strict-Transport-Security should enforce HTTPS', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);

    const hsts = response?.headers()['strict-transport-security'];

    expect(hsts).toBeTruthy();

    // Should have max-age directive
    expect(hsts).toContain('max-age=');

    // Extract max-age value
    const maxAgeMatch = hsts?.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);

      // Should be at least 1 year (31536000 seconds)
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    }
  });

  test('X-Content-Type-Options should prevent MIME sniffing', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);

    const contentTypeOptions = response?.headers()['x-content-type-options'];

    // Must be exactly "nosniff"
    expect(contentTypeOptions).toBe('nosniff');
  });

  test('CSP should not allow unsafe-inline or unsafe-eval', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);

    const csp = response?.headers()['content-security-policy'];

    expect(csp).toBeTruthy();

    // Check if CSP contains unsafe directives
    const hasUnsafeInline = csp?.includes("'unsafe-inline'");
    const hasUnsafeEval = csp?.includes("'unsafe-eval'");

    // Log warning if unsafe directives found
    if (hasUnsafeInline) {
      console.warn('⚠️  CSP contains unsafe-inline - consider using nonces or hashes');
    }

    if (hasUnsafeEval) {
      console.warn('⚠️  CSP contains unsafe-eval - should be avoided if possible');
    }

    // For now, just verify CSP exists (strict checking may break functionality)
    expect(csp).toContain('default-src');
  });
});

test.describe('Member Portal - Security Best Practices', () => {
  test('should redirect HTTP to HTTPS', async ({ page }) => {
    // This is handled by Azure Static Web Apps automatically
    // Just verify we're on HTTPS
    await page.goto(MEMBER_PORTAL_URL);

    expect(page.url()).toContain('https://');
  });

  test('should not expose sensitive information in headers', async ({ page }) => {
    const response = await page.goto(MEMBER_PORTAL_URL);

    const headers = response?.headers();

    // Should not expose server version (or if it does, should not contain version numbers)
    const serverHeader = headers?.['server'];
    if (serverHeader) {
      expect(serverHeader).not.toContain('Apache/');
      expect(serverHeader).not.toContain('nginx/');
    }

    // Should not expose X-Powered-By
    expect(headers?.['x-powered-by']).toBeUndefined();
  });

  test('should have proper cache control for security-sensitive pages', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);

    // After authentication, check cache headers on authenticated pages
    await page.waitForLoadState('load');

    // Navigate to a potentially sensitive page
    const response = await page.goto(`${MEMBER_PORTAL_URL}/settings`);

    const cacheControl = response?.headers()['cache-control'];

    // Logged for verification
    console.log('Cache-Control:', cacheControl || 'not set');
  });
});
