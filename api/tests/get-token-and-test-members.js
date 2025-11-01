#!/usr/bin/env node
/**
 * Script to extract access token and test /api/v1/all-members endpoint
 * Created: October 25, 2025
 * Purpose: Debug why dashboard shows 0 members
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function getTokenAndTestAPI() {
  console.log('🔐 Starting authentication and API test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    console.log('📱 Opening admin portal...');
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net/');

    console.log('\n⏸️  Please complete Microsoft login + MFA in the browser');
    console.log('⏸️  The script will automatically detect when the dashboard loads\n');
    console.log('⏳ Waiting up to 5 minutes for authentication...\n');

    // Wait for Dashboard to appear
    await page.waitForSelector('text=Dashboard', { timeout: 300000 }); // 5 minutes

    console.log('✅ Dashboard detected! Waiting for API call...');

    // CRITICAL: Intercept network requests to capture the API access token
    console.log('\n🔄 Setting up network interception to capture API token...');

    let capturedToken = null;

    // Listen for API requests and capture the Authorization header
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('func-ctn-demo-asr-dev.azurewebsites.net/api')) {
        const headers = request.headers();
        if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
          capturedToken = headers.authorization.substring(7); // Remove "Bearer " prefix
          console.log('✅ Captured API token from network request!');
        }
      }
    });

    //Navigate to members page which will trigger API call
    console.log('📄 Navigating to Members page to trigger API call...');
    await page.click('text=Members').catch(() => console.log('Members link not found, trying alternative navigation...'));

    // Wait for API call to happen
    await page.waitForTimeout(3000);

    let tokenData;

    if (capturedToken) {
      console.log('✅ Successfully captured API token from network request!');

      // Decode token to get expiry
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(capturedToken, { complete: true });

      tokenData = {
        accessToken: capturedToken,
        tokenType: 'Bearer',
        expiresOn: decoded?.payload?.exp,
        account: decoded?.payload?.upn || decoded?.payload?.email || 'Unknown',
        source: 'Network Request Interception',
      };
    } else {
      console.error('\n❌ ERROR: Failed to capture API token from network requests');
      console.error('Falling back to cache extraction...\n');

      // Extract access token from localStorage and sessionStorage
      console.log('\n🔍 Extracting access token from MSAL cache...');
      tokenData = await page.evaluate(() => {
      const result = {
        accessToken: null,
        tokenType: null,
        expiresOn: null,
        account: null,
        source: null,
      };

      // Helper function to search storage
      const searchStorage = (storage, storageName) => {
        const keys = Object.keys(storage);
        console.log(`Searching ${storageName}: ${keys.length} keys`);

        // CRITICAL: Look for the API-specific access token, not the Microsoft Graph token
        // The CTN ASR API client ID is: d3037c11-a541-4f21-8862-8079137a0cde
        // MSAL keys include the scope/audience in the key name
        const apiClientId = 'd3037c11-a541-4f21-8862-8079137a0cde';

        for (const key of keys) {
          if (key?.includes('accesstoken')) {
            console.log(`  Found accesstoken key in ${storageName}:`, key);
            try {
              const value = storage.getItem(key);
              const parsed = JSON.parse(value);

              // Check if this token is for our API (not Microsoft Graph)
              if (parsed.credentialType === 'AccessToken' || parsed.secret) {
                const token = parsed.secret || parsed.accessToken;

                // Verify it's for the correct audience by checking the key or decoding token
                // MSAL keys contain the scope/resource in the key name (e.g., includes client ID)
                const isApiToken = key.includes(apiClientId) || key.includes('api://');

                if (isApiToken) {
                  result.accessToken = token;
                  result.tokenType = parsed.tokenType || 'Bearer';
                  result.expiresOn = parsed.expiresOn;
                  result.source = storageName;
                  console.log(`  ✅ Extracted API token from ${storageName} (key contains API client ID)`);
                  return true;
                } else {
                  console.log(`  ⏩ Skipping token (not for CTN ASR API, likely Microsoft Graph)`);
                }
              }
            } catch (e) {
              console.log(`  Error parsing key: ${key}`, e.message);
            }
          }
        }
        return false;
      };

      // Try localStorage first
      if (!searchStorage(localStorage, 'localStorage')) {
        // Try sessionStorage
        searchStorage(sessionStorage, 'sessionStorage');
      }

      // Get account info from either storage
      for (const storage of [localStorage, sessionStorage]) {
        const keys = Object.keys(storage);
        for (const key of keys) {
          if (key?.includes('account')) {
            try {
              const value = storage.getItem(key);
              const parsed = JSON.parse(value);
              if (parsed.username) {
                result.account = parsed.username;
                break;
              }
            } catch (e) {
              // Ignore
            }
          }
        }
        if (result.account) break;
      }

      return result;
    });
    }  // End of else block (fallback to cache extraction)

    if (!tokenData.accessToken) {
      console.error('\n❌ ERROR: Could not find access token in MSAL cache');
      console.error('This may happen if:');
      console.error('  1. Token is stored in sessionStorage instead of localStorage');
      console.error('  2. MSAL configuration uses different cache location');
      console.error('  3. Authentication did not complete successfully');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ Access token extracted successfully!');
    console.log(`   Source: ${tokenData.source}`);
    console.log(`   Account: ${tokenData.account || 'Unknown'}`);
    console.log(`   Token Type: ${tokenData.tokenType}`);
    console.log(`   Expires: ${tokenData.expiresOn ? new Date(parseInt(tokenData.expiresOn) * 1000).toLocaleString() : 'Unknown'}`);
    console.log(`   Token (first 50 chars): ${tokenData.accessToken.substring(0, 50)}...`);

    // Save token to file for reuse
    const tokenFile = '/tmp/asr_admin_token.txt';
    fs.writeFileSync(tokenFile, tokenData.accessToken);
    console.log(`\n💾 Token saved to: ${tokenFile}`);

    // Now test the API endpoint
    console.log('\n========================================');
    console.log('Testing GET /api/v1/all-members');
    console.log('========================================\n');

    const apiUrl = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/all-members?page=1&page_size=10';

    console.log(`Request: GET ${apiUrl}`);
    console.log('Headers:');
    console.log(`  Authorization: Bearer <token>`);
    console.log(`  Content-Type: application/json\n`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const statusText = response.statusText;

    console.log(`Response Status: ${status} ${statusText}\n`);

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (e) {
      const text = await response.text();
      console.log('Response (text):', text);
      responseBody = { error: 'Could not parse JSON', text };
    }

    console.log('Response Body:');
    console.log(JSON.stringify(responseBody, null, 2));

    console.log('\n========================================');
    console.log('DIAGNOSIS');
    console.log('========================================\n');

    if (status === 200) {
      console.log('✅ API returned 200 OK');

      if (responseBody.data && Array.isArray(responseBody.data)) {
        const memberCount = responseBody.data.length;
        console.log(`\nMembers returned: ${memberCount}`);

        if (memberCount === 0) {
          console.log('\n⚠️  ROOT CAUSE: DATABASE ISSUE');
          console.log('   - API is working correctly (200 OK)');
          console.log('   - Authentication is working (token accepted)');
          console.log('   - BUT: No members exist in the database\n');
          console.log('Recommended action:');
          console.log('   Connect to database and verify:');
          console.log('   SELECT COUNT(*) FROM members;');
          console.log('   SELECT org_id, legal_name, status FROM members;');
        } else {
          console.log('\n⚠️  ROOT CAUSE: FRONTEND ISSUE');
          console.log('   - API is returning data correctly');
          console.log('   - BUT: Dashboard UI is not displaying it\n');
          console.log('Recommended action:');
          console.log('   1. Check browser console for JavaScript errors');
          console.log('   2. Verify Dashboard.tsx is fetching /api/v1/all-members');
          console.log('   3. Check if response is being processed correctly');
          console.log('   4. Verify grid component is rendering data');
        }
      } else {
        console.log('\n⚠️  ROOT CAUSE: API RESPONSE FORMAT ISSUE');
        console.log('   - Expected: { data: [...] }');
        console.log(`   - Received: ${JSON.stringify(responseBody).substring(0, 100)}...\n`);
      }

    } else if (status === 401) {
      console.log('❌ ROOT CAUSE: AUTHENTICATION FAILED (401)');
      console.log('   - Token is invalid or expired');
      console.log('   - Scope may be incorrect\n');
      console.log('Recommended action: Re-run this script to get fresh token');

    } else if (status === 403) {
      console.log('❌ ROOT CAUSE: AUTHORIZATION FAILED (403)');
      console.log('   - User authenticated but lacks permission');
      console.log('   - Check user roles in Azure AD\n');

    } else if (status === 404) {
      console.log('❌ ROOT CAUSE: ENDPOINT NOT FOUND (404)');
      console.log('   - /api/v1/all-members is not registered or deployed');
      console.log('   - Check function app deployment\n');
      console.log('Recommended action:');
      console.log('   func azure functionapp list-functions func-ctn-demo-asr-dev');

    } else if (status === 500) {
      console.log('❌ ROOT CAUSE: BACKEND ERROR (500)');
      console.log('   - Error in GetMembers.ts handler');
      console.log('   - Database query failed\n');
      console.log('Recommended action:');
      console.log('   func azure functionapp logstream func-ctn-demo-asr-dev --timeout 20');

    } else {
      console.log(`❌ ROOT CAUSE: UNEXPECTED STATUS CODE (${status})`);
      console.log('   - Check API logs for details\n');
    }

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

getTokenAndTestAPI().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
