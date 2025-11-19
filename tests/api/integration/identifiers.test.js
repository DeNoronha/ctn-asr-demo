/**
 * CTN ASR API Tests - Legal Entity Identifier Operations
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

// Store created identifiers for cleanup
const createdIdentifiers = [];

/**
 * Run all identifier operation tests
 * @param {string} token - Access token
 * @param {string} legalEntityId - Legal entity ID to test with
 */
async function runIdentifierTests(token, legalEntityId) {
  console.log('\n--- Identifier Operations ---');

  // Test: Get identifiers for entity
  if (legalEntityId) {
    await runTest('Identifiers', 'Get identifiers for entity', async () => {
      const response = await apiRequest('GET', `/entities/${legalEntityId}/identifiers`, { token });
      assertStatus(response.status, 200);
      assertExists(response.data, 'response data');
    });
  } else {
    skipTest('Identifiers', 'Get identifiers for entity', 'No legal entity ID provided');
  }

  // Test: Get identifiers - invalid UUID
  await runTest('Identifiers', 'Get identifiers - invalid UUID', async () => {
    const response = await apiRequest('GET', '/entities/invalid-uuid/identifiers', { token });
    assertStatus(response.status, 400);
  });

  // Test: Create KVK identifier
  let createdKvkId = null;
  if (legalEntityId) {
    await runTest('Identifiers', 'Create KVK identifier', async () => {
      const identifierData = {
        identifier_type: 'KVK',
        identifier_value: generateTestId('').substring(0, 8).replace(/\D/g, '0') + '12345678'.substring(0, 8),
        country_code: 'NL',
        registry_name: 'KvK (Test)',
        validation_status: 'PENDING'
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 201);
      assertExists(response.data.legal_entity_reference_id, 'identifier ID');
      assertExists(response.data.identifier_type, 'identifier_type');

      createdKvkId = response.data.legal_entity_reference_id;
      createdIdentifiers.push(createdKvkId);
    });
  } else {
    skipTest('Identifiers', 'Create KVK identifier', 'No legal entity ID provided');
  }

  // Test: Create LEI identifier
  let createdLeiId = null;
  if (legalEntityId) {
    await runTest('Identifiers', 'Create LEI identifier', async () => {
      // LEI format: 20 alphanumeric characters
      const leiValue = `TEST${Date.now()}`.substring(0, 20).padEnd(20, '0');

      const identifierData = {
        identifier_type: 'LEI',
        identifier_value: leiValue,
        country_code: 'NL',
        registry_name: 'GLEIF (Test)',
        validation_status: 'PENDING',
        issued_by: 'Test Authority'
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 201);
      createdLeiId = response.data.legal_entity_reference_id;
      createdIdentifiers.push(createdLeiId);
    });
  } else {
    skipTest('Identifiers', 'Create LEI identifier', 'No legal entity ID provided');
  }

  // Test: Create EORI identifier
  let createdEoriId = null;
  if (legalEntityId) {
    await runTest('Identifiers', 'Create EORI identifier', async () => {
      const eoriValue = `NL${Date.now()}`.substring(0, 17);

      const identifierData = {
        identifier_type: 'EORI',
        identifier_value: eoriValue,
        country_code: 'NL',
        registry_name: 'EU Customs (Test)',
        validation_status: 'PENDING'
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 201);
      createdEoriId = response.data.legal_entity_reference_id;
      createdIdentifiers.push(createdEoriId);
    });
  } else {
    skipTest('Identifiers', 'Create EORI identifier', 'No legal entity ID provided');
  }

  // Test: Create DUNS identifier
  let createdDunsId = null;
  if (legalEntityId) {
    await runTest('Identifiers', 'Create DUNS identifier', async () => {
      // DUNS: 9 digits
      const dunsValue = `${Date.now()}`.substring(0, 9).padEnd(9, '0');

      const identifierData = {
        identifier_type: 'DUNS',
        identifier_value: dunsValue,
        registry_name: 'Dun & Bradstreet (Test)',
        validation_status: 'PENDING'
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 201);
      createdDunsId = response.data.legal_entity_reference_id;
      createdIdentifiers.push(createdDunsId);
    });
  } else {
    skipTest('Identifiers', 'Create DUNS identifier', 'No legal entity ID provided');
  }

  // Test: Create identifier - invalid type
  if (legalEntityId) {
    await runTest('Identifiers', 'Create identifier - invalid type', async () => {
      const identifierData = {
        identifier_type: 'INVALID_TYPE',
        identifier_value: '12345'
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Identifiers', 'Create identifier - invalid type', 'No legal entity ID provided');
  }

  // Test: Create identifier - missing required fields
  if (legalEntityId) {
    await runTest('Identifiers', 'Create identifier - missing required fields', async () => {
      const identifierData = {
        identifier_type: 'KVK'
        // Missing identifier_value
      };

      const response = await apiRequest('POST', `/entities/${legalEntityId}/identifiers`, {
        token,
        body: identifierData
      });

      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Identifiers', 'Create identifier - missing required fields', 'No legal entity ID provided');
  }

  // Test: Create identifier - entity not found
  await runTest('Identifiers', 'Create identifier - entity not found', async () => {
    const fakeId = generateUUID();
    const identifierData = {
      identifier_type: 'KVK',
      identifier_value: '12345678'
    };

    const response = await apiRequest('POST', `/entities/${fakeId}/identifiers`, {
      token,
      body: identifierData
    });

    assertStatus(response.status, 404);
  });

  // Test: Update identifier
  if (createdKvkId) {
    await runTest('Identifiers', 'Update identifier', async () => {
      const updateData = {
        validation_status: 'VALIDATED',
        verification_notes: 'API test validation'
      };

      const response = await apiRequest('PUT', `/identifiers/${createdKvkId}`, {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
      if (response.data.validation_status !== 'VALIDATED') {
        throw new Error(`Expected validation_status to be VALIDATED, got ${response.data.validation_status}`);
      }
    });
  } else {
    skipTest('Identifiers', 'Update identifier', 'No identifier was created');
  }

  // Test: Update identifier - not found
  await runTest('Identifiers', 'Update identifier - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/identifiers/${fakeId}`, {
      token,
      body: { validation_status: 'VALIDATED' }
    });
    assertStatus(response.status, 404);
  });

  // Test: Update identifier - invalid validation status
  if (createdKvkId) {
    await runTest('Identifiers', 'Update identifier - invalid status', async () => {
      const response = await apiRequest('PUT', `/identifiers/${createdKvkId}`, {
        token,
        body: { validation_status: 'INVALID_STATUS' }
      });
      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Identifiers', 'Update identifier - invalid status', 'No identifier was created');
  }

  // Test: Delete identifier
  if (createdLeiId) {
    await runTest('Identifiers', 'Delete identifier', async () => {
      const response = await apiRequest('DELETE', `/identifiers/${createdLeiId}`, { token });
      assertStatus(response.status, 200);
      // Remove from cleanup list since already deleted
      const index = createdIdentifiers.indexOf(createdLeiId);
      if (index > -1) createdIdentifiers.splice(index, 1);
    });
  } else {
    skipTest('Identifiers', 'Delete identifier', 'No identifier was created');
  }

  // Test: Delete identifier - not found
  await runTest('Identifiers', 'Delete identifier - not found', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('DELETE', `/identifiers/${fakeId}`, { token });
    assertStatus(response.status, 404);
  });

  // Test: Delete identifier - invalid UUID
  await runTest('Identifiers', 'Delete identifier - invalid UUID', async () => {
    const response = await apiRequest('DELETE', '/identifiers/invalid-uuid', { token });
    assertStatus(response.status, 400);
  });

  return { createdIdentifiers };
}

/**
 * Cleanup created test identifiers
 * @param {string} token - Access token
 */
async function cleanupIdentifiers(token) {
  console.log('\n--- Cleaning up test identifiers ---');

  for (const identifierId of createdIdentifiers) {
    try {
      await apiRequest('DELETE', `/identifiers/${identifierId}`, { token });
      console.log(`  Cleaned up identifier: ${identifierId}`);
    } catch (error) {
      console.log(`  Failed to cleanup identifier ${identifierId}: ${error.message}`);
    }
  }
}

module.exports = { runIdentifierTests, cleanupIdentifiers };
