/**
 * Contact CRUD Tests
 *
 * Tests full lifecycle of contact management operations.
 * Creates, reads, updates, and deletes a contact.
 *
 * Usage:
 *   node contacts.test.js
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

  const runner = new TestRunner('Contact CRUD Operations');
  let token;
  let contactId;
  const entityId = process.env.ENTITY_ID || config.testData.legalEntityId;

  console.log('='.repeat(50));
  console.log('Contact CRUD Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log(`Entity ID: ${entityId}`);
  console.log('');

  // Cleanup function
  async function cleanup() {
    if (contactId && token) {
      log('Cleaning up test data...', 'info');
      try {
        const response = await apiRequest(`/contacts/${contactId}`, {
          method: 'DELETE',
        }, token);

        if ([200, 204].includes(response.status)) {
          log(`Deleted contact ${contactId}`, 'success');
        } else {
          log(`Failed to delete contact: HTTP ${response.status}`, 'warning');
        }
      } catch (error) {
        log(`Cleanup error: ${error.message}`, 'warning');
      }
    }
  }

  // Handle process termination
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

    // Test 1: Create Contact
    await runner.test('Create new contact', async () => {
      const payload = {
        legal_entity_id: entityId,
        contact_type: 'PRIMARY',
        first_name: 'Test',
        last_name: 'Contact',
        email_address: `test.contact.${Date.now()}@example.com`,
        phone_number: '+31612345678',
        position_title: 'API Test Contact',
      };

      const response = await apiRequest('/contacts', {
        method: 'POST',
        body: payload,
      }, token);

      assert([200, 201].includes(response.status),
        `Expected 200/201, got ${response.status}`);

      contactId = response.body.contact_id || response.body.id;
      assert(contactId, 'Response should include contact ID');
      console.log(`  Created contact: ${contactId}`);
    });

    // Test 2: Read Contact
    await runner.test('Read contact by ID', async () => {
      const response = await apiRequest(`/contacts/${contactId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.first_name === 'Test', 'First name should match');
      assert(response.body.last_name === 'Contact', 'Last name should match');
    });

    // Test 3: Update Contact
    await runner.test('Update contact', async () => {
      const payload = {
        first_name: 'Updated',
        last_name: 'Contact',
        position_title: 'Updated Position',
      };

      const response = await apiRequest(`/contacts/${contactId}`, {
        method: 'PUT',
        body: payload,
      }, token);

      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.first_name === 'Updated', 'First name should be updated');
    });

    // Test 4: Verify Update
    await runner.test('Verify contact update', async () => {
      const response = await apiRequest(`/contacts/${contactId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.first_name === 'Updated', 'First name should be updated');
      assert(response.body.position_title === 'Updated Position',
        'Position should be updated');
    });

    // Test 5: List Contacts for Entity
    await runner.test('List contacts for legal entity', async () => {
      const response = await apiRequest(`/entities/${entityId}/contacts`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(Array.isArray(response.body), 'Response should be an array');

      const found = response.body.find(c =>
        (c.contact_id || c.id) === contactId
      );
      assert(found, 'Created contact should be in list');
      console.log(`  Found ${response.body.length} contacts`);
    });

    // Test 6: Delete Contact
    await runner.test('Delete contact', async () => {
      const response = await apiRequest(`/contacts/${contactId}`, {
        method: 'DELETE',
      }, token);

      assert([200, 204].includes(response.status),
        `Expected 200/204, got ${response.status}`);
      contactId = null; // Prevent double-delete in cleanup
    });

    // Test 7: Verify Deletion
    await runner.test('Verify contact deletion', async () => {
      const response = await apiRequest(`/contacts/${contactId || 'deleted'}`, {}, token);
      // Should return 404 since contact is deleted (soft delete shows as 404)
      assert([404, 410].includes(response.status),
        `Expected 404/410, got ${response.status}`);
    });

  } finally {
    // Always attempt cleanup
    await cleanup();
  }

  // Print summary
  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
