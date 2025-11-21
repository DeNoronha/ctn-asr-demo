import { expect, test } from '@playwright/test';

test.describe('KvK Verification Endpoint', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should successfully fetch KvK verification status', async ({ page }) => {
    // Navigate to member portal
    await page.goto('https://calm-pebble-043b2db03.1.azurestaticapps.net/');

    // Wait for dashboard to load (indicates successful auth)
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    // Extract access token and legal entity ID from the page context
    const apiData = await page.evaluate(async () => {
      // Get access token from MSAL
      const msalKeys = Object.keys(localStorage).filter(key =>
        key.includes('accesstoken') && key.includes('Member.Read')
      );

      if (msalKeys.length === 0) {
        throw new Error('No MSAL access token found in localStorage');
      }

      const tokenData = localStorage.getItem(msalKeys[0]);
      if (!tokenData) {
        throw new Error('Could not retrieve token data');
      }

      const parsed = JSON.parse(tokenData);
      const accessToken = parsed.secret;

      // Fetch member data to get legal entity ID
      const memberResponse = await fetch(
        'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/member',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!memberResponse.ok) {
        throw new Error(`Member API failed: ${memberResponse.status}`);
      }

      const memberData = await memberResponse.json();
      const legalEntityId = memberData.legalEntityId;

      // Test KvK verification endpoint
      const kvkResponse = await fetch(
        `https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/${legalEntityId}/kvk-verification`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseText = await kvkResponse.text();

      return {
        status: kvkResponse.status,
        statusText: kvkResponse.statusText,
        body: responseText,
        legalEntityId,
      };
    });

    console.log('🧪 KvK Verification Test Results:');
    console.log('  Legal Entity ID:', apiData.legalEntityId);
    console.log('  Response Status:', apiData.status, apiData.statusText);
    console.log('  Response Body:', apiData.body.substring(0, 300));

    // Assertions
    expect(apiData.status).toBe(200);

    // Parse and validate response body
    const kvkData = JSON.parse(apiData.body);
    expect(kvkData).toHaveProperty('identifier_type');
    expect(kvkData.identifier_type).toBe('KVK');
    expect(kvkData).toHaveProperty('identifier_value');
    expect(kvkData).toHaveProperty('legal_entity_id');

    console.log('✅ KvK verification endpoint is working correctly!');
    console.log('  - Identifier Type:', kvkData.identifier_type);
    console.log('  - Identifier Value:', kvkData.identifier_value);
    console.log('  - Verification Status:', kvkData.verification_status || 'N/A');
  });
});
