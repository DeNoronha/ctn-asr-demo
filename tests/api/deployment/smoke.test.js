/**
 * Comprehensive Smoke Tests
 *
 * Quick verification that all major API areas are functioning.
 * Designed to run fast and catch major issues after deployment.
 *
 * Usage:
 *   node smoke.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required
 *   API_URL - Optional
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, TestRunner, assert } = require('./utils');

async function main() {
  validateConfig();

  const runner = new TestRunner('Comprehensive Smoke Tests');
  let token;

  console.log('='.repeat(50));
  console.log('Comprehensive Smoke Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log('');

  // =========================================
  // 1. Health & Infrastructure
  // =========================================
  console.log('--- Health & Infrastructure ---\n');

  await runner.test('Health endpoint', async () => {
    const response = await apiRequest(config.api.healthUrl.replace(config.api.baseUrl, ''));
    assert(response.status === 200, `Health check failed: ${response.status}`);
  });

  await runner.test('Version endpoint', async () => {
    const response = await apiRequest('/version');
    assert(response.status === 200, `Version failed: ${response.status}`);
    assert(response.body.version, 'No version returned');
  });

  await runner.test('Authentication', async () => {
    token = await getToken();
    assert(token, 'Token acquisition failed');
  });

  if (!token) {
    console.log('\nCannot continue without authentication');
    runner.printSummary();
    process.exit(1);
  }

  // =========================================
  // 2. Core Member Operations
  // =========================================
  console.log('\n--- Core Member Operations ---\n');

  let members = [];
  let legalEntityId;

  await runner.test('Get all members', async () => {
    const response = await apiRequest('/all-members', {}, token);
    assert(response.status === 200, `Get members failed: ${response.status}`);
    members = response.body.data || [];
    console.log(`  Count: ${members.length}`);
  });

  if (members.length > 0) {
    legalEntityId = members[0].legal_entity_id;

    await runner.test('Get legal entity', async () => {
      const response = await apiRequest(`/legal-entities/${legalEntityId}`, {}, token);
      assert(response.status === 200, `Get entity failed: ${response.status}`);
    });

    await runner.test('Get contacts for entity', async () => {
      const response = await apiRequest(`/entities/${legalEntityId}/contacts`, {}, token);
      assert(response.status === 200, `Get contacts failed: ${response.status}`);
      console.log(`  Count: ${response.body.length || 0}`);
    });

    await runner.test('Get identifiers for entity', async () => {
      const response = await apiRequest(`/entities/${legalEntityId}/identifiers`, {}, token);
      assert(response.status === 200, `Get identifiers failed: ${response.status}`);
      console.log(`  Count: ${response.body.length || 0}`);
    });

    await runner.test('Get endpoints for entity', async () => {
      const response = await apiRequest(`/entities/${legalEntityId}/endpoints`, {}, token);
      assert(response.status === 200, `Get endpoints failed: ${response.status}`);
      console.log(`  Count: ${response.body.length || 0}`);
    });
  } else {
    runner.skip('Get legal entity', 'No members available');
    runner.skip('Get contacts for entity', 'No members available');
    runner.skip('Get identifiers for entity', 'No members available');
    runner.skip('Get endpoints for entity', 'No members available');
  }

  // =========================================
  // 3. Applications
  // =========================================
  console.log('\n--- Applications ---\n');

  await runner.test('Get applications list', async () => {
    const response = await apiRequest('/applications', {}, token);
    assert(response.status === 200, `Get applications failed: ${response.status}`);
    const count = response.body.data?.length || response.body.length || 0;
    console.log(`  Count: ${count}`);
  });

  // =========================================
  // 4. Audit & Logging
  // =========================================
  console.log('\n--- Audit & Logging ---\n');

  await runner.test('Get audit logs', async () => {
    const response = await apiRequest('/audit-logs', {}, token);
    assert(response.status === 200, `Get audit logs failed: ${response.status}`);
    const count = response.body.data?.length || 0;
    console.log(`  Count: ${count}`);
  });

  // =========================================
  // 5. User Context
  // =========================================
  console.log('\n--- User Context ---\n');

  await runner.test('Resolve party', async () => {
    const response = await apiRequest('/auth/resolve-party', {}, token);
    assert(response.status === 200, `Resolve party failed: ${response.status}`);
    console.log(`  Type: ${response.body.party_type}`);
  });

  await runner.test('Get current member', async () => {
    const response = await apiRequest('/member', {}, token);
    // 404 is acceptable if test user is not a member
    assert([200, 404].includes(response.status),
      `Get member failed: ${response.status}`);
    if (response.status === 200) {
      console.log(`  Name: ${response.body.legal_name}`);
    } else {
      console.log('  (Test user not a member)');
    }
  });

  // =========================================
  // 6. KvK Integration
  // =========================================
  console.log('\n--- KvK Integration ---\n');

  await runner.test('KvK lookup endpoint available', async () => {
    // Just verify endpoint exists, don't actually call external service
    const response = await apiRequest('/kvk/search?q=test', {}, token);
    // May return 200, 404, or 400 depending on implementation
    assert([200, 400, 404, 503].includes(response.status),
      `KvK endpoint error: ${response.status}`);
    if (response.status === 200) {
      console.log('  KvK lookup available');
    } else if (response.status === 503) {
      console.log('  KvK service unavailable (external)');
    }
  });

  // =========================================
  // 7. M2M Client Management (if admin)
  // =========================================
  console.log('\n--- M2M Client Management ---\n');

  await runner.test('M2M clients endpoint', async () => {
    const response = await apiRequest('/m2m-clients', {}, token);
    assert([200, 403].includes(response.status),
      `M2M clients error: ${response.status}`);
    if (response.status === 200) {
      const count = response.body.data?.length || response.body.length || 0;
      console.log(`  Count: ${count}`);
    } else {
      console.log('  (Requires admin role)');
    }
  });

  // =========================================
  // Summary
  // =========================================
  const { passed, failed, skipped } = runner.printSummary();

  // Provide overall status
  if (failed === 0) {
    console.log('\n*** SMOKE TESTS PASSED - API is functional ***\n');
  } else {
    console.log('\n*** SMOKE TESTS FAILED - Issues detected ***\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
