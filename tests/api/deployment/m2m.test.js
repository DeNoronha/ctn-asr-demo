/**
 * M2M (Machine-to-Machine) Authentication Tests
 *
 * Tests Keycloak-based M2M authentication:
 * - Token acquisition from Keycloak
 * - M2M endpoint access with scopes
 * - Dual authentication (Azure AD + Keycloak)
 *
 * Usage:
 *   node m2m.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required for Azure AD tests
 *   KEYCLOAK_URL - Keycloak server URL
 *   KEYCLOAK_CLIENT_ID - M2M client ID
 *   KEYCLOAK_CLIENT_SECRET - M2M client secret
 *   API_URL - Optional
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, request, TestRunner, assert, log } = require('./utils');

// M2M Configuration
const m2mConfig = {
  keycloakUrl: process.env.KEYCLOAK_URL || 'https://keycloak.ctn-demo.nl',
  realm: process.env.KEYCLOAK_REALM || 'ctn',
  clientId: process.env.KEYCLOAK_CLIENT_ID || '',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
};

/**
 * Get Keycloak M2M token
 */
async function getKeycloakToken(scopes = []) {
  const tokenUrl = `${m2mConfig.keycloakUrl}/realms/${m2mConfig.realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: m2mConfig.clientId,
    client_secret: m2mConfig.clientSecret,
    scope: scopes.join(' '),
  }).toString();

  const response = await request(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (response.status === 200 && response.body.access_token) {
    return response.body.access_token;
  }

  throw new Error(response.body.error_description || 'Failed to acquire Keycloak token');
}

async function main() {
  const runner = new TestRunner('M2M Authentication Tests');
  let azureToken;
  let keycloakToken;

  console.log('='.repeat(50));
  console.log('M2M Authentication Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log(`Keycloak: ${m2mConfig.keycloakUrl}`);
  console.log('');

  // Check if M2M credentials are configured
  const hasKeycloakConfig = m2mConfig.clientId && m2mConfig.clientSecret;

  // =========================================
  // Azure AD Authentication (for comparison)
  // =========================================
  console.log('--- Azure AD Authentication ---\n');

  if (config.auth.password) {
    await runner.test('Acquire Azure AD token', async () => {
      azureToken = await getToken();
      assert(azureToken, 'Should receive valid Azure AD token');
    });

    await runner.test('Access API with Azure AD token', async () => {
      const response = await apiRequest('/auth/resolve-party', {}, azureToken);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      console.log(`  Party Type: ${response.body.party_type}`);
    });
  } else {
    runner.skip('Acquire Azure AD token', 'E2E_TEST_USER_PASSWORD not set');
    runner.skip('Access API with Azure AD token', 'No Azure AD token');
  }

  // =========================================
  // Keycloak M2M Authentication
  // =========================================
  console.log('\n--- Keycloak M2M Authentication ---\n');

  if (!hasKeycloakConfig) {
    log('Keycloak credentials not configured', 'warning');
    log('Set KEYCLOAK_CLIENT_ID and KEYCLOAK_CLIENT_SECRET to run M2M tests', 'info');
    runner.skip('Acquire Keycloak M2M token', 'Keycloak credentials not configured');
    runner.skip('Access M2M endpoints', 'No Keycloak token');
  } else {
    // Test 1: Acquire Keycloak token
    await runner.test('Acquire Keycloak M2M token', async () => {
      keycloakToken = await getKeycloakToken(['Booking.Read', 'Booking.Write']);
      assert(keycloakToken, 'Should receive valid Keycloak token');
      console.log(`  Token length: ${keycloakToken.length} chars`);
    });

    if (keycloakToken) {
      // Test 2: Access M2M booking endpoint
      await runner.test('Access booking endpoint with M2M token', async () => {
        const response = await apiRequest('/bookings', {}, keycloakToken);
        // Should succeed or return empty list
        assert([200, 404].includes(response.status),
          `Expected 200/404, got ${response.status}`);
        if (response.status === 200) {
          const count = response.body.data?.length || response.body.length || 0;
          console.log(`  Bookings: ${count}`);
        }
      });

      // Test 3: Access ETA endpoint
      await runner.test('Access ETA updates endpoint', async () => {
        // Get token with ETA scope
        const etaToken = await getKeycloakToken(['ETA.Read']);
        const response = await apiRequest('/eta-updates', {}, etaToken);
        assert([200, 404].includes(response.status),
          `Expected 200/404, got ${response.status}`);
      });

      // Test 4: Access container status endpoint
      await runner.test('Access container status endpoint', async () => {
        // Get token with Container scope
        const containerToken = await getKeycloakToken(['Container.Read']);
        const response = await apiRequest('/container-status', {}, containerToken);
        assert([200, 404].includes(response.status),
          `Expected 200/404, got ${response.status}`);
      });

      // Test 5: Test insufficient scope
      await runner.test('Insufficient scope returns 403', async () => {
        // Try to access booking with only Read scope when Write is needed
        const readOnlyToken = await getKeycloakToken(['Booking.Read']);
        const response = await apiRequest('/bookings', {
          method: 'POST',
          body: { test: 'data' },
        }, readOnlyToken);
        // Should be rejected for insufficient scope
        assert([401, 403].includes(response.status),
          `Expected 401/403 for insufficient scope, got ${response.status}`);
      });
    }
  }

  // =========================================
  // Dual Authentication Tests
  // =========================================
  console.log('\n--- Dual Authentication Tests ---\n');

  if (azureToken) {
    // Test: Azure AD user can access M2M endpoints
    await runner.test('Azure AD token works on dual-auth endpoints', async () => {
      const response = await apiRequest('/bookings', {}, azureToken);
      // Azure AD users should also be able to access
      assert([200, 403, 404].includes(response.status),
        `Expected 200/403/404, got ${response.status}`);
      if (response.status === 200) {
        console.log('  Azure AD user can access M2M endpoint');
      } else if (response.status === 403) {
        console.log('  Azure AD user lacks required role (expected)');
      }
    });
  } else {
    runner.skip('Azure AD token works on dual-auth endpoints', 'No Azure AD token');
  }

  // =========================================
  // M2M Client Management Tests
  // =========================================
  console.log('\n--- M2M Client Management ---\n');

  if (azureToken) {
    // Test: List M2M clients (admin only)
    await runner.test('List M2M clients', async () => {
      const response = await apiRequest('/m2m-clients', {}, azureToken);
      assert([200, 403].includes(response.status),
        `Expected 200/403, got ${response.status}`);
      if (response.status === 200) {
        const count = response.body.data?.length || response.body.length || 0;
        console.log(`  M2M clients: ${count}`);
      } else {
        console.log('  User lacks admin role for M2M client management');
      }
    });
  } else {
    runner.skip('List M2M clients', 'No Azure AD token');
  }

  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
