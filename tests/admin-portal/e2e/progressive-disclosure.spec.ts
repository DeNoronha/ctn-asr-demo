import { expect, test } from '@playwright/test';

test.describe('Progressive Disclosure', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Login with test credentials
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
    const password = process.env.TEST_ADMIN_PASSWORD || 'testpassword';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('MemberForm - Optional Identifiers section should be collapsed by default', async ({
    page,
  }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click Add Member button
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Check that Optional Identifiers section exists
    const optionalSection = page.locator('text=Optional Identifiers');
    await expect(optionalSection).toBeVisible();

    // Check that LEI field is NOT visible (section is collapsed)
    const leiField = page.locator('input[placeholder*="LEI"]');
    await expect(leiField).not.toBeVisible();
  });

  test('MemberForm - Optional Identifiers should expand on click', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click Add Member button
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Click to expand Optional Identifiers section
    await page.click('text=Optional Identifiers');
    await page.waitForTimeout(300); // Wait for animation

    // LEI and KVK fields should now be visible
    const leiField = page.locator('input[placeholder*="LEI"]');
    const kvkField = page.locator('input[placeholder*="12345678"]');

    await expect(leiField).toBeVisible();
    await expect(kvkField).toBeVisible();
  });

  test('MemberForm - Progressive section should remember expansion state', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click Add Member button
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Expand Optional Identifiers
    await page.click('text=Optional Identifiers');
    await page.waitForTimeout(300);

    // Verify expanded
    const leiField = page.locator('input[placeholder*="LEI"]');
    await expect(leiField).toBeVisible();

    // Cancel form
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);

    // Open form again
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Section should still be expanded (localStorage persistence)
    await expect(leiField).toBeVisible();
  });

  test('ContactForm - Additional Details should be collapsible', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click on first member to view details
    await page.click('.mantine-DataTable-root-table tbody tr:first-child td:first-child');
    await page.waitForTimeout(1000);

    // Navigate to Contacts tab
    await page.click('text=Contacts');
    await page.waitForTimeout(500);

    // Click Add Contact button
    await page.click('button:has-text("Add Contact")');
    await page.waitForTimeout(500);

    // Check that additional details section exists
    const additionalDetails = page.locator('text=Additional Contact Details');
    await expect(additionalDetails).toBeVisible();

    // Phone and job title should not be visible initially
    const phoneField = page.locator('input[placeholder*="+31 20"]');
    await expect(phoneField).not.toBeVisible();
  });

  test('ContactForm - Additional Details should expand when clicked', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click on first member to view details
    await page.click('.mantine-DataTable-root-table tbody tr:first-child td:first-child');
    await page.waitForTimeout(1000);

    // Navigate to Contacts tab
    await page.click('text=Contacts');
    await page.waitForTimeout(500);

    // Click Add Contact button
    await page.click('button:has-text("Add Contact")');
    await page.waitForTimeout(500);

    // Click to expand Additional Details
    await page.click('text=Additional Contact Details');
    await page.waitForTimeout(300);

    // Phone, mobile, job title, department should be visible
    const phoneField = page.locator('input[placeholder*="+31 20"]');
    const mobileField = page.locator('input[placeholder*="+31 6"]');

    await expect(phoneField).toBeVisible();
    await expect(mobileField).toBeVisible();
  });

  test('IdentifiersManager - Conditional fields should appear based on selection', async ({
    page,
  }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click on first member to view details
    await page.click('.mantine-DataTable-root-table tbody tr:first-child td:first-child');
    await page.waitForTimeout(1000);

    // Navigate to Identifiers tab
    await page.click('text=Identifiers');
    await page.waitForTimeout(500);

    // Click Add Identifier button
    await page.click('button:has-text("Add Identifier")');
    await page.waitForTimeout(500);

    // Registry fields should not be visible initially
    const registryNameField = page.locator('input[placeholder*="Auto-populated"]').first();
    await expect(registryNameField).not.toBeVisible();

    // Enter country code
    await page.fill('input[placeholder*="NL, DE, BE"]', 'NL');
    await page.waitForTimeout(300);

    // Select identifier type
    await page.click('.mantine-Select-root');
    await page.click('text=KVK');
    await page.waitForTimeout(300);

    // Registry fields should now be visible
    await expect(registryNameField).toBeVisible();

    // Enter identifier value
    await page.fill('input[placeholder*="Enter identifier"]', '12345678');
    await page.waitForTimeout(300);

    // Validation status field should now be visible
    const validationStatus = page.locator('text=Validation Status').first();
    await expect(validationStatus).toBeVisible();
  });

  test('Progressive sections should have proper ARIA attributes', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click Add Member button
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Check ARIA attributes on progressive toggle button
    const toggleButton = page.locator('button:has-text("Optional Identifiers")');

    // Should have aria-expanded attribute
    const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    // Click to expand
    await toggleButton.click();
    await page.waitForTimeout(300);

    // aria-expanded should now be true
    const ariaExpandedAfter = await toggleButton.getAttribute('aria-expanded');
    expect(ariaExpandedAfter).toBe('true');

    // Content should have role="region"
    const content = page.locator('.progressive-content').first();
    const role = await content.getAttribute('role');
    expect(role).toBe('region');
  });

  test('Progressive sections should support keyboard navigation', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click Add Member button
    await page.click('text=+ Add Member');
    await page.waitForTimeout(500);

    // Tab to the progressive section button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to expand
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // LEI field should be visible
    const leiField = page.locator('input[placeholder*="LEI"]');
    await expect(leiField).toBeVisible();
  });

  test('ConditionalField animations should work smoothly', async ({ page }) => {
    // Navigate to Members view
    await page.click('text=Members');
    await page.waitForTimeout(500);

    // Click on first member
    await page.click('.mantine-DataTable-root-table tbody tr:first-child td:first-child');
    await page.waitForTimeout(1000);

    // Navigate to Identifiers tab
    await page.click('text=Identifiers');
    await page.waitForTimeout(500);

    // Click Add Identifier
    await page.click('button:has-text("Add Identifier")');
    await page.waitForTimeout(500);

    // Check that conditional fields have proper class
    const conditionalFields = page.locator('.conditional-field').first();

    // Should have 'hidden' class initially
    const classList = await conditionalFields.getAttribute('class');
    expect(classList).toContain('hidden');

    // Enter country and type to trigger visibility
    await page.fill('input[placeholder*="NL, DE, BE"]', 'NL');
    await page.waitForTimeout(100);

    await page.click('.mantine-Select-root');
    await page.click('text=KVK');
    await page.waitForTimeout(400); // Wait for animation

    // Should have 'visible' class now
    const classListAfter = await conditionalFields.getAttribute('class');
    expect(classListAfter).toContain('visible');
  });
});
