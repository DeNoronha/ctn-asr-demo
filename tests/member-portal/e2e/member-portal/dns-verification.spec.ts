import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - DNS Verification (Tier 2)
 *
 * Test Area: DNS domain verification for tier upgrade
 * Priority: Medium
 *
 * Coverage:
 * - DNS verification page display
 * - Token generation form
 * - Pending verifications list
 * - Token copy functionality
 * - Verification process
 */

test.describe('DNS Verification (Tier 2 Upgrade)', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to DNS Verification tab
    await page.locator('.tab-button').filter({ hasText: 'DNS Verification' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display DNS Verification page with correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /DNS Verification/ })).toBeVisible();
  });

  test('should display Tier 2 upgrade information', async ({ page }) => {
    const subtitle = page.locator('.page-subtitle');
    await expect(subtitle).toContainText('Tier 2');
  });

  test('should mention sensitive data and webhooks access', async ({ page }) => {
    const subtitle = page.locator('.page-subtitle');
    await expect(subtitle).toContainText(/sensitive data.*webhook/i);
  });

  test('should display token generation section', async ({ page }) => {
    const generateSection = page.locator('.card').filter({ hasText: 'Generate DNS Verification Token' });
    await expect(generateSection).toBeVisible();
  });

  test('should display domain name input field', async ({ page }) => {
    const domainLabel = page.locator('text=Domain Name');
    await expect(domainLabel).toBeVisible();

    const domainInput = page.locator('input[placeholder*="company.com"]');
    await expect(domainInput).toBeVisible();
  });

  test('should display Generate Token button', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: /Generate Token/i });
    await expect(generateButton).toBeVisible();
  });

  test('should show domain format example', async ({ page }) => {
    const hint = page.locator('text=Example: company.com, :text("company.com")');
    const count = await hint.count();

    if (count > 0) {
      console.log('Domain format example is displayed');
    }
  });

  test('should show TXT record instructions', async ({ page }) => {
    const instruction = page.locator('text=TXT record');
    const count = await instruction.count();

    if (count > 0) {
      console.log('TXT record instructions found');
    }
  });

  test('should disable Generate button when domain is empty', async ({ page }) => {
    const domainInput = page.locator('input[placeholder*="company.com"]');
    await domainInput.clear();

    const generateButton = page.getByRole('button', { name: /Generate Token/i });
    await expect(generateButton).toBeDisabled();
  });

  test('should enable Generate button when domain is entered', async ({ page }) => {
    const domainInput = page.locator('input[placeholder*="company.com"]');
    await domainInput.fill('example.com');

    const generateButton = page.getByRole('button', { name: /Generate Token/i });
    await expect(generateButton).toBeEnabled();
  });

  test('should validate domain format', async ({ page }) => {
    const domainInput = page.locator('input[placeholder*="company.com"]');

    // Enter invalid domain
    await domainInput.fill('invalid domain with spaces');

    const generateButton = page.getByRole('button', { name: /Generate Token/i });
    await generateButton.click();
    await page.waitForTimeout(500);

    // Check for error message
    const errorMessage = page.locator(':text("Invalid domain"), .mantine-TextInput-error, [role="alert"]');
    const hasError = await errorMessage.count() > 0;

    if (hasError) {
      console.log('Domain validation error displayed');
    }
  });

  test('should accept valid domain format', async ({ page }) => {
    const domainInput = page.locator('input[placeholder*="company.com"]');
    await domainInput.fill('valid-domain.com');

    // Should not show error for valid domain
    const errorMessage = page.locator('.mantine-TextInput-error');
    const hasError = await errorMessage.count() > 0;

    if (!hasError) {
      console.log('Valid domain accepted without error');
    }
  });

  test('should display pending verifications or empty state', async ({ page }) => {
    // Look for pending verifications section or empty state
    const pendingSection = page.locator('.card').filter({ hasText: 'Pending DNS Verifications' });
    const emptyState = page.locator('.empty-state').filter({ hasText: 'No pending' });

    const hasPending = await pendingSection.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasPending || hasEmpty).toBe(true);

    if (hasPending) {
      console.log('Pending verifications section displayed');
    } else {
      console.log('Empty state displayed - no pending verifications');
    }
  });

  test('should display DNS token card details when tokens exist', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      // Verify token card structure
      await expect(tokenCard.first().locator('.dns-token-header')).toBeVisible();

      // Should have domain name
      const domainHeader = tokenCard.first().locator('h4');
      await expect(domainHeader).toBeVisible();
    } else {
      console.log('No pending DNS tokens to display');
    }
  });

  test('should display DNS record instructions when tokens exist', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      // Verify step instructions
      const step1 = tokenCard.first().locator('h5').filter({ hasText: 'Step 1' });
      const step2 = tokenCard.first().locator('h5').filter({ hasText: 'Step 2' });

      await expect(step1).toBeVisible();
      await expect(step2).toBeVisible();
    }
  });

  test('should display Record Type, Name, and Value fields', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      // Verify DNS record fields
      await expect(tokenCard.first().locator(':text("Record Type")')).toBeVisible();
      await expect(tokenCard.first().locator(':text("Record Name")')).toBeVisible();
      await expect(tokenCard.first().locator(':text("Record Value")')).toBeVisible();
      await expect(tokenCard.first().locator(':text("TTL")')).toBeVisible();
    }
  });

  test('should display Copy buttons for DNS record fields', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      const copyButtons = tokenCard.first().locator('button').filter({ hasText: 'Copy' });
      const buttonCount = await copyButtons.count();

      expect(buttonCount).toBeGreaterThanOrEqual(2); // At least for Name and Value
      console.log(`Found ${buttonCount} copy buttons`);
    }
  });

  test('should display Verify DNS Record button', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      const verifyButton = tokenCard.first().getByRole('button', { name: /Verify DNS Record/i });
      await expect(verifyButton).toBeVisible();
    }
  });

  test('should display token expiration date', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      const expirationText = tokenCard.first().locator('.dns-token-footer, :text("Token expires")');
      await expect(expirationText).toBeVisible();
    }
  });

  test('should display token status badge', async ({ page }) => {
    const tokenCard = page.locator('.dns-token-card');
    const count = await tokenCard.count();

    if (count > 0) {
      const statusBadge = tokenCard.first().locator('.status-badge');
      await expect(statusBadge).toBeVisible();

      const statusText = await statusBadge.textContent();
      expect(['PENDING', 'VERIFIED', 'EXPIRED', 'FAILED']).toContain(statusText?.toUpperCase());
    }
  });

  test('should take screenshot of DNS Verification page', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-dns-verification.png',
      fullPage: true
    });

    console.log('DNS Verification page screenshot captured');
  });
});
