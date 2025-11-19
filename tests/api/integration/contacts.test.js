/**
 * CTN ASR API Tests - Contact Operations
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

// Store created contacts for cleanup
const createdContacts = [];

/**
 * Run all contact operation tests
 * @param {string} token - Access token
 * @param {string} legalEntityId - Legal entity ID to test with
 */
async function runContactTests(token, legalEntityId) {
  console.log('\n--- Contact Operations ---');

  // Test: Get contacts for entity
  if (legalEntityId) {
    await runTest('Contacts', 'Get contacts for entity', async () => {
      const response = await apiRequest('GET', `/legal-entities/${legalEntityId}/contacts`, { token });
      assertStatus(response.status, 200);
      assertExists(response.data, 'response data');
    });
  } else {
    skipTest('Contacts', 'Get contacts for entity', 'No legal entity ID provided');
  }

  // Test: Get contacts - invalid UUID
  await runTest('Contacts', 'Get contacts - invalid UUID', async () => {
    const response = await apiRequest('GET', '/legal-entities/invalid-uuid/contacts', { token });
    assertStatus(response.status, 400);
  });

  // Test: Create PRIMARY contact
  let createdPrimaryId = null;
  if (legalEntityId) {
    await runTest('Contacts', 'Create PRIMARY contact', async () => {
      const contactData = {
        legal_entity_id: legalEntityId,
        contact_type: 'Primary',
        full_name: `Test Primary ${Date.now()}`,
        first_name: 'Test',
        last_name: 'Primary',
        email: `test-primary-${Date.now()}@example.com`,
        phone: '+31612345678',
        job_title: 'Test Manager',
        is_primary: true
      };

      const response = await apiRequest('POST', '/contacts', {
        token,
        body: contactData
      });

      assertStatus(response.status, 201);
      assertExists(response.data.legal_entity_contact_id, 'contact ID');

      createdPrimaryId = response.data.legal_entity_contact_id;
      createdContacts.push(createdPrimaryId);
    });
  } else {
    skipTest('Contacts', 'Create PRIMARY contact', 'No legal entity ID provided');
  }

  // Test: Create BILLING contact
  let createdBillingId = null;
  if (legalEntityId) {
    await runTest('Contacts', 'Create BILLING contact', async () => {
      const contactData = {
        legal_entity_id: legalEntityId,
        contact_type: 'Billing',
        full_name: `Test Billing ${Date.now()}`,
        email: `test-billing-${Date.now()}@example.com`,
        department: 'Finance',
        is_primary: false
      };

      const response = await apiRequest('POST', '/contacts', {
        token,
        body: contactData
      });

      assertStatus(response.status, 201);
      createdBillingId = response.data.legal_entity_contact_id;
      createdContacts.push(createdBillingId);
    });
  } else {
    skipTest('Contacts', 'Create BILLING contact', 'No legal entity ID provided');
  }

  // Test: Create TECHNICAL contact
  let createdTechnicalId = null;
  if (legalEntityId) {
    await runTest('Contacts', 'Create TECHNICAL contact', async () => {
      const contactData = {
        legal_entity_id: legalEntityId,
        contact_type: 'Technical',
        full_name: `Test Technical ${Date.now()}`,
        email: `test-tech-${Date.now()}@example.com`,
        department: 'IT',
        is_primary: false
      };

      const response = await apiRequest('POST', '/contacts', {
        token,
        body: contactData
      });

      assertStatus(response.status, 201);
      createdTechnicalId = response.data.legal_entity_contact_id;
      createdContacts.push(createdTechnicalId);
    });
  } else {
    skipTest('Contacts', 'Create TECHNICAL contact', 'No legal entity ID provided');
  }

  // Test: Create ADMIN contact
  let createdAdminId = null;
  if (legalEntityId) {
    await runTest('Contacts', 'Create ADMIN contact', async () => {
      const contactData = {
        legal_entity_id: legalEntityId,
        contact_type: 'Admin',
        full_name: `Test Admin ${Date.now()}`,
        email: `test-admin-${Date.now()}@example.com`,
        is_primary: false
      };

      const response = await apiRequest('POST', '/contacts', {
        token,
        body: contactData
      });

      assertStatus(response.status, 201);
      createdAdminId = response.data.legal_entity_contact_id;
      createdContacts.push(createdAdminId);
    });
  } else {
    skipTest('Contacts', 'Create ADMIN contact', 'No legal entity ID provided');
  }

  // Test: Create contact - missing required fields
  if (legalEntityId) {
    await runTest('Contacts', 'Create contact - missing email', async () => {
      const contactData = {
        legal_entity_id: legalEntityId,
        full_name: 'Test Contact'
        // Missing email
      };

      const response = await apiRequest('POST', '/contacts', {
        token,
        body: contactData
      });

      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Contacts', 'Create contact - missing email', 'No legal entity ID provided');
  }

  // Test: Update contact
  if (createdPrimaryId) {
    await runTest('Contacts', 'Update contact', async () => {
      const updateData = {
        job_title: 'Senior Test Manager',
        department: 'Quality Assurance',
        phone: '+31698765432'
      };

      const response = await apiRequest('PUT', `/contacts/${createdPrimaryId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
      assertExists(response.data.legal_entity_contact_id, 'contact ID');
    });
  } else {
    skipTest('Contacts', 'Update contact', 'No contact was created');
  }

  // Test: Update contact - change email
  if (createdBillingId) {
    await runTest('Contacts', 'Update contact - change email', async () => {
      const newEmail = `updated-billing-${Date.now()}@example.com`;
      const updateData = {
        email: newEmail
      };

      const response = await apiRequest('PUT', `/contacts/${createdBillingId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
      if (response.data.email !== newEmail) {
        throw new Error(`Expected email to be ${newEmail}, got ${response.data.email}`);
      }
    });
  } else {
    skipTest('Contacts', 'Update contact - change email', 'No contact was created');
  }

  // Test: Update contact - not found
  await runTest('Contacts', 'Update contact - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/contacts/${fakeId}`, {
      token,
      body: { job_title: 'Test' }
    });
    assertStatus(response.status, 404);
  });

  // Test: Delete contact
  if (createdTechnicalId) {
    await runTest('Contacts', 'Delete contact', async () => {
      const response = await apiRequest('DELETE', `/contacts/${createdTechnicalId}`, { token });
      assertStatus(response.status, 204);
      // Remove from cleanup list since already deleted
      const index = createdContacts.indexOf(createdTechnicalId);
      if (index > -1) createdContacts.splice(index, 1);
    });
  } else {
    skipTest('Contacts', 'Delete contact', 'No contact was created');
  }

  // Test: Delete contact - not found
  await runTest('Contacts', 'Delete contact - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('DELETE', `/contacts/${fakeId}`, { token });
    assertStatus(response.status, 404);
  });

  return { createdContacts };
}

/**
 * Cleanup created test contacts
 * @param {string} token - Access token
 */
async function cleanupContacts(token) {
  console.log('\n--- Cleaning up test contacts ---');

  for (const contactId of createdContacts) {
    try {
      await apiRequest('DELETE', `/contacts/${contactId}`, { token });
      console.log(`  Cleaned up contact: ${contactId}`);
    } catch (error) {
      console.log(`  Failed to cleanup contact ${contactId}: ${error.message}`);
    }
  }
}

module.exports = { runContactTests, cleanupContacts };
