import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Capture Upload API Error', () => {
  test('capture exact 500 error response from upload endpoint', async ({ page }) => {
    // Increase timeout for manual login
    test.setTimeout(300000); // 5 minutes

    let uploadResponse: any = null;
    let uploadRequest: any = null;

    // Intercept the upload request
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/v1/bookings/upload') || url.includes('/upload')) {
        console.log('Intercepted upload response:', url);
        console.log('Status:', response.status());

        uploadRequest = {
          url: response.url(),
          method: response.request().method(),
          headers: response.request().headers(),
        };

        try {
          const responseBody = await response.text();
          uploadResponse = {
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: responseBody,
            bodyParsed: null
          };

          // Try to parse as JSON
          try {
            uploadResponse.bodyParsed = JSON.parse(responseBody);
          } catch (e) {
            console.log('Response body is not JSON');
          }

          console.log('Response body:', responseBody);
        } catch (e) {
          console.error('Failed to read response body:', e);
        }
      }
    });

    // Navigate to the booking portal
    console.log('Navigating to booking portal...');
    await page.goto('https://kind-coast-017153103.1.azurestaticapps.net');

    // Wait for user to login manually
    console.log('\n=== WAITING FOR MANUAL LOGIN ===');
    console.log('Please login in the browser window...');
    console.log('Waiting up to 5 minutes...\n');

    // Wait for navigation to complete after login (detect URL change or specific element)
    try {
      await page.waitForURL(/kind-coast-017153103\.1\.azurestaticapps\.net/, {
        timeout: 240000,
        waitUntil: 'networkidle'
      });
      console.log('Login detected (URL stable)');
    } catch (e) {
      console.log('Continuing after timeout...');
    }

    // Additional wait to ensure page is fully loaded
    await page.waitForTimeout(3000);

    // Look for file upload input or button
    console.log('Looking for file upload element...');

    // Try to find file input - common selectors
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.waitFor({ timeout: 30000 });

    console.log('Found file upload input');

    // Set the file
    const filePath = '/Users/ramondenoronha/Desktop/Booking Examples/BTT boekingen/Do this one - delivery order OOCL.pdf';

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`Uploading file: ${filePath}`);
    await fileInput.setInputFiles(filePath);

    // Wait for the upload to complete (or fail)
    console.log('Waiting for upload response...');
    await page.waitForTimeout(10000); // Wait up to 10 seconds for response

    // Save the captured data
    if (uploadResponse) {
      const outputDir = '/Users/ramondenoronha/Dev/DIL/ASR-full/booking-portal/api/e2e/upload-error-capture';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-');

      // Save request details
      const requestFile = path.join(outputDir, `request-${timestamp}.json`);
      fs.writeFileSync(requestFile, JSON.stringify(uploadRequest, null, 2));
      console.log(`\nRequest saved to: ${requestFile}`);

      // Save response details
      const responseFile = path.join(outputDir, `response-${timestamp}.json`);
      fs.writeFileSync(responseFile, JSON.stringify(uploadResponse, null, 2));
      console.log(`Response saved to: ${responseFile}`);

      // Print key error information
      console.log('\n=== UPLOAD ERROR DETAILS ===');
      console.log('Status:', uploadResponse.status);
      console.log('Status Text:', uploadResponse.statusText);

      if (uploadResponse.bodyParsed) {
        console.log('\n=== ERROR MESSAGE ===');
        console.log('Error:', uploadResponse.bodyParsed.error);
        console.log('Message:', uploadResponse.bodyParsed.message);

        if (uploadResponse.bodyParsed.details) {
          console.log('\n=== ERROR DETAILS (STACK TRACE) ===');
          console.log(uploadResponse.bodyParsed.details);
        }
      } else {
        console.log('\n=== RAW RESPONSE BODY ===');
        console.log(uploadResponse.body);
      }

      console.log('\n=== REQUEST HEADERS ===');
      console.log('Authorization:', uploadRequest.headers.authorization?.substring(0, 50) + '...');
      console.log('Content-Type:', uploadRequest.headers['content-type']);
    } else {
      console.log('No upload response was captured!');
      throw new Error('Failed to capture upload response');
    }

    // Keep browser open for inspection
    await page.waitForTimeout(5000);
  });
});
