import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Document Upload Debug', () => {
  test('Debug file upload with full console and network logging', async ({ page }) => {
    // Set longer timeout for manual login
    test.setTimeout(300000); // 5 minutes
    const consoleLogs: Array<{
      type: string;
      timestamp: string;
      text: string;
      args?: string[];
    }> = [];

    const networkRequests: Array<{
      timestamp: string;
      method: string;
      url: string;
      headers: Record<string, string>;
      postData?: string;
      status?: number;
      statusText?: string;
      responseBody?: string;
    }> = [];

    // Capture ALL console messages
    page.on('console', async (msg) => {
      const timestamp = new Date().toISOString();
      const type = msg.type();
      const text = msg.text();

      // Try to get arguments for more detail
      const args = await Promise.all(
        msg.args().map(async (arg) => {
          try {
            return await arg.jsonValue();
          } catch {
            return arg.toString();
          }
        })
      );

      const logEntry = {
        type,
        timestamp,
        text,
        args: args.map(a => typeof a === 'string' ? a : JSON.stringify(a))
      };

      consoleLogs.push(logEntry);

      // Also log to test output for immediate visibility
      console.log(`[${type.toUpperCase()}] ${timestamp}: ${text}`);
      if (args.length > 0) {
        console.log('  Args:', JSON.stringify(args, null, 2));
      }
    });

    // Capture ALL network requests
    page.on('request', (request) => {
      const timestamp = new Date().toISOString();
      const headers = request.headers();
      const postData = request.postData();

      const requestLog = {
        timestamp,
        method: request.method(),
        url: request.url(),
        headers,
        postData: postData ? postData.substring(0, 500) + (postData.length > 500 ? '...' : '') : undefined
      };

      networkRequests.push(requestLog);

      // Log important requests immediately
      if (request.url().includes('/api/') || request.url().includes('login') || request.url().includes('token')) {
        console.log(`\n[NETWORK REQUEST] ${timestamp}`);
        console.log(`  ${request.method()} ${request.url()}`);
        console.log(`  Authorization: ${headers['authorization'] || 'NOT PRESENT'}`);
        if (postData) {
          console.log(`  Post Data (truncated): ${postData.substring(0, 200)}`);
        }
      }
    });

    // Capture ALL network responses
    page.on('response', async (response) => {
      const timestamp = new Date().toISOString();
      const request = response.request();

      // Find the matching request
      const matchingRequest = networkRequests.find(
        r => r.url === request.url() && r.method === request.method() && !r.status
      );

      if (matchingRequest) {
        matchingRequest.status = response.status();
        matchingRequest.statusText = response.statusText();

        // Try to capture response body
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') || contentType.includes('text/')) {
            matchingRequest.responseBody = await response.text();
          }
        } catch (error) {
          matchingRequest.responseBody = `Error reading response: ${error}`;
        }
      }

      // Log important responses immediately
      if (request.url().includes('/api/') || request.url().includes('login') || request.url().includes('token')) {
        console.log(`\n[NETWORK RESPONSE] ${timestamp}`);
        console.log(`  ${response.status()} ${response.statusText()}`);
        console.log(`  ${request.method()} ${request.url()}`);

        if (matchingRequest?.responseBody) {
          console.log(`  Response Body: ${matchingRequest.responseBody.substring(0, 500)}`);
        }
      }
    });

    // Navigate to the booking portal
    console.log('\n=== Navigating to booking portal ===');
    await page.goto('https://kind-coast-017153103.1.azurestaticapps.net', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('\n=== Looking for Sign in with Microsoft button ===');

    // Click the "Sign in with Microsoft" button if present
    try {
      const signInButton = page.locator('button:has-text("Sign in with Microsoft")');
      await signInButton.waitFor({ timeout: 5000 });
      console.log('=== Found Sign in button, clicking... ===');
      await signInButton.click();
      console.log('=== Clicked Sign in button ===');
    } catch (error) {
      console.log('=== No Sign in button found, may already be logged in ===');
    }

    console.log('\n=== MANUAL LOGIN REQUIRED ===');
    console.log('Please complete Azure AD authentication in the browser window...');
    console.log('You have 3 minutes to complete login.');
    console.log('Look for the file upload button to appear after login.');

    // Wait for user to login manually - look for common post-login indicators
    // Try multiple strategies to detect successful login
    try {
      await Promise.race([
        // Strategy 1: Wait for upload button
        page.waitForSelector('input[type="file"]', { timeout: 180000 }).then(() => {
          console.log('\n=== Login detected: File upload input found ===');
        }),
        // Strategy 2: Wait for common post-login elements
        page.waitForSelector('[data-testid="upload-button"], button:has-text("Upload"), button:has-text("upload")', { timeout: 180000 }).then(() => {
          console.log('\n=== Login detected: Upload button found ===');
        }),
        // Strategy 3: Wait for common app content after login
        page.waitForSelector('text=Upload', { timeout: 180000 }).then(() => {
          console.log('\n=== Login detected: Upload text found ===');
        })
      ]);
    } catch (error) {
      console.log('\n=== Warning: Timeout waiting for login, continuing anyway ===');
    }

    // Give the app a moment to fully initialize
    await page.waitForTimeout(5000);

    console.log('\n=== Current page title:', await page.title());
    console.log('=== Current URL:', page.url());

    // Take a screenshot to see what's on screen
    await page.screenshot({
      path: '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/screenshots/after-login.png',
      fullPage: true
    });
    console.log('\n=== Screenshot saved: after-login.png ===');

    // Try to find the file upload input
    console.log('\n=== Looking for file upload input ===');

    // Try multiple selectors
    let fileInput = await page.locator('input[type="file"]').first();
    const fileInputCount = await page.locator('input[type="file"]').count();
    console.log(`Found ${fileInputCount} file input(s)`);

    if (fileInputCount === 0) {
      console.log('\n=== No file input found. Checking page structure ===');
      const bodyText = await page.locator('body').textContent();
      console.log('Page text (first 500 chars):', bodyText?.substring(0, 500));

      // Save full page HTML for inspection
      const html = await page.content();
      fs.writeFileSync(
        '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug/page-content.html',
        html
      );
      console.log('=== Full page HTML saved to debug/page-content.html ===');
    }

    // Upload the file
    console.log('\n=== Attempting to upload file ===');
    const testFile = '/Users/ramondenoronha/Desktop/Booking Examples/BTT boekingen/Do this one - delivery order OOCL.pdf';

    console.log(`File exists: ${fs.existsSync(testFile)}`);
    console.log(`File size: ${fs.statSync(testFile).size} bytes`);

    if (fileInputCount > 0) {
      // Wait a bit before upload to catch any pre-upload console messages
      await page.waitForTimeout(1000);

      console.log('=== Uploading file to input element ===');
      await fileInput.setInputFiles(testFile);
      console.log('=== File selected ===');

      // Wait for upload to process
      console.log('\n=== Waiting for upload request... (30 seconds) ===');
      await page.waitForTimeout(30000);
    } else {
      console.log('\n=== WARNING: No file input found, cannot upload ===');
      console.log('=== Waiting 10 seconds to capture any additional logs ===');
      await page.waitForTimeout(10000);
    }

    // Take another screenshot after upload
    await page.screenshot({
      path: '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/screenshots/after-upload.png',
      fullPage: true
    });
    console.log('=== Screenshot saved: after-upload.png ===');

    // Save all logs to files
    const debugDir = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/web/e2e/debug';

    // Ensure debug directory exists
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // Save console logs
    const consoleLogFile = path.join(debugDir, 'console-logs.json');
    fs.writeFileSync(consoleLogFile, JSON.stringify(consoleLogs, null, 2));
    console.log(`\n=== Console logs saved to: ${consoleLogFile} ===`);

    // Save network requests
    const networkLogFile = path.join(debugDir, 'network-requests.json');
    fs.writeFileSync(networkLogFile, JSON.stringify(networkRequests, null, 2));
    console.log(`=== Network requests saved to: ${networkLogFile} ===`);

    // Generate summary report
    const summaryReport = generateSummaryReport(consoleLogs, networkRequests);
    const summaryFile = path.join(debugDir, 'debug-summary.txt');
    fs.writeFileSync(summaryFile, summaryReport);
    console.log(`=== Summary report saved to: ${summaryFile} ===`);

    // Also print summary to console
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG SUMMARY');
    console.log('='.repeat(80));
    console.log(summaryReport);

    // Keep browser open for manual inspection
    console.log('\n=== Test complete. Check the debug files for details. ===');
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
  });
});

function generateSummaryReport(
  consoleLogs: Array<{ type: string; timestamp: string; text: string; args?: string[] }>,
  networkRequests: Array<{
    timestamp: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    postData?: string;
    status?: number;
    statusText?: string;
    responseBody?: string;
  }>
): string {
  const lines: string[] = [];

  lines.push('CONSOLE LOG ANALYSIS');
  lines.push('='.repeat(80));

  // Check for token acquisition messages
  const tokenAcquiringMsg = consoleLogs.filter(log =>
    log.text.includes('Acquiring access token for API')
  );
  const tokenSuccessMsg = consoleLogs.filter(log =>
    log.text.includes('Access token acquired successfully')
  );
  const tokenErrorMsg = consoleLogs.filter(log =>
    log.text.includes('Error acquiring access token') ||
    (log.type === 'error' && log.text.includes('token'))
  );

  lines.push(`\nToken Acquisition Messages:`);
  lines.push(`  "Acquiring access token for API...": ${tokenAcquiringMsg.length} occurrences`);
  lines.push(`  "Access token acquired successfully": ${tokenSuccessMsg.length} occurrences`);
  lines.push(`  Token-related errors: ${tokenErrorMsg.length} occurrences`);

  if (tokenAcquiringMsg.length > 0) {
    lines.push(`\n  First occurrence: ${tokenAcquiringMsg[0].timestamp}`);
  }
  if (tokenSuccessMsg.length > 0) {
    lines.push(`  Success occurrence: ${tokenSuccessMsg[0].timestamp}`);
  }

  // All console errors
  const errors = consoleLogs.filter(log => log.type === 'error');
  lines.push(`\nConsole Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach((err, idx) => {
      lines.push(`\n  Error ${idx + 1} [${err.timestamp}]:`);
      lines.push(`    ${err.text}`);
      if (err.args && err.args.length > 0) {
        lines.push(`    Args: ${err.args.join(', ')}`);
      }
    });
  }

  // All console warnings
  const warnings = consoleLogs.filter(log => log.type === 'warning');
  lines.push(`\nConsole Warnings: ${warnings.length}`);

  lines.push('\n' + '='.repeat(80));
  lines.push('NETWORK REQUEST ANALYSIS');
  lines.push('='.repeat(80));

  // Filter API requests
  const apiRequests = networkRequests.filter(req =>
    req.url.includes('/api/v1/')
  );

  lines.push(`\nTotal API Requests: ${apiRequests.length}`);

  // Look for document upload request
  const uploadRequests = apiRequests.filter(req =>
    req.url.includes('/documents') && req.method === 'POST'
  );

  lines.push(`Document Upload Requests: ${uploadRequests.length}`);

  if (uploadRequests.length > 0) {
    uploadRequests.forEach((req, idx) => {
      lines.push(`\n  Upload Request ${idx + 1}:`);
      lines.push(`    Time: ${req.timestamp}`);
      lines.push(`    URL: ${req.url}`);
      lines.push(`    Method: ${req.method}`);
      lines.push(`    Status: ${req.status || 'No response'} ${req.statusText || ''}`);
      lines.push(`    Authorization Header: ${req.headers['authorization'] ? 'PRESENT' : 'MISSING'}`);
      if (req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          lines.push(`    Token Preview: Bearer ${token.substring(0, 20)}...${token.substring(token.length - 20)}`);
          lines.push(`    Token Length: ${token.length} characters`);
        } else {
          lines.push(`    Auth Header: ${authHeader}`);
        }
      }
      lines.push(`    Content-Type: ${req.headers['content-type'] || 'Not set'}`);

      if (req.responseBody) {
        lines.push(`    Response Body:`);
        lines.push(`      ${req.responseBody.substring(0, 500)}`);
      }
    });
  } else {
    lines.push(`\n  WARNING: No upload requests found!`);
  }

  // All API requests summary
  lines.push(`\n\nAll API Requests Summary:`);
  apiRequests.forEach((req, idx) => {
    lines.push(`\n  ${idx + 1}. ${req.method} ${req.url}`);
    lines.push(`     Status: ${req.status || 'pending'} | Auth: ${req.headers['authorization'] ? 'YES' : 'NO'}`);
  });

  // Check for authentication-related requests
  const authRequests = networkRequests.filter(req =>
    req.url.includes('login') ||
    req.url.includes('token') ||
    req.url.includes('oauth') ||
    req.url.includes('microsoft')
  );

  if (authRequests.length > 0) {
    lines.push(`\n\nAuthentication-related Requests: ${authRequests.length}`);
    authRequests.forEach((req, idx) => {
      lines.push(`\n  ${idx + 1}. ${req.method} ${req.url}`);
      lines.push(`     Status: ${req.status || 'pending'}`);
    });
  }

  return lines.join('\n');
}
