#!/usr/bin/env node
/**
 * Test /api/v1/all-members using saved authentication state
 * Created: October 25, 2025
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testMembersAPI() {
  console.log('🔐 Testing /api/v1/all-members with saved auth state...\n');

  const authFile = path.join(__dirname, '..', '..', 'admin-portal', 'playwright', '.auth', 'user.json');

  if (!fs.existsSync(authFile)) {
    console.error('❌ No saved auth state found at:', authFile);
    console.error('\nPlease run authentication first:');
    console.error('  cd admin-portal/scripts');
    console.error('  node capture-auth-auto.js\n');
    process.exit(1);
  }

  console.log('✅ Found saved auth state');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();

  try {
    console.log('📱 Loading admin portal with saved auth...');
    await page.goto('https://calm-tree-03352ba03.1.azurestaticapps.net/');

    console.log('⏳ Waiting for dashboard...');
    await page.waitForSelector('text=Dashboard', { timeout: 30000 });

    console.log('✅ Dashboard loaded! Extracting token...');
    await page.waitForTimeout(2000);

    // Extract access token
    const tokenData = await page.evaluate(() => {
      const result = { accessToken: null, source: null };

      const searchStorage = (storage, storageName) => {
        const keys = Object.keys(storage);
        for (const key of keys) {
          if (key?.includes('accesstoken')) {
            try {
              const value = storage.getItem(key);
              const parsed = JSON.parse(value);
              if (parsed.credentialType === 'AccessToken' || parsed.secret) {
                result.accessToken = parsed.secret || parsed.accessToken;
                result.source = storageName;
                return true;
              }
            } catch (e) {
              // Ignore
            }
          }
        }
        return false;
      };

      searchStorage(localStorage, 'localStorage') || searchStorage(sessionStorage, 'sessionStorage');
      return result;
    });

    if (!tokenData.accessToken) {
      console.error('\n❌ Could not extract token from saved auth state');
      console.error('The saved auth may have expired. Please re-authenticate:');
      console.error('  cd admin-portal/scripts');
      console.error('  node capture-auth-auto.js\n');
      await browser.close();
      process.exit(1);
    }

    console.log(`✅ Token extracted from ${tokenData.source}`);
    console.log(`   Token (first 50 chars): ${tokenData.accessToken.substring(0, 50)}...\n`);

    // Save token for curl scripts
    fs.writeFileSync('/tmp/asr_admin_token.txt', tokenData.accessToken);
    console.log('💾 Token saved to /tmp/asr_admin_token.txt\n');

    // Test the API
    console.log('========================================');
    console.log('Testing GET /api/v1/all-members');
    console.log('========================================\n');

    const apiUrl = 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/all-members?page=1&page_size=10';

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    console.log(`Response Status: ${status} ${response.statusText}\n`);

    let responseBody;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
      console.log('Response Body:');
      console.log(JSON.stringify(responseBody, null, 2));
    } else {
      const text = await response.text();
      console.log('Response (non-JSON):');
      console.log(text);
      responseBody = { raw: text };
    }

    console.log('\n========================================');
    console.log('DIAGNOSIS');
    console.log('========================================\n');

    if (status === 200) {
      console.log('✅ API returned 200 OK');

      if (responseBody.data && Array.isArray(responseBody.data)) {
        const memberCount = responseBody.data.length;
        console.log(`\n📊 Members returned: ${memberCount}`);

        if (memberCount === 0) {
          console.log('\n⚠️  ROOT CAUSE: DATABASE ISSUE');
          console.log('   - API is working correctly (200 OK)');
          console.log('   - Authentication is working (token accepted)');
          console.log('   - BUT: No members exist in the database\n');
          console.log('📝 Recommended action:');
          console.log('   Connect to database and verify:');
          console.log('   SELECT COUNT(*) FROM members;');
          console.log('   SELECT org_id, legal_name, status FROM members LIMIT 10;');
        } else {
          console.log('\n✅ API is working perfectly!');
          console.log(`   - ${memberCount} members returned`);
          console.log('   - Sample member:', responseBody.data[0]?.legal_name || 'N/A');
          console.log('\n⚠️  ROOT CAUSE: FRONTEND ISSUE');
          console.log('   - API is returning data correctly');
          console.log('   - BUT: Dashboard UI is not displaying it\n');
          console.log('📝 Recommended action:');
          console.log('   1. Check browser console for JavaScript errors');
          console.log('   2. Verify Dashboard.tsx is fetching /api/v1/all-members');
          console.log('   3. Check if response is being processed correctly');
          console.log('   4. Check MembersGrid.tsx is rendering data array');
        }

        if (responseBody.total) {
          console.log(`\n📊 Total members in database: ${responseBody.total}`);
          console.log(`   Current page: ${responseBody.page || 1}`);
          console.log(`   Page size: ${responseBody.page_size || 10}`);
        }
      } else {
        console.log('\n⚠️  ROOT CAUSE: API RESPONSE FORMAT ISSUE');
        console.log('   - Expected: { data: [...], total: N }');
        console.log(`   - Received: ${JSON.stringify(responseBody).substring(0, 100)}...\n`);
      }

    } else if (status === 401) {
      console.log('❌ ROOT CAUSE: AUTHENTICATION FAILED (401)');
      console.log('   - Token is invalid or expired');
      console.log('\n📝 Recommended action:');
      console.log('   cd admin-portal/scripts && node capture-auth-auto.js');

    } else if (status === 403) {
      console.log('❌ ROOT CAUSE: AUTHORIZATION FAILED (403)');
      console.log('   - User authenticated but lacks permission\n');

    } else if (status === 404) {
      console.log('❌ ROOT CAUSE: ENDPOINT NOT FOUND (404)');
      console.log('   - /api/v1/all-members is not registered or deployed');
      console.log('\n📝 Recommended action:');
      console.log('   cd api && func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote');

    } else if (status === 500) {
      console.log('❌ ROOT CAUSE: BACKEND ERROR (500)');
      console.log('   - Error in GetMembers.ts handler');
      console.log('\n📝 Recommended action: Check logs');

    } else {
      console.log(`❌ ROOT CAUSE: UNEXPECTED STATUS CODE (${status})\n`);
    }

    await browser.close();
    process.exit(status === 200 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

testMembersAPI().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
