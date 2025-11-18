/**
 * CTN ASR API Tests - KvK Integration Operations
 */

const {
  apiRequest,
  runTest,
  skipTest,
  generateUUID,
  assertStatus,
  assertExists
} = require('../test-utils');

/**
 * Run all KvK integration tests
 * @param {string} token - Access token
 * @param {string} legalEntityId - Legal entity ID to test with
 */
async function runKvkTests(token, legalEntityId) {
  console.log('\n--- KvK Integration Operations ---');

  // Test: Get KvK registry data for entity
  if (legalEntityId) {
    await runTest('KvK', 'Get KvK registry data', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}/kvk-registry-data`, { token });
      // May return 404 if no KvK data exists for test entity
      if (response.status === 404) {
        // This is acceptable - no KvK data exists
        return;
      }
      assertStatus(response.status, 200);
      if (response.data) {
        assertExists(response.data.kvk_number, 'kvk_number');
      }
    });
  } else {
    skipTest('KvK', 'Get KvK registry data', 'No legal entity ID provided');
  }

  // Test: Get KvK registry data - invalid UUID
  await runTest('KvK', 'Get KvK registry data - invalid UUID', async () => {
    const response = await apiRequest('GET', '/legal-entities/invalid-uuid/kvk-registry-data', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get KvK registry data - not found
  await runTest('KvK', 'Get KvK registry data - entity not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('GET', `/legal-entities/${fakeId}/kvk-registry-data`, { token });
    assertStatus(response.status, 404);
  });

  // Test: Get KvK verification status
  if (legalEntityId) {
    await runTest('KvK', 'Get KvK verification status', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}/kvk-verification-status`, { token });
      // May return 404 if no verification exists
      if (response.status === 404) {
        return;
      }
      assertStatus(response.status, 200);
    });
  } else {
    skipTest('KvK', 'Get KvK verification status', 'No legal entity ID provided');
  }

  // Test: Get flagged entities (admin endpoint)
  await runTest('KvK', 'Get flagged entities', async () => {
    const response = await apiRequest('GET', '/admin/flagged-entities', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
  });

  // Note: Upload KvK document and review verification tests require
  // file upload functionality which is more complex to test via API
  // These would be better tested via Playwright E2E tests

  return {};
}

module.exports = { runKvkTests };
