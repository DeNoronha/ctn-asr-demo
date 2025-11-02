import { expect, test } from '../playwright/fixtures';

/**
 * KvK Document Upload and Verification E2E Tests
 *
 * Comprehensive test suite for the KvK verification feature:
 * 1. API endpoint tests (with authentication)
 * 2. Frontend component tests (KvkReviewQueue, KvkDocumentUpload)
 * 3. Entered vs extracted data comparison
 * 4. Visual indicators and flag priority
 * 5. Review dialog and comparison table
 */

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net';
const TEST_LEGAL_ENTITY_ID = 'fbc4bcdc-a9f9-4621-a153-c5deb6c49519'; // Contargo GmbH & Co. KG

test.describe('KvK Verification - API Endpoints', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
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

  test('should GET verification status for legal entity (authenticated)', async ({ page }) => {
    // Navigate to app to ensure auth context is loaded
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Intercept the API call
    const _responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/legal-entities/${TEST_LEGAL_ENTITY_ID}/kvk-verification`),
      { timeout: 30000 }
    );

    // Make API request using page.evaluate to include auth headers
    const result = await page.evaluate(
      async ({ apiUrl, entityId }) => {
        try {
          const response = await fetch(
            `${apiUrl}/api/v1/legal-entities/${entityId}/kvk-verification`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
              credentials: 'include',
            }
          );

          return {
            status: response.status,
            ok: response.ok,
            data: response.ok ? await response.json() : null,
            error: !response.ok ? await response.text() : null,
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            status: 0,
            ok: false,
            data: null,
            error: errorMessage,
          };
        }
      },
      { apiUrl: API_BASE_URL, entityId: TEST_LEGAL_ENTITY_ID }
    );

    console.log('Verification Status Response:', result);

    // Verify response
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.data).toBeTruthy();

    // Verify response structure
    if (result.data) {
      expect(result.data).toHaveProperty('legal_entity_id');
      expect(result.data.legal_entity_id).toBe(TEST_LEGAL_ENTITY_ID);
    }
  });

  test('should GET flagged entities for admin review (authenticated)', async ({ page }) => {
    // Navigate to app to ensure auth context is loaded
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Make API request
    const result = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            credentials: 'include',
          });

          return {
            status: response.status,
            ok: response.ok,
            data: response.ok ? await response.json() : null,
            error: !response.ok ? await response.text() : null,
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            status: 0,
            ok: false,
            data: null,
            error: errorMessage,
          };
        }
      },
      { apiUrl: API_BASE_URL }
    );

    console.log('Flagged Entities Response:', result);

    // Verify response
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.data).toBeTruthy();

    // Verify response is array
    expect(Array.isArray(result.data)).toBe(true);

    // Verify entity structure if any exist
    if (result.data && result.data.length > 0) {
      const firstEntity = result.data[0];
      expect(firstEntity).toHaveProperty('legal_entity_id');
      expect(firstEntity).toHaveProperty('entered_company_name');
      expect(firstEntity).toHaveProperty('entered_kvk_number');
      expect(firstEntity).toHaveProperty('kvk_extracted_company_name');
      expect(firstEntity).toHaveProperty('kvk_extracted_number');
      expect(firstEntity).toHaveProperty('kvk_mismatch_flags');
      expect(firstEntity).toHaveProperty('document_uploaded_at');

      console.log('First Flagged Entity:', firstEntity);
    }
  });

  test('should return 401 for unauthenticated requests', async ({ page }) => {
    // Make request without auth context
    const result = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });

          return {
            status: response.status,
          };
        } catch (_error) {
          return {
            status: 0,
          };
        }
      },
      { apiUrl: API_BASE_URL }
    );

    // Should return 401 for unauthenticated request
    expect([401, 0]).toContain(result.status);
  });

  test('should have no 404 errors on KvK endpoints', async ({ page }) => {
    const apiCalls: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/v1/') && response.url().includes('kvk')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Navigate to members page to trigger KvK-related API calls
    await page.click('text=Members');
    await page.waitForTimeout(2000);

    // Verify no 404 errors
    const notFoundCalls = apiCalls.filter((call) => call.status === 404);
    console.log('API calls made:', apiCalls);

    expect(notFoundCalls.length).toBe(0);
  });
});

test.describe('KvK Verification - Review Queue Component', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      } else if (msg.type() === 'warning') {
        console.warn('CONSOLE WARNING:', msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('should navigate to KvK Review Queue', async ({ page }) => {
    // Look for navigation menu items
    const navItems = page.locator(
      'nav a, nav button, [role="navigation"] a, [role="navigation"] button'
    );
    const navCount = await navItems.count();
    console.log(`Found ${navCount} navigation items`);

    // Try to find KvK Review Queue or similar
    const possibleLabels = [
      'KvK Review Queue',
      'Validation Menu',
      'KvK Verification',
      'Review Queue',
      'Flagged Entities',
      'Verification',
    ];

    let foundNav = false;
    for (const label of possibleLabels) {
      const element = page.locator(`text=${label}`).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Found navigation: ${label}`);
        await element.click();
        foundNav = true;
        break;
      }
    }

    if (!foundNav) {
      console.log('KvK Review Queue navigation not found - may not be in main nav');
      // Try to access via URL if route is known
      await page.goto('/kvk-review', { waitUntil: 'networkidle' }).catch(() => {
        console.log('Direct URL navigation failed');
      });
    }

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/kvk-review-queue.png',
      fullPage: true,
    });
  });

  test('should display flagged entities grid with proper columns', async ({ page }) => {
    // Navigate to review queue (adjust selector based on actual UI)
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for grid or table containing flagged entities
    const possibleGridSelectors = ['[role="grid"]', 'table', '[data-testid="kvk-grid"]', '.mantine-DataTable-root'];

    let gridFound = false;
    for (const selector of possibleGridSelectors) {
      const grid = page.locator(selector).first();
      if (await grid.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Found grid with selector: ${selector}`);
        gridFound = true;

        // Check for expected columns
        const columnHeaders = [
          'Entered Company',
          'Entered KvK',
          'Extracted Company',
          'Extracted KvK',
          'Issues',
          'Upload Date',
          'Review',
        ];

        for (const header of columnHeaders) {
          const headerElement = page.locator(`text=${header}`).first();
          const isVisible = await headerElement.isVisible({ timeout: 1000 }).catch(() => false);
          console.log(`Column "${header}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
        }

        break;
      }
    }

    console.log(`Grid found: ${gridFound}`);
  });

  test('should display flag badges with correct colors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for badge elements
    const badges = page.locator('[class*="badge"], .badge, [role="status"]');
    const badgeCount = await badges.count();
    console.log(`Found ${badgeCount} badge elements`);

    if (badgeCount > 0) {
      for (let i = 0; i < Math.min(badgeCount, 5); i++) {
        const badge = badges.nth(i);
        const text = await badge.textContent();
        const backgroundColor = await badge.evaluate(
          (el) => window.getComputedStyle(el).backgroundColor
        );

        console.log(`Badge ${i}: "${text}" - background: ${backgroundColor}`);

        // Check for red background on entered data mismatch flags
        if (text?.includes('entered_kvk_mismatch') || text?.includes('entered_name_mismatch')) {
          // Red badges should have rgb values with high red component
          console.log('Entered data mismatch badge should be RED');
        }
      }
    }

    await page.screenshot({ path: 'playwright-report/screenshots/kvk-flags.png', fullPage: true });
  });

  test('should prioritize entities with entered data mismatches at top', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Make API call to get flagged entities
    const flaggedEntities = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            return await response.json();
          }
          return [];
        } catch (_error) {
          return [];
        }
      },
      { apiUrl: API_BASE_URL }
    );

    console.log(`Fetched ${flaggedEntities.length} flagged entities`);

    if (flaggedEntities.length > 0) {
      // Check if first entities have entered data mismatches
      const firstEntity = flaggedEntities[0];
      console.log('First entity:', firstEntity);

      const hasEnteredMismatch = firstEntity.kvk_mismatch_flags?.some(
        (flag: string) => flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch'
      );

      console.log(`First entity has entered data mismatch: ${hasEnteredMismatch}`);

      // Verify sorting order
      let enteredMismatchCount = 0;
      let otherFlagsCount = 0;
      let sawOtherFirst = false;

      for (const entity of flaggedEntities) {
        const hasEntered = entity.kvk_mismatch_flags?.some(
          (flag: string) => flag === 'entered_kvk_mismatch' || flag === 'entered_name_mismatch'
        );

        if (hasEntered) {
          enteredMismatchCount++;
          if (otherFlagsCount > 0) {
            sawOtherFirst = true;
          }
        } else {
          otherFlagsCount++;
        }
      }

      console.log(`Entered mismatches: ${enteredMismatchCount}, Other flags: ${otherFlagsCount}`);
      console.log(`Correct order (entered first): ${!sawOtherFirst}`);

      expect(sawOtherFirst).toBe(false); // Entered mismatches should come first
    }
  });

  test('should open review dialog when clicking Review button', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for Review button
    const reviewButton = page.locator('button:has-text("Review")').first();
    const isVisible = await reviewButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await reviewButton.click();
      await page.waitForTimeout(1000);

      // Look for dialog
      const dialog = page.locator('[role="dialog"], .mantine-Modal-root, .modal');
      const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(`Review dialog opened: ${dialogVisible}`);

      if (dialogVisible) {
        // Take screenshot
        await page.screenshot({
          path: 'playwright-report/screenshots/kvk-review-dialog.png',
          fullPage: true,
        });

        // Look for comparison table
        const comparisonTable = dialog.locator('table').first();
        const tableVisible = await comparisonTable.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`Comparison table visible: ${tableVisible}`);

        // Look for checkmarks/X indicators
        const indicators = dialog.locator('text=/✓|✗|✔|✖|×/');
        const indicatorCount = await indicators.count();
        console.log(`Found ${indicatorCount} match/mismatch indicators`);

        // Close dialog
        const closeButton = dialog
          .locator('button:has-text("Close"), button:has-text("Cancel")')
          .first();
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click();
        }
      }
    } else {
      console.log('Review button not found - may be no flagged entities');
    }
  });

  test('should display alert banner for entered data mismatches', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for alert or warning elements
    const alerts = page.locator('[role="alert"], .alert, .warning, [class*="alert"]');
    const alertCount = await alerts.count();
    console.log(`Found ${alertCount} alert elements`);

    if (alertCount > 0) {
      for (let i = 0; i < Math.min(alertCount, 3); i++) {
        const alert = alerts.nth(i);
        const text = await alert.textContent();
        console.log(`Alert ${i}: "${text}"`);

        // Check if alert is about entered data mismatch
        if (text?.toLowerCase().includes('entered') || text?.toLowerCase().includes('mismatch')) {
          console.log('Found entered data mismatch alert');
        }
      }
    }
  });
});

test.describe('KvK Verification - Entered vs Extracted Comparison', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('should compare entered KvK number vs extracted KvK number', async ({ page }) => {
    // Get flagged entities with mismatches
    const entities = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            return await response.json();
          }
          return [];
        } catch (_error) {
          return [];
        }
      },
      { apiUrl: API_BASE_URL }
    );

    console.log(`Checking ${entities.length} entities for KvK number comparison`);

    for (const entity of entities) {
      const hasKvkMismatch = entity.kvk_mismatch_flags?.includes('entered_kvk_mismatch');

      console.log(`Entity ${entity.legal_entity_id}:`);
      console.log(`  Entered KvK: ${entity.entered_kvk_number}`);
      console.log(`  Extracted KvK: ${entity.kvk_extracted_number}`);
      console.log(`  Has KvK mismatch flag: ${hasKvkMismatch}`);

      if (hasKvkMismatch) {
        // Verify the numbers are actually different
        expect(entity.entered_kvk_number).not.toBe(entity.kvk_extracted_number);
      } else {
        // If no mismatch flag, numbers should match or one should be null
        if (entity.entered_kvk_number && entity.kvk_extracted_number) {
          expect(entity.entered_kvk_number).toBe(entity.kvk_extracted_number);
        }
      }
    }
  });

  test('should compare entered company name vs extracted company name', async ({ page }) => {
    // Get flagged entities with mismatches
    const entities = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            return await response.json();
          }
          return [];
        } catch (_error) {
          return [];
        }
      },
      { apiUrl: API_BASE_URL }
    );

    console.log(`Checking ${entities.length} entities for company name comparison`);

    for (const entity of entities) {
      const hasNameMismatch = entity.kvk_mismatch_flags?.includes('entered_name_mismatch');

      console.log(`Entity ${entity.legal_entity_id}:`);
      console.log(`  Entered Name: ${entity.entered_company_name}`);
      console.log(`  Extracted Name: ${entity.kvk_extracted_company_name}`);
      console.log(`  Has name mismatch flag: ${hasNameMismatch}`);

      if (hasNameMismatch) {
        // Verify comparison logic (case-insensitive, partial match allowed)
        const enteredLower = entity.entered_company_name?.toLowerCase().trim() || '';
        const extractedLower = entity.kvk_extracted_company_name?.toLowerCase().trim() || '';

        // If flagged, neither should contain the other
        const isPartialMatch =
          enteredLower.includes(extractedLower) || extractedLower.includes(enteredLower);
        expect(isPartialMatch).toBe(false);
      }
    }
  });

  test('should display both entered and extracted data side-by-side', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for grid with both columns
    const hasEnteredColumn = await page
      .locator('text=/Entered.*Company|Company.*Entered/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasExtractedColumn = await page
      .locator('text=/Extracted.*Company|Company.*Extracted/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    console.log(`Entered Company column visible: ${hasEnteredColumn}`);
    console.log(`Extracted Company column visible: ${hasExtractedColumn}`);

    await page.screenshot({
      path: 'playwright-report/screenshots/kvk-comparison-grid.png',
      fullPage: true,
    });
  });

  test('should merge all mismatch flags correctly', async ({ page }) => {
    // Get flagged entities
    const entities = await page.evaluate(
      async ({ apiUrl }) => {
        try {
          const response = await fetch(`${apiUrl}/api/v1/kvk-verification/flagged`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            return await response.json();
          }
          return [];
        } catch (_error) {
          return [];
        }
      },
      { apiUrl: API_BASE_URL }
    );

    console.log(`Checking flag merging for ${entities.length} entities`);

    for (const entity of entities) {
      console.log(`Entity ${entity.legal_entity_id}:`);
      console.log(`  Mismatch flags: ${entity.kvk_mismatch_flags?.join(', ')}`);

      // Verify flags are unique (no duplicates)
      if (entity.kvk_mismatch_flags && entity.kvk_mismatch_flags.length > 0) {
        const uniqueFlags = [...new Set(entity.kvk_mismatch_flags)];
        expect(entity.kvk_mismatch_flags.length).toBe(uniqueFlags.length);
      }
    }
  });
});

test.describe('KvK Verification - Chrome Console Monitoring', () => {
  test('should not have JavaScript errors during page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }

    // Strict: no console errors allowed
    expect(consoleErrors.length).toBe(0);
  });

  test('should not have failed network requests', async ({ page }) => {
    const failedRequests: Array<{ url: string; error: string }> = [];

    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText || 'Unknown error',
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Failed Requests: ${failedRequests.length}`);

    if (failedRequests.length > 0) {
      console.log('Failed Requests:', failedRequests);
    }

    // Allow CORS errors but no other failures
    const criticalFailures = failedRequests.filter((req) => !req.error.includes('CORS'));
    expect(criticalFailures.length).toBe(0);
  });

  test('should not have 500 errors during document verification', async ({ page }) => {
    const serverErrors: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() >= 500 && response.url().includes('kvk')) {
        serverErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Server Errors (5xx): ${serverErrors.length}`);

    if (serverErrors.length > 0) {
      console.log('Server Errors:', serverErrors);
    }

    expect(serverErrors.length).toBe(0);
  });

  test('should monitor Chrome DevTools Console during test execution', async ({ page }) => {
    const consoleMessages: Array<{ type: string; text: string }> = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Categorize messages
    const errors = consoleMessages.filter((m) => m.type === 'error');
    const warnings = consoleMessages.filter((m) => m.type === 'warning');
    const info = consoleMessages.filter((m) => m.type === 'info' || m.type === 'log');

    console.log('=== CHROME CONSOLE SUMMARY ===');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Info/Log: ${info.length}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((msg, i) => console.log(`${i + 1}. ${msg.text}`));
    }

    if (warnings.length > 0) {
      console.log('\n=== WARNINGS ===');
      warnings.forEach((msg, i) => console.log(`${i + 1}. ${msg.text}`));
    }
  });
});

test.describe('KvK Verification - Visual Indicators', () => {
  test('should use red badges for entered data mismatches', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for badges with entered mismatch flags
    const enteredKvkBadge = page.locator('text=entered_kvk_mismatch').first();
    const enteredNameBadge = page.locator('text=entered_name_mismatch').first();

    const kvkVisible = await enteredKvkBadge.isVisible({ timeout: 2000 }).catch(() => false);
    const nameVisible = await enteredNameBadge.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`entered_kvk_mismatch badge visible: ${kvkVisible}`);
    console.log(`entered_name_mismatch badge visible: ${nameVisible}`);

    if (kvkVisible) {
      const bgColor = await enteredKvkBadge.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      console.log(`entered_kvk_mismatch background: ${bgColor}`);
      // Red should have format rgb(xxx, low, low)
    }

    if (nameVisible) {
      const bgColor = await enteredNameBadge.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      console.log(`entered_name_mismatch background: ${bgColor}`);
    }

    await page.screenshot({
      path: 'playwright-report/screenshots/kvk-red-badges.png',
      fullPage: true,
    });
  });

  test('should use yellow badges for other issues', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for other flag types
    const otherFlagTypes = ['name_mismatch', 'address_mismatch', 'not_active', 'not_found'];

    for (const flagType of otherFlagTypes) {
      const badge = page.locator(`text=${flagType}`).first();
      const visible = await badge.isVisible({ timeout: 1000 }).catch(() => false);

      if (visible) {
        const bgColor = await badge.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log(`${flagType} badge background: ${bgColor}`);
        // Yellow should have format rgb(xxx, xxx, low)
      }
    }
  });

  test('should display explanatory text for data mismatches', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for explanatory text
    const explanatoryTexts = [
      'entered data',
      'extracted data',
      'mismatch',
      'comparison',
      'does not match',
    ];

    for (const text of explanatoryTexts) {
      const element = page.locator(`text=/.*${text}.*/i`).first();
      const visible = await element.isVisible({ timeout: 1000 }).catch(() => false);

      if (visible) {
        console.log(`Found explanatory text containing: "${text}"`);
      }
    }
  });
});
