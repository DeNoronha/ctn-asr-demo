import { test, expect } from '@playwright/test';

test.describe('Debug Validation Page White Screen', () => {
  test('should visit validation page and capture errors', async ({ page }) => {
    const validationUrl = 'https://kind-coast-017153103.1.azurestaticapps.net/validate/booking-1760986565899';

    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    // Capture page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
      console.error('PAGE ERROR:', error);
    });

    // Capture failed requests
    const failedRequests: { url: string; status: number; statusText: string }[] = [];
    page.on('response', response => {
      if (!response.ok()) {
        const info = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };
        failedRequests.push(info);
        console.error('FAILED REQUEST:', info);
      }
    });

    // Navigate to the validation page
    console.log('Navigating to:', validationUrl);
    await page.goto(validationUrl, { waitUntil: 'networkidle' });

    // Wait a moment for any async errors
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshotPath = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug/validation-white-screen.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);

    // Check page content
    const bodyText = await page.locator('body').textContent();
    console.log('Body text length:', bodyText?.length || 0);
    console.log('Body text:', bodyText);

    // Check if React root is present
    const rootElement = await page.locator('#root').count();
    console.log('React root element found:', rootElement > 0);

    // Check for API calls
    const apiCalls = await page.evaluate(() => {
      return (window as any).__API_CALLS__ || 'No API call tracking';
    });
    console.log('API calls:', apiCalls);

    // Report findings
    console.log('\n=== SUMMARY ===');
    console.log('Console messages:', consoleMessages.length);
    console.log('Page errors:', pageErrors.length);
    console.log('Failed requests:', failedRequests.length);

    if (pageErrors.length > 0) {
      console.log('\nPage Errors:');
      pageErrors.forEach(err => console.log('-', err.message));
    }

    if (failedRequests.length > 0) {
      console.log('\nFailed Requests:');
      failedRequests.forEach(req => console.log('-', req.url, req.status));
    }

    // Save report
    const report = {
      url: validationUrl,
      timestamp: new Date().toISOString(),
      consoleMessages,
      pageErrors: pageErrors.map(e => ({ message: e.message, stack: e.stack })),
      failedRequests,
      bodyTextLength: bodyText?.length || 0
    };

    await page.evaluate(report => {
      console.log('FULL REPORT:', JSON.stringify(report, null, 2));
    }, report);
  });
});
