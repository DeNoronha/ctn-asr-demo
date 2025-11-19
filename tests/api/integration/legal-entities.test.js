/**
 * CTN ASR API Tests - Legal Entity Operations
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
 * Run all legal entity operation tests
 * @param {string} token - Access token
 * @param {string} legalEntityId - Legal entity ID from member creation
 */
async function runLegalEntityTests(token, legalEntityId) {
  console.log('\n--- Legal Entity Operations ---');

  // Test: Get legal entity by ID
  if (legalEntityId) {
    await runTest('Legal Entities', 'Get legal entity by ID', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}`, { token });
      assertStatus(response.status, 200);
      assertExists(response.data.legal_entity_id, 'legal_entity_id');
      assertExists(response.data.primary_legal_name, 'primary_legal_name');
    });
  } else {
    skipTest('Legal Entities', 'Get legal entity by ID', 'No legal entity ID provided');
  }

  // Test: Get legal entity with identifiers included
  if (legalEntityId) {
    await runTest('Legal Entities', 'Get legal entity with identifiers', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}`, { token });
      assertStatus(response.status, 200);
      // The response includes identifiers array
      assertExists(response.data.identifiers, 'identifiers array');
    });
  } else {
    skipTest('Legal Entities', 'Get legal entity with identifiers', 'No legal entity ID provided');
  }

  // Test: Get legal entity - not found
  await runTest('Legal Entities', 'Get legal entity - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('GET', `/legal-entities/${fakeId}`, { token });
    // Should return 404 for non-existent entity
    assertStatus(response.status, 404);
  });

  // Test: Get legal entity - invalid UUID format
  await runTest('Legal Entities', 'Get legal entity - invalid UUID', async () => {
    const response = await apiRequest('GET', '/legal-entities/invalid-uuid', { token });
    assertStatus(response.status, 400);
  });

  // Test: Update legal entity
  if (legalEntityId) {
    await runTest('Legal Entities', 'Update legal entity', async () => {
      const updateData = {
        address_line1: `Test Address ${Date.now()}`,
        city: 'Amsterdam',
        postal_code: '1000 AA',
        country_code: 'NL'
      };

      const response = await apiRequest('PUT', `/legal-entities/${legalEntityId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Legal Entities', 'Update legal entity', 'No legal entity ID provided');
  }

  // Test: Update legal entity - partial update
  if (legalEntityId) {
    await runTest('Legal Entities', 'Update legal entity - partial update', async () => {
      const updateData = {
        city: 'Rotterdam'
      };

      const response = await apiRequest('PUT', `/legal-entities/${legalEntityId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Legal Entities', 'Update legal entity - partial update', 'No legal entity ID provided');
  }

  // Test: Update legal entity - not found
  await runTest('Legal Entities', 'Update legal entity - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/legal-entities/${fakeId}`, {
      token,
      body: { city: 'Test' }
    });
    assertStatus(response.status, 404);
  });

  return { legalEntityId };
}

module.exports = { runLegalEntityTests };
