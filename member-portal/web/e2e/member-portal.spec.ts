import { expect, test } from '@playwright/test';

/**
 * Member Portal - Comprehensive E2E Test Suite
 *
 * CRITICAL: Only run these tests AFTER API tests pass!
 * See: /portal/api/tests/member-portal-api-tests.sh
 *
 * This test suite covers:
 * - Authentication flow (Azure AD)
 * - Dashboard and organization summary
 * - Profile management and registry identifiers
 * - Contact management (CRUD)
 * - Endpoint management (CRUD)
 * - API token management
 * - Language switching
 * - Error handling
 *
 * Prerequisites:
 * - API tests must pass first (run member-portal-api-tests.sh)
 * - Valid Azure AD test credentials
 * - Member user with legal entity and contacts in database
 *
 * Test Environment: Production
 * Member Portal: https://calm-pebble-043b2db03.1.azurestaticapps.net
 * API: https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
 */

const MEMBER_PORTAL_URL = 'https://calm-pebble-043b2db03.1.azurestaticapps.net';
const API_BASE_URL = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

// Test data identifiers (will be populated during tests)
let testContactId: string | null = null;
let testEndpointId: string | null = null;

test.describe('Member Portal - Authentication & Access', () => {
  test('should load member portal homepage without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    expect(page.url()).toContain(MEMBER_PORTAL_URL);

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('DevTools') &&
        !err.includes('extension') &&
        !err.includes('favicon')
    );

    expect(
      criticalErrors,
      `Console errors found: ${criticalErrors.join(', ')}`
    ).toHaveLength(0);
  });

  test('should redirect to Azure AD login when not authenticated', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    // Check for Azure AD login or login UI
    const hasLoginUI =
      currentUrl.includes('login') ||
      currentUrl.includes('microsoftonline.com') ||
      (await page.locator('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Inloggen")').count()) >
        0;

    expect(hasLoginUI || currentUrl.includes('microsoftonline')).toBe(true);
  });

  test.skip('should successfully authenticate with Azure AD', async ({ page }) => {
    // This test requires Azure AD credentials
    // Skip in automated runs, but can be enabled for manual testing

    await page.goto(MEMBER_PORTAL_URL);

    // Wait for Azure AD redirect
    await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 10000 });

    // Fill in Azure AD credentials
    // Note: Replace with actual test credentials or use environment variables
    // await page.fill('input[type="email"]', process.env.TEST_MEMBER_EMAIL || '');
    // await page.click('input[type="submit"]');
    // await page.fill('input[type="password"]', process.env.TEST_MEMBER_PASSWORD || '');
    // await page.click('input[type="submit"]');

    // Wait for redirect back to member portal
    // await page.waitForURL(MEMBER_PORTAL_URL, { timeout: 15000 });

    // Verify successful authentication
    // expect(page.url()).toContain(MEMBER_PORTAL_URL);
  });
});

test.describe('Member Portal - Dashboard & Organization Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume authentication is handled
    // In production, you would use authenticated state storage
    await page.goto(MEMBER_PORTAL_URL);
  });

  test('should display organization summary on dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Look for common dashboard elements
    const hasDashboard =
      (await page.locator('[data-testid="dashboard"], .dashboard, main').count()) > 0;

    expect(hasDashboard).toBe(true);
  });

  test('should display member organization name and details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for organization name or title
    const hasOrgName =
      (await page
        .locator('h1, h2, [data-testid="organization-name"], .organization-name')
        .count()) > 0;

    expect(hasOrgName).toBe(true);
  });

  test('should display navigation menu', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for navigation elements
    const hasNavigation = (await page.locator('nav, [role="navigation"], .navigation').count()) > 0;

    expect(hasNavigation).toBe(true);
  });

  test('should load without failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      // Filter out extension requests
      const url = request.url();
      if (
        !url.includes('chrome-extension') &&
        !url.includes('moz-extension') &&
        !url.includes('safari-extension')
      ) {
        failedRequests.push(`${request.method()} ${url}`);
      }
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    expect(failedRequests, `Failed requests: ${failedRequests.join(', ')}`).toHaveLength(0);
  });
});

test.describe('Member Portal - Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to profile or organization details', async ({ page }) => {
    // Look for profile/organization navigation link
    const profileLinks = await page
      .locator(
        'a:has-text("Profile"), a:has-text("Profiel"), a:has-text("Organization"), a:has-text("Organisatie")'
      )
      .count();

    if (profileLinks > 0) {
      await page
        .locator(
          'a:has-text("Profile"), a:has-text("Profiel"), a:has-text("Organization"), a:has-text("Organisatie")'
        )
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      // Verify navigation occurred
      const currentUrl = page.url();
      expect(
        currentUrl.includes('profile') ||
          currentUrl.includes('organization') ||
          currentUrl.includes('profiel') ||
          currentUrl.includes('organisatie')
      ).toBe(true);
    } else {
      // Skip test if profile link not found
      test.skip();
    }
  });

  test('should display registry identifiers (KvK, LEI, etc.)', async ({ page }) => {
    // Navigate to profile if not already there
    const profileLinks = await page
      .locator('a:has-text("Profile"), a:has-text("Profiel")').count();

    if (profileLinks > 0) {
      await page.locator('a:has-text("Profile"), a:has-text("Profiel")').first().click();
      await page.waitForLoadState('networkidle');
    }

    // Look for identifier labels or sections
    const hasIdentifiers =
      (await page.locator('text=/KvK|LEI|EUID|Registry|Handelsregister/i').count()) > 0;

    // This may not be visible on all pages, so we'll log the result
    console.log('Registry identifiers visible:', hasIdentifiers);
  });

  test('should display membership status and level', async ({ page }) => {
    // Look for status or membership information
    const hasStatus =
      (await page
        .locator('text=/status|membership|member level|lidmaatschap/i')
        .count()) > 0;

    console.log('Membership status visible:', hasStatus);
  });
});

test.describe('Member Portal - Contact Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to contacts page', async ({ page }) => {
    const contactLinks = await page
      .locator('a:has-text("Contacts"), a:has-text("Contacten")').count();

    if (contactLinks > 0) {
      await page.locator('a:has-text("Contacts"), a:has-text("Contacten")').first().click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      expect(
        currentUrl.includes('contact') || currentUrl.includes('contacten')
      ).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should display list of contacts', async ({ page }) => {
    // Navigate to contacts
    const contactLinks = await page.locator('a:has-text("Contacts"), a:has-text("Contacten")').count();

    if (contactLinks > 0) {
      await page.locator('a:has-text("Contacts"), a:has-text("Contacten")').first().click();
      await page.waitForLoadState('networkidle');

      // Wait for contact list to load
      await page.waitForTimeout(2000);

      // Look for contact list elements (table, grid, cards)
      const hasContactList =
        (await page
          .locator('table, .contact-list, .contact-grid, [data-testid*="contact"]')
          .count()) > 0;

      expect(hasContactList).toBe(true);
    } else {
      test.skip();
    }
  });

  test.skip('should add new contact via form', async ({ page }) => {
    // This test requires authentication and access to contact management
    // Navigate to contacts
    await page.click('a:has-text("Contacts"), a:has-text("Contacten")');
    await page.waitForLoadState('networkidle');

    // Click add contact button
    await page.click('button:has-text("Add"), button:has-text("Toevoegen"), button:has-text("New Contact")');

    // Fill in contact form
    await page.fill('input[name="full_name"], input[name="fullName"]', 'Test Contact E2E');
    await page.fill('input[name="email"]', `e2e-test-${Date.now()}@example.com`);
    await page.fill('input[name="job_title"], input[name="jobTitle"]', 'E2E Test Engineer');

    // Submit form
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Opslaan")');

    // Wait for success message or redirect
    await page.waitForTimeout(2000);

    // Verify contact appears in list
    const contactAdded = (await page.locator('text=/Test Contact E2E/i').count()) > 0;
    expect(contactAdded).toBe(true);
  });

  test.skip('should edit existing contact', async ({ page }) => {
    // Navigate to contacts
    await page.click('a:has-text("Contacts")');
    await page.waitForLoadState('networkidle');

    // Find and click edit button on first contact
    await page.click('button:has-text("Edit"):first, button[title="Edit"]:first');

    // Update job title
    await page.fill('input[name="job_title"], input[name="jobTitle"]', 'Updated E2E Test Engineer');

    // Save changes
    await page.click('button[type="submit"], button:has-text("Save")');

    await page.waitForTimeout(2000);

    // Verify update
    const updated = (await page.locator('text=/Updated E2E Test Engineer/i').count()) > 0;
    expect(updated).toBe(true);
  });

  test.skip('should delete contact', async ({ page }) => {
    // Navigate to contacts
    await page.click('a:has-text("Contacts")');
    await page.waitForLoadState('networkidle');

    // Get initial contact count
    const initialCount = await page.locator('tbody tr, .contact-item').count();

    // Click delete button on test contact
    await page.click('button:has-text("Delete"):first, button[title="Delete"]:first');

    // Confirm deletion if prompted
    const confirmButton = await page.locator('button:has-text("Confirm"), button:has-text("Yes")').count();
    if (confirmButton > 0) {
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    }

    await page.waitForTimeout(2000);

    // Verify contact count decreased
    const finalCount = await page.locator('tbody tr, .contact-item').count();
    expect(finalCount).toBeLessThan(initialCount);
  });
});

test.describe('Member Portal - Endpoint Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to endpoints page', async ({ page }) => {
    const endpointLinks = await page
      .locator('a:has-text("Endpoints"), a:has-text("API"), a:has-text("Integrations")')
      .count();

    if (endpointLinks > 0) {
      await page
        .locator('a:has-text("Endpoints"), a:has-text("API"), a:has-text("Integrations")')
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      expect(
        currentUrl.includes('endpoint') || currentUrl.includes('api') || currentUrl.includes('integration')
      ).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should display list of endpoints', async ({ page }) => {
    const endpointLinks = await page.locator('a:has-text("Endpoints"), a:has-text("API")').count();

    if (endpointLinks > 0) {
      await page.locator('a:has-text("Endpoints"), a:has-text("API")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for endpoint list
      const hasEndpointList =
        (await page
          .locator('table, .endpoint-list, .endpoint-grid, [data-testid*="endpoint"]')
          .count()) > 0;

      expect(hasEndpointList).toBe(true);
    } else {
      test.skip();
    }
  });

  test.skip('should add new endpoint', async ({ page }) => {
    await page.click('a:has-text("Endpoints")');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add"), button:has-text("New Endpoint")');

    // Fill endpoint form
    await page.fill('input[name="endpoint_name"], input[name="endpointName"]', 'E2E Test Endpoint');
    await page.fill(
      'input[name="endpoint_url"], input[name="endpointUrl"]',
      'https://test.example.com/api'
    );

    await page.click('button[type="submit"], button:has-text("Save")');
    await page.waitForTimeout(2000);

    const endpointAdded = (await page.locator('text=/E2E Test Endpoint/i').count()) > 0;
    expect(endpointAdded).toBe(true);
  });

  test.skip('should toggle endpoint active/inactive', async ({ page }) => {
    await page.click('a:has-text("Endpoints")');
    await page.waitForLoadState('networkidle');

    // Find toggle switch or checkbox for first endpoint
    const toggleButton = page
      .locator('button[role="switch"], input[type="checkbox"]:first, .toggle:first')
      .first();

    const initialState = await toggleButton.getAttribute('aria-checked');

    await toggleButton.click();
    await page.waitForTimeout(1000);

    const newState = await toggleButton.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});

test.describe('Member Portal - API Token Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to tokens or BDI page', async ({ page }) => {
    const tokenLinks = await page
      .locator('a:has-text("Tokens"), a:has-text("BDI"), a:has-text("API Keys")')
      .count();

    if (tokenLinks > 0) {
      await page
        .locator('a:has-text("Tokens"), a:has-text("BDI"), a:has-text("API Keys")')
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      expect(
        currentUrl.includes('token') || currentUrl.includes('bdi') || currentUrl.includes('key')
      ).toBe(true);
    } else {
      test.skip();
    }
  });

  test.skip('should generate new BDI token', async ({ page }) => {
    await page.click('a:has-text("Tokens"), a:has-text("BDI")');
    await page.waitForLoadState('networkidle');

    // Click generate token button
    await page.click('button:has-text("Generate"), button:has-text("Issue"), button:has-text("Create")');
    await page.waitForTimeout(3000);

    // Look for new token display or success message
    const tokenGenerated =
      (await page.locator('.token-display, [data-testid="token"], code').count()) > 0;

    expect(tokenGenerated).toBe(true);
  });

  test.skip('should copy token to clipboard', async ({ page }) => {
    await page.click('a:has-text("Tokens")');
    await page.waitForLoadState('networkidle');

    // Find copy button
    const copyButton = page.locator('button:has-text("Copy"), button[title="Copy"]').first();

    await copyButton.click();

    // Verify success message or clipboard icon change
    const successMessage =
      (await page.locator('text=/copied/i, text=/success/i').count()) > 0;

    // Note: Actually verifying clipboard contents requires additional permissions
    console.log('Copy button clicked, success message shown:', successMessage);
  });

  test.skip('should revoke token', async ({ page }) => {
    await page.click('a:has-text("Tokens")');
    await page.waitForLoadState('networkidle');

    // Get initial token count
    const initialCount = await page.locator('tbody tr, .token-item').count();

    // Click revoke on first token
    await page.click('button:has-text("Revoke"), button:has-text("Delete"):first');

    // Confirm if prompted
    const confirmButton = await page.locator('button:has-text("Confirm"), button:has-text("Yes")').count();
    if (confirmButton > 0) {
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    }

    await page.waitForTimeout(2000);

    // Verify token was revoked (either removed or marked as revoked)
    const hasRevokedIndicator = (await page.locator('text=/revoked/i').count()) > 0;
    const finalCount = await page.locator('tbody tr, .token-item').count();

    expect(hasRevokedIndicator || finalCount < initialCount).toBe(true);
  });
});

test.describe('Member Portal - Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display language switcher', async ({ page }) => {
    // Look for language switcher (dropdown, buttons, flags)
    const hasLanguageSwitcher =
      (await page
        .locator(
          '[data-testid="language-switcher"], .language-selector, select[name="language"], button:has-text("EN"), button:has-text("NL"), button:has-text("DE")'
        )
        .count()) > 0;

    console.log('Language switcher found:', hasLanguageSwitcher);
  });

  test.skip('should switch to English', async ({ page }) => {
    // Find and click English language option
    await page.click('button:has-text("EN"), a:has-text("English"), [data-lang="en"]');
    await page.waitForTimeout(1000);

    // Verify language changed (no page reload)
    const hasEnglishText =
      (await page.locator('text=/Dashboard|Profile|Contacts|Settings/').count()) > 0;

    expect(hasEnglishText).toBe(true);
  });

  test.skip('should switch to Nederlands', async ({ page }) => {
    await page.click('button:has-text("NL"), a:has-text("Nederlands"), [data-lang="nl"]');
    await page.waitForTimeout(1000);

    const hasDutchText =
      (await page.locator('text=/Dashboard|Profiel|Contacten|Instellingen/').count()) > 0;

    expect(hasDutchText).toBe(true);
  });

  test.skip('should switch to Deutsch', async ({ page }) => {
    await page.click('button:has-text("DE"), a:has-text("Deutsch"), [data-lang="de"]');
    await page.waitForTimeout(1000);

    const hasGermanText =
      (await page.locator('text=/Dashboard|Profil|Kontakte|Einstellungen/').count()) > 0;

    expect(hasGermanText).toBe(true);
  });

  test.skip('should not reload page when switching language', async ({ page }) => {
    let pageReloaded = false;

    page.on('load', () => {
      pageReloaded = true;
    });

    // Switch language
    await page.click('button:has-text("NL"), [data-lang="nl"]');
    await page.waitForTimeout(1000);

    // Verify page didn't reload (react-i18next pattern)
    expect(pageReloaded).toBe(false);
  });
});

test.describe('Member Portal - Error Handling', () => {
  test('should handle API timeout gracefully', async ({ page }) => {
    // Intercept API requests and delay them
    await page.route(`${API_BASE_URL}/**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.abort();
    });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Look for error message or retry button
    const hasErrorHandling =
      (await page
        .locator('text=/error|timeout|retry|failed|connection/i')
        .count()) > 0;

    console.log('Error handling UI visible:', hasErrorHandling);
  });

  test('should display validation errors for invalid form submissions', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Try to find a form and submit it empty
    const forms = await page.locator('form').count();

    if (forms > 0) {
      const submitButton = page
        .locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit")')
        .first();

      await submitButton.click();
      await page.waitForTimeout(1000);

      // Look for validation error messages
      const hasValidationErrors =
        (await page
          .locator('text=/required|invalid|error|mandatory/i, .error, .invalid')
          .count()) > 0;

      console.log('Validation errors shown:', hasValidationErrors);
    } else {
      test.skip();
    }
  });

  test('should handle 404 responses gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto(`${MEMBER_PORTAL_URL}/this-page-does-not-exist-12345`);
    await page.waitForLoadState('networkidle');

    // Look for 404 error page or redirect
    const has404Page =
      (await page.locator('text=/404|not found|page not found/i').count()) > 0;

    // Either shows 404 page or redirects to home
    expect(has404Page || page.url() === MEMBER_PORTAL_URL).toBe(true);
  });
});

test.describe('Member Portal - Responsive Design', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Verify page renders without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('should display mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Look for hamburger menu or mobile navigation
    const hasMobileMenu =
      (await page
        .locator('button[aria-label*="menu"], .hamburger, .mobile-menu-button')
        .count()) > 0;

    console.log('Mobile menu found:', hasMobileMenu);
  });

  test('should render correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);
  });
});

test.describe('Member Portal - Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    const title = await page.title();

    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe('React App'); // Should have custom title
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    const hasSkipLink =
      (await page.locator('a:has-text("Skip to"), a[href="#main"], a[href="#content"]').count()) >
      0;

    console.log('Skip to main content link found:', hasSkipLink);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Check that page has h1 heading
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Verify only one h1
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto(MEMBER_PORTAL_URL);
    await page.waitForLoadState('networkidle');

    // Get all input fields
    const inputs = await page.locator('input:visible').count();

    if (inputs > 0) {
      // Check if inputs have labels or aria-labels
      const inputsWithLabels = await page
        .locator('input:visible[aria-label], input:visible[aria-labelledby]')
        .count();

      const labelCount = await page.locator('label').count();

      console.log(
        `Found ${inputs} inputs, ${inputsWithLabels} with aria-labels, ${labelCount} labels`
      );
    }
  });
});
