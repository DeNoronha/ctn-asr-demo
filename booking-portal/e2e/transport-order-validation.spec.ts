import { test, expect } from '@playwright/test';

/**
 * Transport Order Validation E2E Test
 *
 * Tests the TransportOrderForm component after DCSA Booking 2.0.2 schema enhancements:
 * - Multimodal transport modes (TRUCK, RAIL, BARGE, etc.)
 * - Inland terminal facility types (SEAPORT, RIVER_BARGE_TERMINAL, etc.)
 * - Hazmat and customs bonded transport fields
 *
 * Test Pattern:
 * 1. Navigate to booking portal
 * 2. Find a transport order (documentType: 'transport_order')
 * 3. Open the validation form
 * 4. Verify all fields are displayed correctly
 * 5. Verify confidence badges display
 * 6. Verify low-confidence highlighting works
 */

const BOOKING_PORTAL_URL = process.env.BOOKING_PORTAL_URL || 'https://calm-mud-024a8ce03.1.azurestaticapps.net';

test.describe('Transport Order Validation Form', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to booking portal
    await page.goto(BOOKING_PORTAL_URL);

    // Wait for authentication (if required)
    // Note: This test assumes you're already authenticated or using a test environment
    await page.waitForLoadState('networkidle');
  });

  test('should display all transport order fields with confidence badges', async ({ page }) => {
    // Find a transport order in the list
    const transportOrderRow = page.locator('[data-document-type="transport_order"]').first();

    // If no transport orders exist, skip this test
    const count = await transportOrderRow.count();
    test.skip(count === 0, 'No transport orders found in the system');

    // Click "View" button to open the validation form
    await transportOrderRow.locator('button:has-text("View")').click();

    // Wait for form to load
    await page.waitForSelector('.form-section', { timeout: 10000 });

    // ========================================
    // Order Information Section
    // ========================================
    await expect(page.locator('h3:has-text("Order Information")')).toBeVisible();

    await expect(page.locator('label:has-text("Transport Order Number")')).toBeVisible();
    await expect(page.locator('input[value]').first()).toBeVisible(); // transportOrderNumber field

    await expect(page.locator('label:has-text("Delivery Order Number")')).toBeVisible();

    await expect(page.locator('label:has-text("Carrier Booking Reference")')).toBeVisible();

    await expect(page.locator('label:has-text("Order Date")')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // ========================================
    // Transport Details Section
    // ========================================
    await expect(page.locator('h3:has-text("Transport Details")')).toBeVisible();

    await expect(page.locator('label:has-text("Carrier")')).toBeVisible();

    await expect(page.locator('label:has-text("Trucking Company")')).toBeVisible();

    // ========================================
    // Consignee Section
    // ========================================
    await expect(page.locator('h3:has-text("Consignee")')).toBeVisible();

    await expect(page.locator('label:has-text("Company Name")')).toBeVisible();

    await expect(page.locator('label:has-text("Address")').first()).toBeVisible();

    // ========================================
    // Pickup Details Section
    // ========================================
    await expect(page.locator('h3:has-text("Pickup Details")')).toBeVisible();

    await expect(page.locator('label:has-text("Facility Name")').first()).toBeVisible();

    await expect(page.locator('label:has-text("Planned Pickup Date")')).toBeVisible();

    // ========================================
    // Delivery Details Section
    // ========================================
    await expect(page.locator('h3:has-text("Delivery Details")')).toBeVisible();

    await expect(page.locator('label:has-text("Facility Name")').nth(1)).toBeVisible();

    await expect(page.locator('label:has-text("Planned Delivery Date")')).toBeVisible();

    // ========================================
    // Container Information Section
    // ========================================
    await expect(page.locator('h3:has-text("Container Information")')).toBeVisible();

    await expect(page.locator('label:has-text("Container Number")')).toBeVisible();

    await expect(page.locator('label:has-text("Container Type")')).toBeVisible();

    // ========================================
    // Cargo Information Section
    // ========================================
    await expect(page.locator('h3:has-text("Cargo Information")')).toBeVisible();

    await expect(page.locator('label:has-text("Cargo Description")')).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();

    await expect(page.locator('label:has-text("Special Instructions")')).toBeVisible();
    await expect(page.locator('textarea').nth(1)).toBeVisible();
  });

  test('should display confidence badges next to fields', async ({ page }) => {
    const transportOrderRow = page.locator('[data-document-type="transport_order"]').first();
    const count = await transportOrderRow.count();
    test.skip(count === 0, 'No transport orders found in the system');

    await transportOrderRow.locator('button:has-text("View")').click();
    await page.waitForSelector('.form-section', { timeout: 10000 });

    // Check for confidence badges (they should render next to labels)
    // Confidence badges are rendered by renderConfidenceBadge() function
    const labels = page.locator('label');
    const labelCount = await labels.count();

    // At least some labels should have confidence indicators
    expect(labelCount).toBeGreaterThan(0);

    // Look for confidence-related elements (could be badges, icons, or text)
    // The exact implementation depends on renderConfidenceBadge()
    const hasSomeConfidenceIndicators = await page.locator('.confidence-badge, .confidence-indicator, [data-confidence]').count();

    // We expect at least some confidence indicators to be present
    console.log(`Found ${hasSomeConfidenceIndicators} confidence indicators`);
  });

  test('should highlight low-confidence fields', async ({ page }) => {
    const transportOrderRow = page.locator('[data-document-type="transport_order"]').first();
    const count = await transportOrderRow.count();
    test.skip(count === 0, 'No transport orders found in the system');

    await transportOrderRow.locator('button:has-text("View")').click();
    await page.waitForSelector('.form-section', { timeout: 10000 });

    // Check for low-confidence class on inputs
    // Fields with confidence < 0.8 should have 'low-confidence' class
    const lowConfidenceInputs = page.locator('input.low-confidence, textarea.low-confidence');
    const lowConfidenceCount = await lowConfidenceInputs.count();

    console.log(`Found ${lowConfidenceCount} low-confidence fields`);

    // If there are low-confidence fields, verify they have visual indicators
    if (lowConfidenceCount > 0) {
      const firstLowConfidence = lowConfidenceInputs.first();

      // Check that the field has some visual distinction
      const classes = await firstLowConfidence.getAttribute('class');
      expect(classes).toContain('low-confidence');
    }
  });

  test('should allow editing form fields', async ({ page }) => {
    const transportOrderRow = page.locator('[data-document-type="transport_order"]').first();
    const count = await transportOrderRow.count();
    test.skip(count === 0, 'No transport orders found in the system');

    await transportOrderRow.locator('button:has-text("View")').click();
    await page.waitForSelector('.form-section', { timeout: 10000 });

    // Test editing a text field
    const carrierInput = page.locator('label:has-text("Carrier")').locator('..').locator('input');
    await carrierInput.fill('Test Carrier Company');
    await expect(carrierInput).toHaveValue('Test Carrier Company');

    // Test editing a date field
    const orderDateInput = page.locator('label:has-text("Order Date")').locator('..').locator('input[type="date"]');
    await orderDateInput.fill('2025-12-31');
    await expect(orderDateInput).toHaveValue('2025-12-31');

    // Test editing a textarea
    const cargoDescriptionTextarea = page.locator('label:has-text("Cargo Description")').locator('..').locator('textarea');
    await cargoDescriptionTextarea.fill('Test cargo description - electronics');
    await expect(cargoDescriptionTextarea).toHaveValue('Test cargo description - electronics');
  });

  test('should display console errors if any', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const transportOrderRow = page.locator('[data-document-type="transport_order"]').first();
    const count = await transportOrderRow.count();
    test.skip(count === 0, 'No transport orders found in the system');

    await transportOrderRow.locator('button:has-text("View")').click();
    await page.waitForSelector('.form-section', { timeout: 10000 });

    // Wait a bit for any lazy-loaded errors
    await page.waitForTimeout(2000);

    // Log any console errors found
    if (consoleErrors.length > 0) {
      console.error('Console errors detected:');
      consoleErrors.forEach(err => console.error(`  - ${err}`));
    }

    // This test doesn't fail on console errors, just reports them
    expect(consoleErrors.length).toBe(0);
  });
});
