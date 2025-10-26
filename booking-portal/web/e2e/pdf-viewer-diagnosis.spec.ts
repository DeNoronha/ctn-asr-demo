import { test, expect } from '@playwright/test';

test.describe('PDF Viewer Diagnosis - Booking Portal', () => {
  const BOOKING_ID = 'doc-1761159237330-p1';
  const VALIDATION_URL = `https://kind-coast-017153103.1.azurestaticapps.net/validate/${BOOKING_ID}`;
  const API_BASE_URL = 'https://func-ctn-booking-prod.azurewebsites.net/api';

  test('should diagnose PDF viewer loading issue', async ({ page }) => {
    // Arrays to collect diagnostics
    const consoleMessages: Array<{ type: string; text: string; location?: string }> = [];
    const pageErrors: Array<{ message: string; stack?: string }> = [];
    const failedRequests: Array<{ url: string; status: number; statusText: string; method: string }> = [];
    const networkRequests: Array<{ url: string; status: number; method: string; resourceType: string }> = [];

    // Capture console messages (including errors, warnings, logs)
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined
      };
      consoleMessages.push(logEntry);
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', error => {
      const errorInfo = {
        message: error.message,
        stack: error.stack
      };
      pageErrors.push(errorInfo);
      console.error('[PAGE ERROR]', error.message);
      console.error(error.stack);
    });

    // Capture all network requests
    page.on('request', request => {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    // Capture all network responses
    page.on('response', response => {
      const requestInfo = {
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        resourceType: response.request().resourceType()
      };
      networkRequests.push(requestInfo);

      if (!response.ok()) {
        const failedInfo = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method()
        };
        failedRequests.push(failedInfo);
        console.error(`[FAILED REQUEST] ${response.request().method()} ${response.url()} - ${response.status()} ${response.statusText()}`);
      } else {
        console.log(`[RESPONSE] ${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });

    // Navigate to validation page
    console.log('\n=== NAVIGATING TO VALIDATION PAGE ===');
    console.log(`URL: ${VALIDATION_URL}`);

    await page.goto(VALIDATION_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for potential async operations
    await page.waitForTimeout(3000);

    // Check if the page loaded at all
    console.log('\n=== PAGE STRUCTURE CHECK ===');
    const rootElement = await page.locator('#root').count();
    console.log(`React root element found: ${rootElement > 0}`);

    // Check for the document viewer
    const documentViewerExists = await page.locator('.document-viewer').count();
    console.log(`Document viewer container exists: ${documentViewerExists > 0}`);

    // Check if "Loading document..." message is showing
    const loadingMessageVisible = await page.getByText('Loading document...').isVisible().catch(() => false);
    console.log(`"Loading document..." visible: ${loadingMessageVisible}`);

    // Check if PDFViewer component is rendered
    const pdfViewerContainer = await page.locator('.pdf-viewer-container').count();
    console.log(`PDF viewer container exists: ${pdfViewerContainer > 0}`);

    // Check iframe element
    const iframeExists = await page.locator('iframe.pdf-viewer-iframe').count();
    console.log(`PDF iframe exists: ${iframeExists > 0}`);

    if (iframeExists > 0) {
      const iframeSrc = await page.locator('iframe.pdf-viewer-iframe').getAttribute('src');
      console.log(`PDF iframe src: ${iframeSrc}`);

      const iframeVisible = await page.locator('iframe.pdf-viewer-iframe').isVisible();
      console.log(`PDF iframe visible: ${iframeVisible}`);

      const iframeStyle = await page.locator('iframe.pdf-viewer-iframe').getAttribute('style');
      console.log(`PDF iframe style: ${iframeStyle}`);
    }

    // Check if error state is showing
    const errorMessageVisible = await page.getByText('⚠️ Unable to load document').isVisible().catch(() => false);
    console.log(`Error message visible: ${errorMessageVisible}`);

    // Check for the specific API calls we expect
    console.log('\n=== API CALLS CHECK ===');
    const bookingDetailCall = networkRequests.find(r => r.url.includes(`/bookings/detail/${BOOKING_ID}`));
    console.log(`Booking detail API called: ${!!bookingDetailCall}`);
    if (bookingDetailCall) {
      console.log(`  - Status: ${bookingDetailCall.status}`);
      console.log(`  - Method: ${bookingDetailCall.method}`);
    }

    const sasUrlCall = networkRequests.find(r => r.url.includes(`/documents/${BOOKING_ID}/sas`));
    console.log(`SAS URL API called: ${!!sasUrlCall}`);
    if (sasUrlCall) {
      console.log(`  - Status: ${sasUrlCall.status}`);
      console.log(`  - Method: ${sasUrlCall.method}`);
    }

    const blobRequests = networkRequests.filter(r => r.url.includes('blob.core.windows.net'));
    console.log(`Blob storage requests: ${blobRequests.length}`);
    blobRequests.forEach(req => {
      console.log(`  - ${req.method} ${req.url} - ${req.status}`);
    });

    // Take screenshots
    console.log('\n=== CAPTURING SCREENSHOTS ===');
    const screenshotPath = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Full page screenshot: ${screenshotPath}`);

    // Screenshot just the document viewer area if it exists
    if (documentViewerExists > 0) {
      const viewerScreenshotPath = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/screenshots/document-viewer-area.png';
      await page.locator('.document-viewer').screenshot({ path: viewerScreenshotPath });
      console.log(`Document viewer screenshot: ${viewerScreenshotPath}`);
    }

    // Get React state if possible
    console.log('\n=== REACT STATE CHECK ===');
    const reactState = await page.evaluate(() => {
      const root = document.querySelector('#root');
      if (root) {
        // Try to access React internals (this is a hack and may not work in production builds)
        const reactInternals = (root as any)._reactRootContainer || (root as any)._reactRootContainer;
        return {
          hasReactRoot: !!reactInternals,
          innerHTML: root.innerHTML.substring(0, 500)
        };
      }
      return { hasReactRoot: false, innerHTML: '' };
    });
    console.log(`React state:`, reactState);

    // Check axios configuration
    console.log('\n=== AXIOS CONFIGURATION CHECK ===');
    const axiosBaseURL = await page.evaluate(() => {
      return (window as any).process?.env?.VITE_API_BASE_URL || 'not set';
    });
    console.log(`Axios base URL from window: ${axiosBaseURL}`);

    // Generate comprehensive report
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`  - Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`  - Warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);
    console.log(`  - Logs: ${consoleMessages.filter(m => m.type === 'log').length}`);
    console.log(`Total page errors: ${pageErrors.length}`);
    console.log(`Total failed requests: ${failedRequests.length}`);
    console.log(`Total network requests: ${networkRequests.length}`);

    if (consoleMessages.filter(m => m.type === 'error').length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleMessages.filter(m => m.type === 'error').forEach(msg => {
        console.log(`  - ${msg.text}`);
        if (msg.location) console.log(`    Location: ${msg.location}`);
      });
    }

    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach(err => {
        console.log(`  - ${err.message}`);
        if (err.stack) console.log(`    ${err.stack.split('\n').slice(0, 3).join('\n    ')}`);
      });
    }

    if (failedRequests.length > 0) {
      console.log('\n=== FAILED REQUESTS ===');
      failedRequests.forEach(req => {
        console.log(`  - ${req.method} ${req.url}`);
        console.log(`    Status: ${req.status} ${req.statusText}`);
      });
    }

    // Save detailed report to file
    const report = {
      testTimestamp: new Date().toISOString(),
      bookingId: BOOKING_ID,
      validationUrl: VALIDATION_URL,
      pageStructure: {
        reactRootFound: rootElement > 0,
        documentViewerExists: documentViewerExists > 0,
        pdfViewerContainerExists: pdfViewerContainer > 0,
        iframeExists: iframeExists > 0,
        loadingMessageVisible,
        errorMessageVisible
      },
      apiCalls: {
        bookingDetail: bookingDetailCall ? { status: bookingDetailCall.status, url: bookingDetailCall.url } : null,
        sasUrl: sasUrlCall ? { status: sasUrlCall.status, url: sasUrlCall.url } : null,
        blobRequests: blobRequests.map(r => ({ method: r.method, url: r.url, status: r.status }))
      },
      diagnostics: {
        consoleMessages: consoleMessages.map(m => ({ type: m.type, text: m.text, location: m.location })),
        pageErrors: pageErrors.map(e => ({ message: e.message, stack: e.stack })),
        failedRequests: failedRequests.map(r => ({ method: r.method, url: r.url, status: r.status, statusText: r.statusText })),
        allNetworkRequests: networkRequests.map(r => ({ method: r.method, url: r.url, status: r.status, resourceType: r.resourceType }))
      }
    };

    // Write report to JSON file
    const fs = require('fs');
    const reportPath = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug/pdf-viewer-diagnosis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    // Final assertion - this test is for diagnostics, so we don't fail it
    // Instead we just report what we found
    console.log('\n=== ROOT CAUSE ANALYSIS ===');

    if (!bookingDetailCall) {
      console.log('⚠️  ISSUE: Booking detail API was not called');
    } else if (bookingDetailCall.status !== 200) {
      console.log(`⚠️  ISSUE: Booking detail API failed with status ${bookingDetailCall.status}`);
    }

    if (!sasUrlCall) {
      console.log('⚠️  ISSUE: SAS URL API was not called');
      console.log('   This means the booking data likely did not load, or the booking.id field is missing');
    } else if (sasUrlCall.status !== 200) {
      console.log(`⚠️  ISSUE: SAS URL API failed with status ${sasUrlCall.status}`);
    }

    if (blobRequests.length === 0 && sasUrlCall && sasUrlCall.status === 200) {
      console.log('⚠️  ISSUE: SAS URL was fetched successfully, but no blob request was made');
      console.log('   This suggests the iframe src was not set correctly');
    }

    if (loadingMessageVisible && !errorMessageVisible) {
      console.log('⚠️  ISSUE: Stuck on "Loading document..." state');
    }

    if (errorMessageVisible) {
      console.log('⚠️  ISSUE: PDF viewer is in error state');
    }

    if (consoleMessages.filter(m => m.type === 'error' && m.text.includes('CORS')).length > 0) {
      console.log('⚠️  ISSUE: CORS error detected');
    }

    console.log('\n=== END OF DIAGNOSIS ===\n');
  });
});
