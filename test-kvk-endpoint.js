// Test KvK verification endpoint with E2E user authentication
const { chromium } = require('@playwright/test');

async function testKvKEndpoint() {
  console.log('🔍 Testing KvK Verification Endpoint...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Load saved auth state
    console.log('📥 Loading authentication state...');
    const authState = require('./member-portal/playwright/.auth/user.json');
    await context.addCookies(authState.cookies);
    await context.addInitScript((origins) => {
      for (const [origin, localStorage] of Object.entries(origins)) {
        for (const [key, value] of Object.entries(localStorage)) {
          window.localStorage.setItem(key, value);
        }
      }
    }, authState.origins);

    // Navigate to member portal to ensure token is available
    console.log('🌐 Navigating to member portal...');
    await page.goto('https://calm-pebble-043b2db03.1.azurestaticapps.net/');
    await page.waitForTimeout(3000);

    // Extract access token from localStorage
    console.log('🔑 Extracting access token...');
    const accessToken = await page.evaluate(() => {
      const msalKeys = Object.keys(localStorage).filter(key =>
        key.includes('accesstoken') && key.includes('Member.Read')
      );
      if (msalKeys.length === 0) return null;

      const tokenData = localStorage.getItem(msalKeys[0]);
      if (!tokenData) return null;

      try {
        const parsed = JSON.parse(tokenData);
        return parsed.secret;
      } catch (e) {
        return null;
      }
    });

    if (!accessToken) {
      throw new Error('❌ Could not extract access token from localStorage');
    }

    console.log('✅ Access token obtained (length:', accessToken.length, ')\n');

    // Get member data to find legal entity ID
    console.log('👤 Fetching member data...');
    const memberResponse = await fetch('https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/member', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!memberResponse.ok) {
      throw new Error(`❌ Member API failed: ${memberResponse.status} ${memberResponse.statusText}`);
    }

    const memberData = await memberResponse.json();
    const legalEntityId = memberData.legalEntityId;
    console.log('✅ Legal Entity ID:', legalEntityId, '\n');

    // Test KvK verification endpoint
    console.log('🧪 Testing KvK verification endpoint...');
    const kvkUrl = `https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/${legalEntityId}/kvk-verification`;
    console.log('📍 URL:', kvkUrl);

    const kvkResponse = await fetch(kvkUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response Status:', kvkResponse.status, kvkResponse.statusText);

    const responseText = await kvkResponse.text();
    console.log('📦 Response Body:', responseText.substring(0, 500));

    if (kvkResponse.ok) {
      console.log('\n✅ SUCCESS: KvK verification endpoint is working!');
      try {
        const kvkData = JSON.parse(responseText);
        console.log('\n📋 KvK Verification Data:');
        console.log('  - Identifier Type:', kvkData.identifier_type);
        console.log('  - Identifier Value:', kvkData.identifier_value);
        console.log('  - Verification Status:', kvkData.verification_status || 'N/A');
        console.log('  - Validation Status:', kvkData.validation_status || 'N/A');
      } catch (e) {
        // Response is not JSON
      }
    } else {
      console.log('\n❌ FAILED: KvK verification endpoint returned error');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testKvKEndpoint().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
