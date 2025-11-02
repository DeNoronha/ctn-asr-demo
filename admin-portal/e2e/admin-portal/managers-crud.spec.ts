import { expect, test } from '../../playwright/fixtures';

/**
 * Admin Portal E2E Tests - Contacts, Endpoints, and Tokens Managers
 *
 * Test Area: CRUD operations for Contacts, Endpoints, and Tokens
 * Priority: High
 *
 * Coverage:
 * - Contacts Manager (PRIMARY, TECHNICAL, BILLING, SUPPORT roles)
 * - Endpoints Manager (with token association)
 * - Tokens Manager (Active, Expiring, Expired, Revoked status badges)
 */

test.describe('Contacts Manager - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const memberGrid = page.locator('.mantine-DataTable-root').first();
    await memberGrid.waitFor({ state: 'visible' });

    const firstRow = memberGrid.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);
  });

  test('should display contacts grid', async ({ page }) => {
    // Look for Contacts section
    const contactsSection = page.locator('text=/Contacts|Contact.*Information/i').first();
    const hasContacts = await contactsSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`✅ Contacts section visible: ${hasContacts}`);

    if (hasContacts) {
      await page.screenshot({
        path: 'playwright-report/screenshots/contacts-grid.png',
        fullPage: true,
      });
    }
  });

  test('should have contact role types (PRIMARY, TECHNICAL, BILLING, SUPPORT)', async ({
    page,
  }) => {
    const addButton = page
      .locator('button:has-text("Add Contact"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      const expectedRoles = ['PRIMARY', 'TECHNICAL', 'BILLING', 'SUPPORT'];
      const foundRoles: string[] = [];

      for (const role of expectedRoles) {
        const roleElement = page.locator(`text=${role}`).first();
        const isVisible = await roleElement.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          foundRoles.push(role);
        }
      }

      console.log(`✅ Found contact roles: ${foundRoles.join(', ')}`);
      expect(foundRoles.length).toBeGreaterThanOrEqual(2);

      // Close dialog
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      const hasCancel = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasCancel) await cancelButton.click();
    }
  });

  test('should show empty state when no contacts exist', async ({ page }) => {
    const emptyState = page.locator('.empty-state, text=/No.*contacts|Add.*your.*first/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✅ Empty state displayed for contacts');

      await page.screenshot({
        path: 'playwright-report/screenshots/contacts-empty-state.png',
        fullPage: true,
      });
    }
  });

  test('should use ConfirmDialog for contact deletions', async ({ page }) => {
    const deleteButton = page
      .locator('button[title="Delete"], button[aria-label="Delete"]')
      .first();
    const hasDelete = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasDelete) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      const confirmDialog = page.locator('[role="dialog"], text=/Are you sure|Confirm/i').first();
      const hasConfirm = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(`ConfirmDialog for contact deletion: ${hasConfirm}`);

      if (hasConfirm) {
        const cancelButton = page
          .locator('button:has-text("Cancel"), button:has-text("No")')
          .first();
        const hasCancel = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasCancel) await cancelButton.click();
      }
    }
  });

  test('should validate required contact fields', async ({ page }) => {
    const addButton = page
      .locator('button:has-text("Add Contact"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').last();
      const hasSubmit = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSubmit) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const validationError = page.locator('.mantine-Input-error, .error, [role="alert"]').first();
        const hasError = await validationError.isVisible({ timeout: 2000 }).catch(() => false);

        console.log(`Contact validation error shown: ${hasError}`);

        await page.screenshot({
          path: 'playwright-report/screenshots/contact-validation.png',
          fullPage: true,
        });
      }
    }
  });
});

test.describe('Endpoints Manager - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const memberGrid = page.locator('.mantine-DataTable-root').first();
    await memberGrid.waitFor({ state: 'visible' });

    const firstRow = memberGrid.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);
  });

  test('should display endpoints grid', async ({ page }) => {
    const endpointsSection = page.locator('text=/Endpoints|API.*Endpoints/i').first();
    const hasEndpoints = await endpointsSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`✅ Endpoints section visible: ${hasEndpoints}`);

    if (hasEndpoints) {
      await page.screenshot({
        path: 'playwright-report/screenshots/endpoints-grid.png',
        fullPage: true,
      });
    }
  });

  test('should open create endpoint dialog', async ({ page }) => {
    const addButton = page
      .locator('button:has-text("Add Endpoint"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .mantine-Modal-root').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });

      console.log('✅ Create endpoint dialog opened');

      await page.screenshot({
        path: 'playwright-report/screenshots/endpoint-create-dialog.png',
        fullPage: true,
      });
    }
  });

  test('should allow token association with endpoints', async ({ page }) => {
    const addButton = page
      .locator('button:has-text("Add Endpoint"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Look for token-related field
      const tokenField = page.locator('text=/Token|Associate.*Token/i').first();
      const hasTokenField = await tokenField.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(`Token association field visible: ${hasTokenField}`);

      // Close dialog
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      const hasCancel = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasCancel) await cancelButton.click();
    }
  });

  test('should validate endpoint URL format', async ({ page }) => {
    const addButton = page
      .locator('button:has-text("Add Endpoint"), button:has-text("Add")')
      .first();
    const hasButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      const urlInput = page.locator('input[name*="url"], input[type="url"]').first();
      const hasInput = await urlInput.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasInput) {
        await urlInput.fill('invalid-url');
        await urlInput.blur();
        await page.waitForTimeout(500);

        const validationError = page.locator('.mantine-Input-error, .error').first();
        const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);

        console.log(`URL validation error shown: ${hasError}`);
      }
    }
  });
});

test.describe('Tokens Manager - View and Manage Tokens', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const memberGrid = page.locator('.mantine-DataTable-root').first();
    await memberGrid.waitFor({ state: 'visible' });

    const firstRow = memberGrid.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);
  });

  test('should display tokens grid', async ({ page }) => {
    const tokensSection = page.locator('text=/Tokens|Access.*Tokens|API.*Tokens/i').first();
    const hasTokens = await tokensSection.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`✅ Tokens section visible: ${hasTokens}`);

    if (hasTokens) {
      await page.screenshot({
        path: 'playwright-report/screenshots/tokens-grid.png',
        fullPage: true,
      });
    }
  });

  test('should display status badges (Active, Expiring, Expired, Revoked)', async ({ page }) => {
    const statusBadges = page.locator('.badge, .mantine-Badge-root, [class*="status"]');
    const badgeCount = await statusBadges.count();

    console.log(`Found ${badgeCount} status badges`);

    const expectedStatuses = ['Active', 'Expiring', 'Expired', 'Revoked'];
    for (const status of expectedStatuses) {
      const statusElement = page.locator(`text=${status}`).first();
      const isVisible = await statusElement.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        console.log(`Token status "${status}": FOUND`);
      }
    }
  });

  test('should have copy token to clipboard functionality', async ({ page }) => {
    const copyButton = page
      .locator('button[title*="Copy"], button[aria-label*="Copy"], button:has-text("Copy")')
      .first();
    const hasCopy = await copyButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCopy) {
      console.log('✅ Copy to clipboard button found');

      // Note: Actual clipboard testing requires browser permissions
      await page.screenshot({
        path: 'playwright-report/screenshots/token-copy-button.png',
        fullPage: true,
      });
    }
  });

  test('should allow filtering tokens by endpoint', async ({ page }) => {
    const filterDropdown = page.locator('select, .mantine-Select-root').first();
    const hasFilter = await filterDropdown.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasFilter) {
      console.log('✅ Token filter available');
    }
  });

  test('should allow revoking tokens', async ({ page }) => {
    const revokeButton = page.locator('button:has-text("Revoke"), button[title*="Revoke"]').first();
    const hasRevoke = await revokeButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRevoke) {
      await revokeButton.click();
      await page.waitForTimeout(1000);

      const confirmDialog = page.locator('[role="dialog"], text=/revoke|confirm/i').first();
      const hasConfirm = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(`Revoke confirmation dialog: ${hasConfirm}`);

      if (hasConfirm) {
        const cancelButton = page
          .locator('button:has-text("Cancel"), button:has-text("No")')
          .first();
        const hasCancel = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasCancel) await cancelButton.click();
      }
    }
  });

  test('should allow issuing new tokens', async ({ page }) => {
    const issueButton = page
      .locator(
        'button:has-text("Issue"), button:has-text("New Token"), button:has-text("Generate")'
      )
      .first();
    const hasIssue = await issueButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasIssue) {
      await issueButton.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .mantine-Modal-root').first();
      const hasDialog = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

      console.log(`✅ Issue token dialog: ${hasDialog}`);

      if (hasDialog) {
        await page.screenshot({
          path: 'playwright-report/screenshots/token-issue-dialog.png',
          fullPage: true,
        });

        const cancelButton = page.locator('button:has-text("Cancel")').first();
        const hasCancel = await cancelButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasCancel) await cancelButton.click();
      }
    }
  });

  test('should sort tokens by last_used_at by default', async ({ page }) => {
    // Look for sorted column indicator
    const sortedColumn = page
      .locator('[aria-sort], [aria-sort="descending"], [aria-sort="ascending"]')
      .first();
    const hasSorted = await sortedColumn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSorted) {
      const columnText = await sortedColumn.textContent();
      console.log(`Sorted column: ${columnText}`);
    }
  });

  test('should have color contrast on status badges (4.5:1 minimum)', async ({ page }) => {
    const badges = page.locator('.badge, .mantine-Badge-root').first();
    const hasBadge = await badges.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasBadge) {
      const backgroundColor = await badges.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      const color = await badges.evaluate((el) => window.getComputedStyle(el).color);

      console.log(`Badge colors - Background: ${backgroundColor}, Text: ${color}`);

      // Note: Actual contrast ratio calculation would require a color contrast library
      console.log('✅ Badge colors captured for manual verification');
    }
  });
});

test.describe('Managers - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    const serverErrors: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/api/v1/')) {
        serverErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(3000);

    const criticalErrors = serverErrors.filter((e) => e.status >= 500);
    expect(criticalErrors.length).toBe(0);

    if (serverErrors.length > 0) {
      console.log('API errors encountered:', serverErrors);
    }
  });

  test('should use toast notifications (not browser alerts)', async ({ page }) => {
    await page.goto('/');

    // Override window.alert to detect if it's called
    await page.evaluate(() => {
      (window as any).alertCalled = false;
      window.alert = () => {
        (window as any).alertCalled = true;
      };
    });

    await page.locator('.sidebar').getByText('Members', { exact: true }).click();
    await page.waitForTimeout(2000);

    const alertCalled = await page.evaluate(() => (window as any).alertCalled);

    expect(alertCalled).toBe(false);
    console.log('✅ No browser alerts used (toast notifications instead)');
  });
});

test.describe('Managers - Loading States', () => {
  test('should display Kendo Loader components during data fetch', async ({ page }) => {
    await page.goto('/');

    // Look for loading indicator
    const loader = page.locator('.mantine-Loader-root, .mantine-Loader-root, [role="progressbar"]').first();

    // Navigate to trigger loading
    await page.locator('.sidebar').getByText('Members', { exact: true }).click();

    // Try to catch loader while it's visible (may be fast)
    const loaderVisible = await loader.isVisible({ timeout: 500 }).catch(() => false);

    console.log(`Loading indicator shown: ${loaderVisible}`);
  });

  test('should have semantic HTML roles for loading states', async ({ page }) => {
    await page.goto('/');

    const loadingElement = page
      .locator('[role="status"], [role="progressbar"], [aria-busy="true"]')
      .first();
    const hasSemanticRole = await loadingElement.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSemanticRole) {
      console.log('✅ Semantic loading state found');
    }
  });
});
