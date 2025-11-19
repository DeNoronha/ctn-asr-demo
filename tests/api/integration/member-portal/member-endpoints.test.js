/**
 * CTN ASR API Tests - Member Endpoints Operations (Self-Service)
 *
 * Tests for member portal M2M endpoint management:
 * - Get own endpoints
 * - Create endpoints for own entity
 * - Get own tokens
 * - Token issuance
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
} = require('../../test-utils');

// Store created endpoints for cleanup
const createdEndpoints = [];

/**
 * Run all member endpoint operation tests
 * @param {string} token - Access token
 * @returns {Promise<{createdEndpoints: string[]}>}
 */
async function runMemberEndpointTests(token) {
  console.log('\n--- Member Endpoint Operations (Self-Service) ---');

  // Test: Get own endpoints
  let existingEndpoints = [];
  await runTest('Member Endpoints', 'Get own endpoints', async () => {
    const response = await apiRequest('GET', '/member-endpoints', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    assertExists(response.data.endpoints, 'endpoints array');

    if (!Array.isArray(response.data.endpoints)) {
      throw new Error('endpoints should be an array');
    }

    existingEndpoints = response.data.endpoints;
  });

  // Test: Get endpoints - without auth
  await runTest('Member Endpoints', 'Get endpoints - no auth', async () => {
    const response = await apiRequest('GET', '/member-endpoints', { skipAuth: true });
    assertStatus(response.status, 401);
  });

  // Test: Get endpoints - invalid token
  await runTest('Member Endpoints', 'Get endpoints - invalid token', async () => {
    const response = await apiRequest('GET', '/member-endpoints', {
      token: 'invalid-token-12345'
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify endpoint structure
  if (existingEndpoints.length > 0) {
    await runTest('Member Endpoints', 'Verify endpoint data structure', async () => {
      const endpoint = existingEndpoints[0];
      const requiredFields = [
        'legal_entity_endpoint_id',
        'legal_entity_id',
        'endpoint_name',
        'endpoint_url'
      ];

      for (const field of requiredFields) {
        if (endpoint[field] === undefined) {
          throw new Error(`Required field '${field}' missing from endpoint`);
        }
      }
    });
  } else {
    skipTest('Member Endpoints', 'Verify endpoint data structure', 'No existing endpoints');
  }

  // Test: Create REST API endpoint
  let createdRestId = null;
  await runTest('Member Endpoints', 'Create REST API endpoint', async () => {
    const endpointData = {
      endpoint_name: `Test REST API ${Date.now()}`,
      endpoint_url: `https://api.test-member-${Date.now()}.example.com/v1`,
      endpoint_description: 'Test REST API endpoint for member portal tests',
      data_category: 'BOOKING',
      endpoint_type: 'REST_API',
      authentication_method: 'BEARER_TOKEN',
      is_active: true
    };

    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: endpointData
    });

    assertStatus(response.status, 201);
    assertExists(response.data.endpointId, 'endpointId');

    createdRestId = response.data.endpointId;
    createdEndpoints.push(createdRestId);
  });

  // Test: Create webhook endpoint
  let createdWebhookId = null;
  await runTest('Member Endpoints', 'Create webhook endpoint', async () => {
    const endpointData = {
      endpoint_name: `Test Webhook ${Date.now()}`,
      endpoint_url: `https://webhook.test-member-${Date.now()}.example.com/callback`,
      endpoint_description: 'Test webhook endpoint for member portal tests',
      data_category: 'EVENT',
      endpoint_type: 'WEBHOOK',
      authentication_method: 'HMAC',
      is_active: true
    };

    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: endpointData
    });

    assertStatus(response.status, 201);
    createdWebhookId = response.data.endpointId;
    createdEndpoints.push(createdWebhookId);
  });

  // Test: Create GraphQL endpoint
  let createdGraphqlId = null;
  await runTest('Member Endpoints', 'Create GraphQL endpoint', async () => {
    const endpointData = {
      endpoint_name: `Test GraphQL ${Date.now()}`,
      endpoint_url: `https://graphql.test-member-${Date.now()}.example.com/graphql`,
      endpoint_description: 'Test GraphQL endpoint',
      data_category: 'GENERAL',
      endpoint_type: 'GRAPHQL',
      authentication_method: 'BEARER_TOKEN',
      is_active: true
    };

    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: endpointData
    });

    assertStatus(response.status, 201);
    createdGraphqlId = response.data.endpointId;
    createdEndpoints.push(createdGraphqlId);
  });

  // Test: Create endpoint - missing required fields
  await runTest('Member Endpoints', 'Create endpoint - missing name', async () => {
    const endpointData = {
      endpoint_url: 'https://api.example.com'
      // Missing endpoint_name
    };

    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: endpointData
    });

    // Should fail validation
    if (response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected status 400 or 500, got ${response.status}`);
    }
  });

  // Test: Create endpoint - missing URL
  await runTest('Member Endpoints', 'Create endpoint - missing URL', async () => {
    const endpointData = {
      endpoint_name: 'Test Endpoint'
      // Missing endpoint_url
    };

    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: endpointData
    });

    if (response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected status 400 or 500, got ${response.status}`);
    }
  });

  // Test: Create endpoint - without auth
  await runTest('Member Endpoints', 'Create endpoint - no auth', async () => {
    const response = await apiRequest('POST', '/member/endpoints', {
      skipAuth: true,
      body: {
        endpoint_name: 'Test',
        endpoint_url: 'https://test.example.com'
      }
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify created endpoints appear in list
  if (createdEndpoints.length > 0) {
    await runTest('Member Endpoints', 'Verify created endpoints in list', async () => {
      const response = await apiRequest('GET', '/member-endpoints', { token });
      assertStatus(response.status, 200);

      const endpointIds = response.data.endpoints.map(e => e.legal_entity_endpoint_id);

      for (const createdId of createdEndpoints) {
        if (!endpointIds.includes(createdId)) {
          throw new Error(`Created endpoint ${createdId} not found in list`);
        }
      }
    });
  } else {
    skipTest('Member Endpoints', 'Verify created endpoints in list', 'No endpoints were created');
  }

  // Test: Get own tokens
  await runTest('Member Endpoints', 'Get own tokens', async () => {
    const response = await apiRequest('GET', '/member/tokens', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    assertExists(response.data.tokens, 'tokens array');

    if (!Array.isArray(response.data.tokens)) {
      throw new Error('tokens should be an array');
    }
  });

  // Test: Get tokens - without auth
  await runTest('Member Endpoints', 'Get tokens - no auth', async () => {
    const response = await apiRequest('GET', '/member/tokens', { skipAuth: true });
    assertStatus(response.status, 401);
  });

  // Test: Get tokens - invalid token
  await runTest('Member Endpoints', 'Get tokens - invalid token', async () => {
    const response = await apiRequest('GET', '/member/tokens', {
      token: 'invalid-token-12345'
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify endpoints are filtered to only user's entity
  // (This is an implicit IDOR protection test)
  if (existingEndpoints.length > 0) {
    await runTest('Member Endpoints', 'All endpoints belong to same entity', async () => {
      const response = await apiRequest('GET', '/member-endpoints', { token });
      assertStatus(response.status, 200);

      const endpoints = response.data.endpoints;
      if (endpoints.length > 1) {
        const firstEntityId = endpoints[0].legal_entity_id;
        for (const endpoint of endpoints) {
          if (endpoint.legal_entity_id !== firstEntityId) {
            throw new Error('Endpoints belong to different entities - possible IDOR vulnerability');
          }
        }
      }
    });
  } else {
    skipTest('Member Endpoints', 'All endpoints belong to same entity', 'No endpoints to verify');
  }

  // Test: Endpoints sorted by creation date (most recent first)
  if (existingEndpoints.length > 1 || createdEndpoints.length > 1) {
    await runTest('Member Endpoints', 'Endpoints sorted by date DESC', async () => {
      const response = await apiRequest('GET', '/member-endpoints', { token });
      assertStatus(response.status, 200);

      const endpoints = response.data.endpoints;
      for (let i = 1; i < endpoints.length; i++) {
        const prevDate = new Date(endpoints[i - 1].dt_created);
        const currDate = new Date(endpoints[i].dt_created);
        if (currDate > prevDate) {
          throw new Error('Endpoints should be sorted by creation date DESC');
        }
      }
    });
  } else {
    skipTest('Member Endpoints', 'Endpoints sorted by date DESC', 'Not enough endpoints to verify');
  }

  // Test: Inactive endpoints are filtered out
  await runTest('Member Endpoints', 'Only active endpoints returned', async () => {
    const response = await apiRequest('GET', '/member-endpoints', { token });
    assertStatus(response.status, 200);

    // The query filters by is_deleted = false
    // Just verify no deleted endpoints are returned
    for (const endpoint of response.data.endpoints) {
      // is_deleted should not exist or be false
      if (endpoint.is_deleted === true) {
        throw new Error('Deleted endpoints should not be returned');
      }
    }
  });

  return { createdEndpoints };
}

/**
 * Cleanup created test endpoints
 * @param {string} token - Access token
 */
async function cleanupMemberEndpoints(token) {
  console.log('\n--- Cleaning up test member endpoints ---');

  for (const endpointId of createdEndpoints) {
    try {
      // Deactivate/soft-delete endpoint via admin endpoint
      const response = await apiRequest('PUT', `/endpoints/${endpointId}`, {
        token,
        body: {
          is_active: false,
          deactivation_reason: 'Member portal API test cleanup'
        }
      });

      if (response.status === 200) {
        console.log(`  Cleaned up endpoint: ${endpointId}`);
      } else {
        console.log(`  Endpoint ${endpointId} cleanup returned status ${response.status}`);
      }
    } catch (error) {
      console.log(`  Failed to cleanup endpoint ${endpointId}: ${error.message}`);
    }
  }

  // Clear the array
  createdEndpoints.length = 0;
}

module.exports = { runMemberEndpointTests, cleanupMemberEndpoints };
