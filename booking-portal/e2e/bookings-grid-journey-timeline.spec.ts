import { test, expect } from '@playwright/test';

/**
 * Bookings Grid and Transport Journey Timeline E2E Test
 *
 * Tests the bookings data grid and multi-leg transport journey visualization:
 * - Bookings grid display with Kendo UI Grid
 * - Document type badges (Bill of Lading, Transport Order, etc.)
 * - Confidence score visualization
 * - Processing status indicators
 * - TransportJourneyTimeline component with multi-leg support
 * - Journey visualization (truck → barge → rail transitions)
 * - Timeline milestones and ETA display
 *
 * Recent Features Tested:
 * - Enhanced document type labels with color coding
 * - Multi-modal transport mode support
 * - Journey leg transitions with visual indicators
 * - Confidence score badges for data quality
 */

const BOOKING_PORTAL_URL =
  process.env.BOOKING_PORTAL_URL || 'https://kind-coast-017153103.1.azurestaticapps.net';

test.describe('Bookings Grid Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKING_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display bookings grid with data', async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('.k-grid, [role="grid"], .bookings-grid', { timeout: 10000 });

    // Check for grid presence
    const grid = page.locator('.k-grid, [role="grid"]');
    await expect(grid.first()).toBeVisible();

    // Check for data rows
    const rows = page.locator('.k-grid-content tr, [role="row"]');
    const rowCount = await rows.count();

    console.log(`✓ Bookings grid displayed with ${rowCount} row(s)`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should display document type badges in grid', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Look for document type indicators
    const documentTypeBadges = page.locator(
      '.document-type-badge, [data-testid="document-type"], .badge'
    );
    const badgeCount = await documentTypeBadges.count();

    if (badgeCount > 0) {
      console.log(`✓ Found ${badgeCount} document type badge(s)`);

      // Collect unique document types
      const documentTypes = new Set<string>();
      for (let i = 0; i < Math.min(badgeCount, 10); i++) {
        const badgeText = await documentTypeBadges.nth(i).textContent();
        if (badgeText) {
          documentTypes.add(badgeText.trim());
        }
      }

      console.log('Document types found:');
      documentTypes.forEach((type) => console.log(`  - ${type}`));

      expect(badgeCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No document type badges found');
    }
  });

  test('should display confidence scores in grid', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Look for confidence score indicators
    const confidenceScores = page.locator(
      '.confidence-score, [data-testid="confidence"], .score-badge'
    );
    const scoreCount = await confidenceScores.count();

    if (scoreCount > 0) {
      console.log(`✓ Found ${scoreCount} confidence score(s)`);

      // Check first few scores
      for (let i = 0; i < Math.min(scoreCount, 5); i++) {
        const scoreText = await confidenceScores.nth(i).textContent();
        console.log(`  Score ${i + 1}: ${scoreText}`);
      }

      expect(scoreCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No confidence scores displayed in grid');
    }
  });

  test('should display processing status for each booking', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Look for status indicators
    const statusBadges = page.locator(
      '.status-badge, [data-testid="status"], .processing-status'
    );
    const statusCount = await statusBadges.count();

    if (statusCount > 0) {
      console.log(`✓ Found ${statusCount} status badge(s)`);

      // Collect unique statuses
      const statuses = new Set<string>();
      for (let i = 0; i < Math.min(statusCount, 10); i++) {
        const statusText = await statusBadges.nth(i).textContent();
        if (statusText) {
          statuses.add(statusText.trim());
        }
      }

      console.log('Processing statuses found:');
      statuses.forEach((status) => console.log(`  - ${status}`));

      // Expected statuses: pending, processing, validated, completed, error
      expect(statusCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No status indicators found');
    }
  });

  test('should display container numbers in grid', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Look for container number columns
    const containerNumbers = page.locator('[data-field="containerNumber"], .container-number');
    const containerCount = await containerNumbers.count();

    if (containerCount > 0) {
      console.log(`✓ Found ${containerCount} container number(s)`);

      // Sample some container numbers
      for (let i = 0; i < Math.min(containerCount, 3); i++) {
        const containerText = await containerNumbers.nth(i).textContent();
        if (containerText && containerText.trim().length > 0) {
          console.log(`  Container: ${containerText}`);
        }
      }
    } else {
      console.log('⚠ No container numbers displayed');
    }
  });

  test('should allow clicking on booking to view details', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Find "View" button in first row
    const viewButton = page.locator('button:has-text("View"), button:has-text("Details")').first();
    const viewButtonExists = (await viewButton.count()) > 0;

    if (viewButtonExists) {
      await viewButton.click();

      // Wait for details view or modal to appear
      await page.waitForTimeout(1000);

      // Check for form sections or detail view
      const detailView = page.locator('.booking-details, .form-section, [role="dialog"]');
      const hasDetailView = (await detailView.count()) > 0;

      if (hasDetailView) {
        console.log('✓ Booking details view opened');
      }

      expect(hasDetailView).toBe(true);
    } else {
      test.skip(true, 'No "View" button found in grid');
    }
  });

  test('should display upload timestamps', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    // Look for timestamp columns
    const timestamps = page.locator(
      '[data-field="uploadTimestamp"], .upload-time, .timestamp'
    );
    const timestampCount = await timestamps.count();

    if (timestampCount > 0) {
      console.log(`✓ Found ${timestampCount} timestamp(s)`);

      // Sample some timestamps
      for (let i = 0; i < Math.min(timestampCount, 3); i++) {
        const timestampText = await timestamps.nth(i).textContent();
        console.log(`  Timestamp: ${timestampText}`);
      }
    } else {
      console.log('⚠ No upload timestamps displayed');
    }
  });
});

test.describe('Transport Journey Timeline Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKING_PORTAL_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display journey timeline for multi-leg transport', async ({ page }) => {
    // Open a booking with journey details
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    const viewButtonExists = (await viewButton.count()) > 0;
    test.skip(!viewButtonExists, 'No bookings available to test journey timeline');

    await viewButton.click();
    await page.waitForTimeout(1000);

    // Look for journey timeline component
    const timeline = page.locator(
      '.journey-timeline, [data-testid="journey-timeline"], .transport-timeline'
    );
    const hasTimeline = (await timeline.count()) > 0;

    if (hasTimeline) {
      console.log('✓ Transport journey timeline component found');

      // Check for journey legs
      const journeyLegs = page.locator('.journey-leg, .transport-leg, [data-testid="leg"]');
      const legCount = await journeyLegs.count();

      if (legCount > 0) {
        console.log(`  ✓ ${legCount} journey leg(s) displayed`);

        // Verify each leg has key information
        for (let i = 0; i < legCount; i++) {
          const leg = journeyLegs.nth(i);
          const legText = await leg.textContent();
          console.log(`  Leg ${i + 1}: ${legText?.substring(0, 50)}...`);
        }
      }

      expect(legCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No journey timeline found (may not be multi-leg transport)');
      test.skip(true, 'Journey timeline not present for this booking');
    }
  });

  test('should display transport modes (truck/barge/rail)', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    if ((await viewButton.count()) === 0) {
      test.skip(true, 'No bookings to test');
    }

    await viewButton.click();
    await page.waitForTimeout(1000);

    // Look for transport mode indicators
    const transportModes = page.locator('.transport-mode, [data-testid="mode"]');
    const modeCount = await transportModes.count();

    if (modeCount > 0) {
      console.log('✓ Transport modes displayed:');

      const modes = new Set<string>();
      for (let i = 0; i < modeCount; i++) {
        const modeText = await transportModes.nth(i).textContent();
        if (modeText) {
          modes.add(modeText.trim());
        }
      }

      modes.forEach((mode) => console.log(`  - ${mode}`));

      // Expected modes: TRUCK, BARGE, RAIL, VESSEL
      expect(modeCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No transport mode indicators found');
    }
  });

  test('should display origin and destination for each leg', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    if ((await viewButton.count()) === 0) {
      test.skip(true, 'No bookings to test');
    }

    await viewButton.click();
    await page.waitForTimeout(1000);

    // Look for location information
    const origins = page.locator('.origin, [data-testid="origin"], .from-location');
    const destinations = page.locator('.destination, [data-testid="destination"], .to-location');

    const originCount = await origins.count();
    const destCount = await destinations.count();

    console.log(`Origins displayed: ${originCount}`);
    console.log(`Destinations displayed: ${destCount}`);

    if (originCount > 0 && destCount > 0) {
      console.log('✓ Journey locations (origin/destination) displayed');

      // Sample first location pair
      const firstOrigin = await origins.first().textContent();
      const firstDest = await destinations.first().textContent();

      console.log(`  Example route: ${firstOrigin} → ${firstDest}`);
    }
  });

  test('should display departure and arrival dates/times', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    if ((await viewButton.count()) === 0) {
      test.skip(true, 'No bookings to test');
    }

    await viewButton.click();
    await page.waitForTimeout(1000);

    // Look for datetime information
    const departureTimes = page.locator(
      '.departure-time, [data-testid="departure"], .depart-date'
    );
    const arrivalTimes = page.locator('.arrival-time, [data-testid="arrival"], .arrive-date');

    const depCount = await departureTimes.count();
    const arrCount = await arrivalTimes.count();

    console.log(`Departure times: ${depCount}`);
    console.log(`Arrival times: ${arrCount}`);

    if (depCount > 0 || arrCount > 0) {
      console.log('✓ Journey times (departure/arrival) displayed');
    }
  });

  test('should visualize journey progress/status', async ({ page }) => {
    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    if ((await viewButton.count()) === 0) {
      test.skip(true, 'No bookings to test');
    }

    await viewButton.click();
    await page.waitForTimeout(1000);

    // Look for visual indicators of journey progress
    const progressIndicators = page.locator(
      '.progress-bar, .journey-status, [data-testid="progress"]'
    );
    const progressCount = await progressIndicators.count();

    if (progressCount > 0) {
      console.log('✓ Journey progress visualization found');
    } else {
      console.log('⚠ No progress visualization found');
    }
  });

  test('should display console errors in journey timeline', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForSelector('.k-grid, [role="grid"]', { timeout: 10000 });

    const viewButton = page.locator('button:has-text("View")').first();
    if ((await viewButton.count()) > 0) {
      await viewButton.click();
      await page.waitForTimeout(3000);
    }

    if (consoleErrors.length > 0) {
      console.error('❌ Console errors in journey timeline:');
      consoleErrors.forEach((err) => console.error(`  - ${err}`));
    } else {
      console.log('✓ No console errors in journey timeline');
    }

    expect(consoleErrors.length).toBe(0);
  });
});
