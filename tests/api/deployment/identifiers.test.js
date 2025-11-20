/**
 * Identifier CRUD Tests
 *
 * Tests full lifecycle of identifier management operations.
 * Creates, reads, updates, and deletes identifiers for legal entities.
 *
 * Usage:
 *   node identifiers.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required
 *   API_URL - Optional
 *   ENTITY_ID - Optional legal entity ID for testing
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, TestRunner, assert, log } = require('./utils');

async function main() {
  validateConfig();

  const runner = new TestRunner('Identifier CRUD Operations');
  let token;
  let identifierId;
  const entityId = process.env.ENTITY_ID || config.testData.legalEntityId;

  console.log('='.repeat(50));
  console.log('Identifier CRUD Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log(`Entity ID: ${entityId}`);
  console.log('');

  // Cleanup function
  async function cleanup() {
    if (identifierId && token) {
      log('Cleaning up test data...', 'info');
      try {
        const response = await apiRequest(`/identifiers/${identifierId}`, {
          method: 'DELETE',
        }, token);

        if ([200, 204].includes(response.status)) {
          log(`Deleted identifier ${identifierId}`, 'success');
        } else {
          log(`Failed to delete identifier: HTTP ${response.status}`, 'warning');
        }
      } catch (error) {
        log(`Cleanup error: ${error.message}`, 'warning');
      }
    }
  }

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  try {
    // Acquire token
    await runner.test('Acquire authentication token', async () => {
      token = await getToken();
      assert(token, 'Should receive valid token');
    });

    if (!token) {
      throw new Error('Cannot proceed without authentication');
    }

    // Test 1: List existing identifiers
    await runner.test('List identifiers for legal entity', async () => {
      const response = await apiRequest(`/legal-entities/${entityId}/identifiers`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);

      // API returns {data: [...]}
      const identifiers = response.body.data || response.body;
      assert(Array.isArray(identifiers), 'Response should contain array of identifiers');
      console.log(`  Found ${identifiers.length} existing identifiers`);
    });

    // Test 2: Create Identifier
    await runner.test('Create new identifier', async () => {
      const payload = {
        identifier_type: 'DUNS',
        identifier_value: `TEST${Date.now().toString().slice(-9)}`,
        verification_status: 'PENDING',
      };

      const response = await apiRequest(`/legal-entities/${entityId}/identifiers`, {
        method: 'POST',
        body: payload,
      }, token);

      assert([200, 201].includes(response.status),
        `Expected 200/201, got ${response.status}`);

      identifierId = response.body.identifier_id || response.body.id;
      assert(identifierId, 'Response should include identifier ID');
      console.log(`  Created identifier: ${identifierId}`);
    });

    // Test 3: Read Identifier
    await runner.test('Read identifier by ID', async () => {
      const response = await apiRequest(`/identifiers/${identifierId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.identifier_type === 'DUNS', 'Type should match');
    });

    // Test 4: Update Identifier
    await runner.test('Update identifier verification status', async () => {
      const payload = {
        verification_status: 'VERIFIED',
        verification_date: new Date().toISOString(),
      };

      const response = await apiRequest(`/identifiers/${identifierId}`, {
        method: 'PUT',
        body: payload,
      }, token);

      assert(response.status === 200, `Expected 200, got ${response.status}`);
    });

    // Test 5: Verify Update
    await runner.test('Verify identifier update', async () => {
      const response = await apiRequest(`/identifiers/${identifierId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.verification_status === 'VERIFIED',
        'Verification status should be updated');
    });

    // Test 6: Delete Identifier
    await runner.test('Delete identifier', async () => {
      const response = await apiRequest(`/identifiers/${identifierId}`, {
        method: 'DELETE',
      }, token);

      assert([200, 204].includes(response.status),
        `Expected 200/204, got ${response.status}`);
      identifierId = null; // Prevent double-delete
    });

    // Test 7: Verify Deletion
    await runner.test('Verify identifier deletion', async () => {
      const response = await apiRequest(`/identifiers/${identifierId || 'deleted'}`, {}, token);
      assert([404, 410].includes(response.status),
        `Expected 404/410, got ${response.status}`);
    });

  } finally {
    await cleanup();
  }

  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
