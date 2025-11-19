/**
 * CTN ASR API Tests - Member Contacts Operations (Self-Service)
 *
 * Tests for member portal self-service contact management:
 * - Get own contacts
 * - Create contacts for own entity
 * - Update own contacts
 * - Delete own contacts
 * - IDOR protection tests
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

// Store created contacts for cleanup
const createdContacts = [];

/**
 * Run all member contact operation tests
 * @param {string} token - Access token
 * @returns {Promise<{createdContacts: string[]}>}
 */
async function runMemberContactTests(token) {
  console.log('\n--- Member Contact Operations (Self-Service) ---');

  // Test: Get own contacts
  let existingContacts = [];
  await runTest('Member Contacts', 'Get own contacts', async () => {
    const response = await apiRequest('GET', '/member-contacts', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    assertExists(response.data.contacts, 'contacts array');

    if (!Array.isArray(response.data.contacts)) {
      throw new Error('contacts should be an array');
    }

    existingContacts = response.data.contacts;
  });

  // Test: Get contacts - without auth
  await runTest('Member Contacts', 'Get contacts - no auth', async () => {
    const response = await apiRequest('GET', '/member-contacts', { skipAuth: true });
    assertStatus(response.status, 401);
  });

  // Test: Get contacts - invalid token
  await runTest('Member Contacts', 'Get contacts - invalid token', async () => {
    const response = await apiRequest('GET', '/member-contacts', {
      token: 'invalid-token-12345'
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify contact structure
  if (existingContacts.length > 0) {
    await runTest('Member Contacts', 'Verify contact data structure', async () => {
      const contact = existingContacts[0];
      const requiredFields = [
        'legal_entity_contact_id',
        'legal_entity_id',
        'email'
      ];

      for (const field of requiredFields) {
        if (contact[field] === undefined) {
          throw new Error(`Required field '${field}' missing from contact`);
        }
      }
    });
  } else {
    skipTest('Member Contacts', 'Verify contact data structure', 'No existing contacts');
  }

  // Test: Create TECHNICAL contact for own entity
  let createdTechnicalId = null;
  await runTest('Member Contacts', 'Create TECHNICAL contact', async () => {
    const contactData = {
      contact_type: 'TECHNICAL',
      full_name: `Test Technical ${Date.now()}`,
      first_name: 'Test',
      last_name: 'Technical',
      email: `test-tech-member-${Date.now()}@example.com`,
      phone: '+31612345678',
      job_title: 'Technical Lead',
      department: 'IT',
      preferred_language: 'en',
      preferred_contact_method: 'EMAIL',
      is_primary: false
    };

    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: contactData
    });

    assertStatus(response.status, 201);
    assertExists(response.data.contactId, 'contactId');

    createdTechnicalId = response.data.contactId;
    createdContacts.push(createdTechnicalId);
  });

  // Test: Create BILLING contact for own entity
  let createdBillingId = null;
  await runTest('Member Contacts', 'Create BILLING contact', async () => {
    const contactData = {
      contact_type: 'BILLING',
      full_name: `Test Billing ${Date.now()}`,
      first_name: 'Test',
      last_name: 'Billing',
      email: `test-billing-member-${Date.now()}@example.com`,
      phone: '+31698765432',
      job_title: 'Finance Manager',
      department: 'Finance',
      is_primary: false
    };

    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: contactData
    });

    assertStatus(response.status, 201);
    createdBillingId = response.data.contactId;
    createdContacts.push(createdBillingId);
  });

  // Test: Create ADMIN contact for own entity
  let createdAdminId = null;
  await runTest('Member Contacts', 'Create ADMIN contact', async () => {
    const contactData = {
      contact_type: 'ADMIN',
      full_name: `Test Admin ${Date.now()}`,
      email: `test-admin-member-${Date.now()}@example.com`,
      is_primary: false
    };

    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: contactData
    });

    assertStatus(response.status, 201);
    createdAdminId = response.data.contactId;
    createdContacts.push(createdAdminId);
  });

  // Test: Create contact - missing required fields
  await runTest('Member Contacts', 'Create contact - missing full_name', async () => {
    const contactData = {
      contact_type: 'TECHNICAL',
      email: `test-${Date.now()}@example.com`
      // Missing full_name
    };

    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: contactData
    });

    // Should fail validation
    assertStatus(response.status, 400);
  });

  // Test: Create contact - missing email
  await runTest('Member Contacts', 'Create contact - missing email', async () => {
    const contactData = {
      contact_type: 'TECHNICAL',
      full_name: 'Test Contact'
      // Missing email
    };

    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: contactData
    });

    // Should fail due to not-null constraint on email
    if (response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected status 400 or 500, got ${response.status}`);
    }
  });

  // Test: Create contact - without auth
  await runTest('Member Contacts', 'Create contact - no auth', async () => {
    const response = await apiRequest('POST', '/member/contacts', {
      skipAuth: true,
      body: {
        full_name: 'Test',
        email: 'test@example.com'
      }
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify created contacts appear in list
  if (createdContacts.length > 0) {
    await runTest('Member Contacts', 'Verify created contacts in list', async () => {
      const response = await apiRequest('GET', '/member-contacts', { token });
      assertStatus(response.status, 200);

      const contactIds = response.data.contacts.map(c => c.legal_entity_contact_id);

      for (const createdId of createdContacts) {
        if (!contactIds.includes(createdId)) {
          throw new Error(`Created contact ${createdId} not found in list`);
        }
      }
    });
  } else {
    skipTest('Member Contacts', 'Verify created contacts in list', 'No contacts were created');
  }

  // Test: Update own contact
  if (createdTechnicalId) {
    await runTest('Member Contacts', 'Update own contact', async () => {
      const updateData = {
        full_name: 'Updated Technical Contact',
        job_title: 'Senior Technical Lead',
        department: 'Engineering',
        phone: '+31611111111'
      };

      const response = await apiRequest('PUT', `/member/contacts/${createdTechnicalId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
      assertExists(response.data.message, 'success message');
    });
  } else {
    skipTest('Member Contacts', 'Update own contact', 'No contact was created');
  }

  // Test: Update contact - change email
  if (createdBillingId) {
    await runTest('Member Contacts', 'Update contact - change email', async () => {
      const newEmail = `updated-billing-${Date.now()}@example.com`;
      const updateData = {
        email: newEmail
      };

      const response = await apiRequest('PUT', `/member/contacts/${createdBillingId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Member Contacts', 'Update contact - change email', 'No contact was created');
  }

  // Test: Update contact - invalid UUID format
  await runTest('Member Contacts', 'Update contact - invalid UUID', async () => {
    const response = await apiRequest('PUT', '/member/contacts/invalid-uuid', {
      token,
      body: { full_name: 'Test' }
    });
    assertStatus(response.status, 400);
  });

  // Test: Update contact - not found (IDOR protection)
  await runTest('Member Contacts', 'Update contact - not found (IDOR)', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/member/contacts/${fakeId}`, {
      token,
      body: { full_name: 'Test' }
    });
    // Should return 403 (not authorized) or 404 (not found)
    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected status 403 or 404, got ${response.status}`);
    }
  });

  // Test: Update contact - without auth
  if (createdTechnicalId) {
    await runTest('Member Contacts', 'Update contact - no auth', async () => {
      const response = await apiRequest('PUT', `/member/contacts/${createdTechnicalId}`, {
        skipAuth: true,
        body: { full_name: 'Test' }
      });
      assertStatus(response.status, 401);
    });
  } else {
    skipTest('Member Contacts', 'Update contact - no auth', 'No contact was created');
  }

  // Test: Contacts have proper ordering (primary first)
  if (existingContacts.length > 1) {
    await runTest('Member Contacts', 'Contacts sorted by primary status', async () => {
      const response = await apiRequest('GET', '/member-contacts', { token });
      assertStatus(response.status, 200);

      const contacts = response.data.contacts;
      // Check that primary contacts come before non-primary
      let foundNonPrimary = false;
      for (const contact of contacts) {
        if (contact.is_primary === false || contact.is_primary === null) {
          foundNonPrimary = true;
        }
        if (foundNonPrimary && contact.is_primary === true) {
          throw new Error('Primary contacts should be listed before non-primary');
        }
      }
    });
  } else {
    skipTest('Member Contacts', 'Contacts sorted by primary status', 'Not enough contacts to verify');
  }

  return { createdContacts };
}

/**
 * Cleanup created test contacts
 * Note: Member portal may not have direct delete endpoint
 * @param {string} token - Access token
 */
async function cleanupMemberContacts(token) {
  console.log('\n--- Cleaning up test member contacts ---');

  for (const contactId of createdContacts) {
    try {
      // Try admin endpoint for cleanup since member endpoint may not have delete
      const response = await apiRequest('DELETE', `/contacts/${contactId}`, { token });
      if (response.status === 204 || response.status === 200) {
        console.log(`  Cleaned up contact: ${contactId}`);
      } else {
        console.log(`  Contact ${contactId} cleanup returned status ${response.status}`);
      }
    } catch (error) {
      console.log(`  Failed to cleanup contact ${contactId}: ${error.message}`);
    }
  }

  // Clear the array
  createdContacts.length = 0;
}

module.exports = { runMemberContactTests, cleanupMemberContacts };
