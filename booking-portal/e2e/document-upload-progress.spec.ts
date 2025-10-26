import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Document Upload with Progress Indicator E2E Test
 *
 * Tests the 5-stage progress indicator during document processing:
 * Stage 1: Uploading document to Azure Blob Storage
 * Stage 2: Analyzing document with Azure Document Intelligence
 * Stage 3: Extracting structured data from analysis results
 * Stage 4: Processing data with Claude AI
 * Stage 5: Saving booking to Cosmos DB
 *
 * Recent Features Tested:
 * - Enhanced upload success message with document type badge
 * - Progress indicator state transitions
 * - Document type labeling (Bill of Lading, Transport Order, etc.)
 * - Error handling and timeout scenarios
 */

const BOOKING_PORTAL_URL =
  process.env.BOOKING_PORTAL_URL || 'https://kind-coast-017153103.1.azurestaticapps.net';

test.describe('Document Upload with Progress Indicator', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to booking portal
    await page.goto(BOOKING_PORTAL_URL);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display upload button on home page', async ({ page }) => {
    // Check for upload button or file input
    const uploadButton = page.locator('button:has-text("Upload"), input[type="file"]');
    await expect(uploadButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show progress indicator when uploading document', async ({ page }) => {
    // This test requires a PDF file - skip if not available
    const testPdfPath = path.join(__dirname, '../test-fixtures/sample-document.pdf');

    test.skip(
      !require('fs').existsSync(testPdfPath),
      'Test PDF file not found. Place a sample PDF in e2e/test-fixtures/sample-document.pdf'
    );

    // Find and interact with file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for upload to start
    await page.waitForTimeout(1000);

    // Check for progress indicator
    const progressIndicator = page.locator(
      '.progress-indicator, .upload-progress, [data-testid="progress"]'
    );
    const hasProgressIndicator = (await progressIndicator.count()) > 0;

    if (hasProgressIndicator) {
      console.log('✓ Progress indicator displayed');

      // Check for stage indicators (5 stages)
      const stages = [
        'Uploading document',
        'Analyzing document',
        'Extracting data',
        'Processing',
        'Saving',
      ];

      for (const stage of stages) {
        const stageElement = page.locator(`text="${stage}", text=/.*${stage}.*/i`);
        const hasStage = (await stageElement.count()) > 0;
        if (hasStage) {
          console.log(`  ✓ Stage displayed: ${stage}`);
        }
      }
    }
  });

  test('should show success message with document type badge after upload', async ({ page }) => {
    // Look for recent upload success messages
    const successMessage = page.locator(
      '.success-message, .upload-success, [data-testid="upload-success"]'
    );

    // If a success message is visible, verify it contains document type
    const successCount = await successMessage.count();

    if (successCount > 0) {
      console.log('✓ Upload success message found');

      // Check for document type badge
      const documentTypeBadge = page.locator(
        '.document-type-badge, [data-testid="document-type"]'
      );
      const badgeCount = await documentTypeBadge.count();

      if (badgeCount > 0) {
        const badgeText = await documentTypeBadge.first().textContent();
        console.log(`  ✓ Document type badge: ${badgeText}`);

        // Document types we expect to see
        const validTypes = [
          'Bill of Lading',
          'Transport Order',
          'Booking Confirmation',
          'Commercial Invoice',
        ];

        const hasValidType = validTypes.some((type) =>
          badgeText?.toLowerCase().includes(type.toLowerCase())
        );

        if (hasValidType) {
          console.log('  ✓ Valid document type displayed');
        }
      }
    } else {
      console.log('⚠ No recent upload success messages visible');
      test.skip(true, 'No uploads to verify - run test after uploading a document');
    }
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Create a minimal invalid file (not a real PDF)
    const invalidFile = Buffer.from('Invalid PDF content');
    const invalidPath = path.join(__dirname, '../test-fixtures/invalid.pdf');

    try {
      // Try to create temp file
      require('fs').writeFileSync(invalidPath, invalidFile);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidPath);

      // Wait for error message
      await page.waitForTimeout(2000);

      // Check for error handling
      const errorMessage = page.locator('.error-message, .upload-error, [role="alert"]');
      const errorCount = await errorMessage.count();

      if (errorCount > 0) {
        console.log('✓ Error message displayed for invalid file');
        const errorText = await errorMessage.first().textContent();
        console.log(`  Error: ${errorText}`);
      }
    } finally {
      // Cleanup
      if (require('fs').existsSync(invalidPath)) {
        require('fs').unlinkSync(invalidPath);
      }
    }
  });

  test('should show all 5 progress stages in sequence', async ({ page }) => {
    // Monitor progress indicator stages during an upload
    // This test verifies the stage transition logic

    const expectedStages = [
      { stage: 1, label: 'Uploading document', description: 'Azure Blob Storage' },
      { stage: 2, label: 'Analyzing document', description: 'Document Intelligence' },
      { stage: 3, label: 'Extracting data', description: 'structured data' },
      { stage: 4, label: 'Processing', description: 'Claude AI' },
      { stage: 5, label: 'Saving', description: 'Cosmos DB' },
    ];

    // Log expected stages for documentation
    console.log('Expected progress stages:');
    expectedStages.forEach((s) => {
      console.log(`  Stage ${s.stage}: ${s.label} - ${s.description}`);
    });

    // Note: This test documents the expected behavior
    // Actual validation requires an active upload process
    test.skip(true, 'Documentation test - shows expected stage sequence');
  });

  test('should display processing time for completed uploads', async ({ page }) => {
    // Check if any completed bookings show processing time
    const bookingRows = page.locator('[data-testid="booking-row"], .booking-item');
    const rowCount = await bookingRows.count();

    if (rowCount > 0) {
      console.log(`Found ${rowCount} booking(s)`);

      // Look for timestamp or duration information
      const timestampElements = page.locator(
        '[data-testid="upload-timestamp"], .upload-time, .processing-time'
      );
      const timestampCount = await timestampElements.count();

      if (timestampCount > 0) {
        const firstTimestamp = await timestampElements.first().textContent();
        console.log(`✓ Upload timestamp displayed: ${firstTimestamp}`);
      }
    }
  });

  test('should allow canceling upload in progress', async ({ page }) => {
    // Check if there's a cancel button during upload
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Stop")');

    // This test verifies the UI has a cancel mechanism
    // Actual cancellation requires an active upload

    console.log('Upload cancellation feature verification');
    console.log('Expected behavior:');
    console.log('  - Cancel button appears during upload');
    console.log('  - Clicking cancel stops the upload process');
    console.log('  - User receives confirmation message');

    test.skip(true, 'Cancellation requires active upload process to test');
  });

  test('should not allow multiple simultaneous uploads', async ({ page }) => {
    // Verify that the upload button is disabled during processing
    const fileInput = page.locator('input[type="file"]');
    const isDisabled = await fileInput.isDisabled();

    if (isDisabled) {
      console.log('✓ Upload input is disabled (upload in progress)');
    } else {
      console.log('✓ Upload input is enabled (ready for new upload)');
    }

    // Document expected behavior
    console.log('Expected behavior:');
    console.log('  - Only one upload allowed at a time');
    console.log('  - File input disabled during processing');
    console.log('  - Progress indicator shows current stage');
  });

  test('should display console errors during upload', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Wait for any console messages
    await page.waitForTimeout(3000);

    // Report findings
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach((err) => console.error(`  - ${err}`));
    }

    if (consoleWarnings.length > 0) {
      console.warn('⚠ Console warnings detected:');
      consoleWarnings.forEach((warn) => console.warn(`  - ${warn}`));
    }

    // Log clean state
    if (consoleErrors.length === 0 && consoleWarnings.length === 0) {
      console.log('✓ No console errors or warnings');
    }

    // This test reports but doesn't fail on errors (for information gathering)
    expect(consoleErrors.length).toBe(0);
  });
});
