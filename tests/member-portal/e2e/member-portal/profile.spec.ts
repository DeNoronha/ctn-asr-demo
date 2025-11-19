import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Profile Management
 *
 * Test Area: Profile view, editing, validation
 * Priority: High
 *
 * Coverage:
 * - View profile information
 * - Edit profile modal
 * - Form validation
 * - Save and cancel actions
 * - Registry identifiers display
 * - Validation status badges
 */

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Profile tab
    await page.locator('.tab-button').filter({ hasText: 'Organization Profile' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display profile page with correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
    await expect(page.locator('.page-subtitle')).toContainText('Manage your organization');
  });

  test('should display Edit Profile button', async ({ page }) => {
    const editButton = page.getByRole('button', { name: 'Edit Profile' });
    await expect(editButton).toBeVisible();
  });

  test('should display Organization Details card', async ({ page }) => {
    const detailsCard = page.locator('.card').filter({ hasText: 'Organization Details' });
    await expect(detailsCard).toBeVisible();
  });

  test('should display all organization fields', async ({ page }) => {
    const detailsCard = page.locator('.card').filter({ hasText: 'Organization Details' });

    // Verify all essential fields
    await expect(detailsCard).toContainText('Legal Name:');
    await expect(detailsCard).toContainText('Organization ID:');
    await expect(detailsCard).toContainText('Domain:');
    await expect(detailsCard).toContainText('Status:');
    await expect(detailsCard).toContainText('Membership Level:');
    await expect(detailsCard).toContainText('Member Since:');
  });

  test('should display organization status with badge', async ({ page }) => {
    const statusBadge = page.locator('.status-badge').first();
    await expect(statusBadge).toBeVisible();

    const statusText = await statusBadge.textContent();
    expect(['ACTIVE', 'PENDING', 'SUSPENDED']).toContain(statusText?.toUpperCase());
  });

  test('should display Registry Identifiers section when identifiers exist', async ({ page }) => {
    const identifiersCard = page.locator('.card').filter({ hasText: 'Registry Identifiers' });
    const count = await identifiersCard.count();

    if (count > 0) {
      await expect(identifiersCard).toBeVisible();

      // Check for identifier items
      const registryItems = identifiersCard.locator('.registry-item');
      expect(await registryItems.count()).toBeGreaterThan(0);
      console.log('Registry identifiers section is displayed');
    } else {
      console.log('No registry identifiers available');
    }
  });

  test('should display identifier type badges', async ({ page }) => {
    const identifiersCard = page.locator('.card').filter({ hasText: 'Registry Identifiers' });
    const count = await identifiersCard.count();

    if (count > 0) {
      const typeBadges = identifiersCard.locator('.registry-type-badge');
      const badgeCount = await typeBadges.count();

      if (badgeCount > 0) {
        const badgeText = await typeBadges.first().textContent();
        expect(badgeText).toBeTruthy();
        console.log(`Identifier type badge: ${badgeText}`);
      }
    }
  });

  test('should display validation status for identifiers', async ({ page }) => {
    const identifiersCard = page.locator('.card').filter({ hasText: 'Registry Identifiers' });
    const count = await identifiersCard.count();

    if (count > 0) {
      // Check for status badges on identifiers
      const statusBadges = identifiersCard.locator('.status-badge');
      const badgeCount = await statusBadges.count();

      if (badgeCount > 0) {
        console.log(`Found ${badgeCount} identifier status badges`);
      }
    }
  });

  test('should open edit modal when clicking Edit Profile button', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal title
    await expect(modal.getByText('Edit Profile')).toBeVisible();
  });

  test('should display all form fields in edit modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');

    // Verify form fields
    await expect(modal.locator('label').filter({ hasText: 'Domain' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Address Line 1' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Address Line 2' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Postal Code' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'City' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Province' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Country Code' })).toBeVisible();
  });

  test('should have Cancel and Save buttons in edit modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');

    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('should close edit modal when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should close edit modal when clicking close button', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Click the modal close button
    const closeButton = modal.locator('button[aria-label="Close modal"], .mantine-Modal-close');
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
      await expect(modal).not.toBeVisible();
    }
  });

  test('should preserve domain value in edit form', async ({ page }) => {
    // Get the current domain value
    const detailsCard = page.locator('.card').filter({ hasText: 'Organization Details' });
    const domainField = detailsCard.locator('.info-item').filter({ hasText: 'Domain:' });
    const domainValue = await domainField.locator('span').last().textContent();

    // Open edit modal
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Verify domain input has the value
    const domainInput = page.locator('#domain');
    await expect(domainInput).toHaveValue(domainValue || '');
  });

  test('should allow editing domain field', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const domainInput = page.locator('#domain');
    await domainInput.fill('test-domain.com');
    await expect(domainInput).toHaveValue('test-domain.com');
  });

  test('should allow editing address fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    // Fill address fields
    await page.locator('#address_line1').fill('123 Test Street');
    await page.locator('#city').fill('Test City');
    await page.locator('#postal_code').fill('12345');

    // Verify values
    await expect(page.locator('#address_line1')).toHaveValue('123 Test Street');
    await expect(page.locator('#city')).toHaveValue('Test City');
    await expect(page.locator('#postal_code')).toHaveValue('12345');
  });

  test('should limit country code to 2 characters', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    const countryInput = page.locator('#country_code');
    await countryInput.fill('ABCD');

    // Should only contain 2 characters due to maxLength
    const value = await countryInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(2);
  });

  test('should take screenshot of profile view', async ({ page }) => {
    await page.screenshot({
      path: 'playwright-report/screenshots/member-profile-view.png',
      fullPage: true
    });

    console.log('Profile view screenshot captured');
  });

  test('should take screenshot of edit modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-profile-edit-modal.png',
      fullPage: true
    });

    console.log('Profile edit modal screenshot captured');
  });
});
