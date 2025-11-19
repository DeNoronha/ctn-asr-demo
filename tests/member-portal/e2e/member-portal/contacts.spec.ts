import { test, expect } from '../../playwright/fixtures';

/**
 * Member Portal E2E Tests - Contacts Management
 *
 * Test Area: Contacts list, create, edit, validation
 * Priority: High
 *
 * Coverage:
 * - View contacts list
 * - Add new contact
 * - Edit existing contact
 * - Contact type badges
 * - Validation rules
 * - Empty state handling
 */

test.describe('Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Contacts tab
    await page.locator('.tab-button').filter({ hasText: 'Contacts' }).click();
    await page.waitForTimeout(1000);
  });

  test('should display contacts page with correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    await expect(page.locator('.page-subtitle')).toContainText('contact persons');
  });

  test('should display Add Contact button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add Contact' });
    await expect(addButton).toBeVisible();
  });

  test('should display contacts table with correct columns', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      // Verify table headers
      const headers = table.locator('thead th');
      const headerTexts = await headers.allTextContents();

      expect(headerTexts).toContain('Full Name');
      expect(headerTexts).toContain('Email');
      expect(headerTexts).toContain('Phone');
      expect(headerTexts).toContain('Job Title');
      expect(headerTexts).toContain('Type');
      expect(headerTexts).toContain('Primary');
      expect(headerTexts).toContain('Status');
      expect(headerTexts).toContain('Actions');
    }
  });

  test('should display contacts list when contacts exist', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        console.log(`Found ${rowCount} contacts in the list`);

        // Verify first contact has required data
        const firstRow = rows.first();
        await expect(firstRow.locator('td').first()).not.toBeEmpty();
      }
    }
  });

  test('should display empty state when no contacts exist', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    const count = await emptyState.count();

    if (count > 0) {
      await expect(emptyState).toContainText('No Contacts');
      await expect(emptyState).toContainText('Add your first contact');
      console.log('Empty state displayed correctly');
    } else {
      console.log('Contacts exist - empty state not shown');
    }
  });

  test('should display contact status badges', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const statusBadges = table.locator('.status-active, .status-inactive');
      const badgeCount = await statusBadges.count();

      if (badgeCount > 0) {
        const firstBadge = statusBadges.first();
        const badgeText = await firstBadge.textContent();
        expect(['Active', 'Inactive']).toContain(badgeText);
      }
    }
  });

  test('should display primary contact indicator', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      // Check if any contact is marked as primary
      const primaryIndicators = table.locator('td:has-text("✓")');
      const indicatorCount = await primaryIndicators.count();
      console.log(`Found ${indicatorCount} primary contact indicators`);
    }
  });

  test('should display Edit button for each contact', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const editButtons = table.locator('.table-actions button').filter({ hasText: 'Edit' });
      const buttonCount = await editButtons.count();

      if (buttonCount > 0) {
        console.log(`Found ${buttonCount} edit buttons`);
        await expect(editButtons.first()).toBeVisible();
      }
    }
  });

  test('should open Add Contact modal when clicking Add Contact button', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal title
    await expect(modal.getByText('Add Contact')).toBeVisible();
  });

  test('should display all form fields in Add Contact modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');

    // Verify required fields
    await expect(modal.locator('label').filter({ hasText: 'Full Name' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Email' })).toBeVisible();

    // Verify optional fields
    await expect(modal.locator('label').filter({ hasText: 'First Name' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Last Name' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Phone' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Mobile' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Job Title' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Department' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Contact Type' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: 'Preferred Contact Method' })).toBeVisible();
  });

  test('should have Contact Type dropdown with all options', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const typeSelect = page.locator('#contact_type');
    await expect(typeSelect).toBeVisible();

    // Get all options
    const options = await typeSelect.locator('option').allTextContents();
    expect(options).toContain('PRIMARY');
    expect(options).toContain('TECHNICAL');
    expect(options).toContain('BILLING');
    expect(options).toContain('SUPPORT');
    expect(options).toContain('LEGAL');
    expect(options).toContain('OTHER');
  });

  test('should have Preferred Contact Method dropdown with all options', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const methodSelect = page.locator('#preferred_contact_method');
    await expect(methodSelect).toBeVisible();

    // Get all options
    const options = await methodSelect.locator('option').allTextContents();
    expect(options).toContain('EMAIL');
    expect(options).toContain('PHONE');
    expect(options).toContain('MOBILE');
  });

  test('should have Cancel and Save buttons in Add Contact modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');

    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save Contact' })).toBeVisible();
  });

  test('should close Add Contact modal when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should require Full Name field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    // Check that Full Name input has required attribute
    const nameInput = page.locator('#full_name');
    await expect(nameInput).toHaveAttribute('required', '');
  });

  test('should require Email field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    // Check that Email input has required attribute
    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should allow filling contact form fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    // Fill in form fields
    await page.locator('#full_name').fill('Test Contact');
    await page.locator('#first_name').fill('Test');
    await page.locator('#last_name').fill('Contact');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#phone').fill('+31 20 123 4567');
    await page.locator('#mobile').fill('+31 6 12345678');
    await page.locator('#job_title').fill('IT Manager');
    await page.locator('#department').fill('IT Department');

    // Verify values
    await expect(page.locator('#full_name')).toHaveValue('Test Contact');
    await expect(page.locator('#email')).toHaveValue('test@example.com');
  });

  test('should open Edit Contact modal when clicking Edit button', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const editButton = table.locator('.table-actions button').filter({ hasText: 'Edit' }).first();
      const buttonCount = await editButton.count();

      if (buttonCount > 0) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Verify modal is open
        const modal = page.locator('.mantine-Modal-root, [role="dialog"]');
        await expect(modal).toBeVisible();

        // Verify modal title
        await expect(modal.getByText('Edit Contact')).toBeVisible();
      } else {
        console.log('No contacts to edit');
      }
    }
  });

  test('should pre-fill Edit Contact form with existing data', async ({ page }) => {
    const table = page.locator('.data-table');
    const count = await table.count();

    if (count > 0) {
      const editButton = table.locator('.table-actions button').filter({ hasText: 'Edit' }).first();
      const buttonCount = await editButton.count();

      if (buttonCount > 0) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Verify form fields have values
        const nameInput = page.locator('#full_name');
        const nameValue = await nameInput.inputValue();
        expect(nameValue).toBeTruthy();

        const emailInput = page.locator('#email');
        const emailValue = await emailInput.inputValue();
        expect(emailValue).toBeTruthy();
      }
    }
  });

  test('should take screenshot of contacts list', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-contacts-list.png',
      fullPage: true
    });

    console.log('Contacts list screenshot captured');
  });

  test('should take screenshot of Add Contact modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Contact' }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'playwright-report/screenshots/member-contacts-add-modal.png',
      fullPage: true
    });

    console.log('Add Contact modal screenshot captured');
  });
});
