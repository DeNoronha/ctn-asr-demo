/**
 * CTN ASR API Tests - Endpoint Operations
 */

const {
  apiRequest,
  runTest,
  skipTest,
  generateTestId,
  generateUUID,
  assertStatus,
  assertExists,
  assertMinLength
} = require('../test-utils');

// Store created endpoints for cleanup
const createdEndpoints = [];

/**
 * Run all endpoint operation tests
 * @param {string} token - Access token
 * @param {string} legalEntityId - Legal entity ID to test with
 */
async function runEndpointTests(token, legalEntityId) {
  console.log('\n--- Endpoint Operations ---');

  // Test: Get endpoints for entity
  if (legalEntityId) {
    await runTest('Endpoints', 'Get endpoints for entity', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}/endpoints`, { token });
      assertStatus(response.status, 200);
      assertExists(response.data, 'response data');
      // Response is an array
      if (!Array.isArray(response.data)) {
        throw new Error('Expected response to be an array');
      }
    });
  } else {
    skipTest('Endpoints', 'Get endpoints for entity', 'No legal entity ID provided');
  }

  // Test: Get endpoints - invalid UUID
  await runTest('Endpoints', 'Get endpoints - invalid UUID', async () => {
    const response = await apiRequest('GET', '/legal-entities/invalid-uuid/endpoints', { token });
    assertStatus(response.status, 400);
  });

  // Test: Create REST API endpoint
  let createdRestEndpointId = null;
  if (legalEntityId) {
    await runTest('Endpoints', 'Create REST API endpoint', async () => {
      const endpointData = {
        endpoint_name: `Test REST Endpoint ${Date.now()}`,
        endpoint_url: `https://api.test-${Date.now()}.example.com/v1`,
        endpoint_description: 'Test REST API endpoint for automated testing',
        data_category: 'BOOKING',
        endpoint_type: 'REST_API',
        authentication_method: 'TOKEN',
        is_active: true
      };

      const response = await apiRequest('POST', `/legal-entities/${legalEntityId}/endpoints`, {
        token,
        body: endpointData
      });

      assertStatus(response.status, 201);
      assertExists(response.data.legal_entity_endpoint_id, 'endpoint ID');
      assertExists(response.data.endpoint_name, 'endpoint_name');

      createdRestEndpointId = response.data.legal_entity_endpoint_id;
      createdEndpoints.push(createdRestEndpointId);
    });
  } else {
    skipTest('Endpoints', 'Create REST API endpoint', 'No legal entity ID provided');
  }

  // Test: Create webhook endpoint
  let createdWebhookEndpointId = null;
  if (legalEntityId) {
    await runTest('Endpoints', 'Create webhook endpoint', async () => {
      const endpointData = {
        endpoint_name: `Test Webhook ${Date.now()}`,
        endpoint_url: `https://webhook.test-${Date.now()}.example.com/callback`,
        endpoint_description: 'Test webhook endpoint',
        data_category: 'EVENT',
        endpoint_type: 'WEBHOOK',
        authentication_method: 'HMAC',
        is_active: true
      };

      const response = await apiRequest('POST', `/legal-entities/${legalEntityId}/endpoints`, {
        token,
        body: endpointData
      });

      assertStatus(response.status, 201);
      createdWebhookEndpointId = response.data.legal_entity_endpoint_id;
      createdEndpoints.push(createdWebhookEndpointId);
    });
  } else {
    skipTest('Endpoints', 'Create webhook endpoint', 'No legal entity ID provided');
  }

  // Test: Create endpoint - missing required fields
  if (legalEntityId) {
    await runTest('Endpoints', 'Create endpoint - missing name', async () => {
      const endpointData = {
        endpoint_url: 'https://api.example.com'
        // Missing endpoint_name
      };

      const response = await apiRequest('POST', `/legal-entities/${legalEntityId}/endpoints`, {
        token,
        body: endpointData
      });

      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Endpoints', 'Create endpoint - missing name', 'No legal entity ID provided');
  }

  // Test: Create endpoint - entity not found
  await runTest('Endpoints', 'Create endpoint - entity not found', async () => {
    const fakeId = generateUUID();
    const endpointData = {
      endpoint_name: 'Test Endpoint',
      endpoint_url: 'https://api.example.com'
    };

    const response = await apiRequest('POST', `/legal-entities/${fakeId}/endpoints`, {
      token,
      body: endpointData
    });

    assertStatus(response.status, 404);
  });

  // Test: Update endpoint
  if (createdRestEndpointId) {
    await runTest('Endpoints', 'Update endpoint', async () => {
      const updateData = {
        endpoint_description: 'Updated description for API testing',
        is_active: false
      };

      const response = await apiRequest('PUT', `/endpoints/${createdRestEndpointId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Endpoints', 'Update endpoint', 'No endpoint was created');
  }

  // Test: Update endpoint - reactivate
  if (createdRestEndpointId) {
    await runTest('Endpoints', 'Update endpoint - reactivate', async () => {
      const updateData = {
        is_active: true
      };

      const response = await apiRequest('PUT', `/endpoints/${createdRestEndpointId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Endpoints', 'Update endpoint - reactivate', 'No endpoint was created');
  }

  // Test: Update endpoint - not found
  await runTest('Endpoints', 'Update endpoint - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/endpoints/${fakeId}`, {
      token,
      body: { endpoint_description: 'Test' }
    });
    assertStatus(response.status, 404);
  });

  // Test: Issue endpoint token
  if (createdRestEndpointId) {
    await runTest('Endpoints', 'Issue endpoint token', async () => {
      const response = await apiRequest('POST', `/endpoints/${createdRestEndpointId}/token`, {
        token,
        body: {}
      });

      // May return 200 or 201 depending on implementation
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Expected status 200 or 201, got ${response.status}`);
      }
    });
  } else {
    skipTest('Endpoints', 'Issue endpoint token', 'No endpoint was created');
  }

  // Test: Get endpoint tokens
  if (createdRestEndpointId) {
    await runTest('Endpoints', 'Get endpoint tokens', async () => {
      const response = await apiRequest('GET', `/endpoints/${createdRestEndpointId}/tokens`, { token });
      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Endpoints', 'Get endpoint tokens', 'No endpoint was created');
  }

  return { createdEndpoints };
}

/**
 * Cleanup created test endpoints
 * Note: Endpoints use soft delete
 * @param {string} token - Access token
 */
async function cleanupEndpoints(token) {
  console.log('\n--- Cleaning up test endpoints ---');

  for (const endpointId of createdEndpoints) {
    try {
      // Deactivate endpoint (soft delete)
      await apiRequest('PUT', `/endpoints/${endpointId}`, {
        token,
        body: { is_active: false, deactivation_reason: 'API test cleanup' }
      });
      console.log(`  Cleaned up endpoint: ${endpointId}`);
    } catch (error) {
      console.log(`  Failed to cleanup endpoint ${endpointId}: ${error.message}`);
    }
  }
}

module.exports = { runEndpointTests, cleanupEndpoints };
