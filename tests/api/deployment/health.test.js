/**
 * Health & Core Endpoint Tests
 *
 * Tests basic API health and core endpoints.
 * Run first to verify deployment before other tests.
 *
 * Usage:
 *   node health.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required for authenticated tests
 *   API_URL - Optional, defaults to Container Apps dev
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, TestRunner, assert } = require('./utils');

async function main() {
  validateConfig();

  const runner = new TestRunner('Health & Core Endpoints');
  let token;

  console.log('='.repeat(50));
  console.log('Health & Core Endpoint Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log('');

  // Test 1: Health check (no auth)
  await runner.test('Health endpoint returns 200', async () => {
    const response = await apiRequest(config.api.healthUrl.replace(config.api.baseUrl, ''));
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.status === 'healthy' || response.body === 'healthy',
      'API should report healthy status');
  });

  // Test 2: Version endpoint (no auth)
  await runner.test('Version endpoint returns version info', async () => {
    const response = await apiRequest('/version');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.version, 'Response should include version');
  });

  // Test 3: Acquire token
  await runner.test('Azure AD token acquisition', async () => {
    token = await getToken();
    assert(token && token.length > 100, 'Should receive valid JWT token');
  });

  if (!token) {
    console.log('\nSkipping authenticated tests - no token available');
    runner.printSummary();
    process.exit(1);
  }

  // Test 4: Party resolution (requires auth)
  await runner.test('Party resolution returns user info', async () => {
    const response = await apiRequest('/auth/resolve-party', {}, token);
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.party_type, 'Response should include party_type');
    assert(response.body.party_id, 'Response should include party_id');
  });

  // Test 5: Get authenticated member
  await runner.test('Get authenticated member profile', async () => {
    const response = await apiRequest('/member', {}, token);
    // May return 404 if test user is not a member, which is acceptable
    if (response.status === 404) {
      console.log('  (Test user is not a member - expected in some configurations)');
    }
    assert([200, 404].includes(response.status),
      `Expected 200 or 404, got ${response.status}`);
  });

  // Test 6: Get all members (admin endpoint)
  let members = [];
  await runner.test('Get all members (admin)', async () => {
    const response = await apiRequest('/all-members', {}, token);
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.data, 'Response should include data array');
    members = response.body.data;
    console.log(`  Found ${members.length} members`);
  });

  // Test 7: Get legal entity (if members exist)
  if (members.length > 0) {
    const legalEntityId = members[0].legal_entity_id;
    await runner.test('Get legal entity by ID', async () => {
      const response = await apiRequest(`/legal-entities/${legalEntityId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.legal_entity_id === legalEntityId,
        'Response should match requested ID');
    });

    // Test 8: Get identifiers for legal entity
    await runner.test('Get identifiers for legal entity', async () => {
      const response = await apiRequest(`/entities/${legalEntityId}/identifiers`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(Array.isArray(response.body), 'Response should be an array');
      console.log(`  Found ${response.body.length} identifiers`);
    });
  } else {
    runner.skip('Get legal entity by ID', 'No members available');
    runner.skip('Get identifiers for legal entity', 'No members available');
  }

  // Test 9: Get audit logs (admin)
  await runner.test('Get audit logs (admin)', async () => {
    const response = await apiRequest('/audit-logs', {}, token);
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.data, 'Response should include data array');
    console.log(`  Found ${response.body.data.length} audit logs`);
  });

  // Print summary
  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
