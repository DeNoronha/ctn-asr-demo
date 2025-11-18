/**
 * CTN ASR API Tests - Member Operations
 */

const {
  apiRequest,
  runTest,
  skipTest,
  generateTestId,
  assertStatus,
  assertExists,
  assertMinLength
} = require('../test-utils');

// Store created test data for cleanup
const createdMembers = [];

/**
 * Run all member operation tests
 * @param {string} token - Access token
 */
async function runMemberTests(token) {
  console.log('\n--- Member Operations ---');

  // Test: Get all members
  await runTest('Members', 'Get all members', async () => {
    const response = await apiRequest('GET', '/all-members', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    // Response should be paginated
    if (response.data.data) {
      assertMinLength(response.data.data, 0, 'members array');
    }
  });

  // Test: Get all members with pagination
  await runTest('Members', 'Get members with pagination', async () => {
    const response = await apiRequest('GET', '/all-members?page=1&limit=5', { token });
    assertStatus(response.status, 200);
    assertExists(response.data.pagination, 'pagination info');
  });

  // Test: Create member
  let createdMemberId = null;
  let createdLegalEntityId = null;
  await runTest('Members', 'Create member', async () => {
    const memberData = {
      org_id: generateTestId('ORG'),
      legal_name: `Test Company ${Date.now()}`,
      domain: `test-${Date.now()}.example.com`,
      status: 'PENDING',
      membership_level: 'BASIC',
      contact_email: 'test@example.com',
      contact_name: 'Test Contact'
    };

    const response = await apiRequest('POST', '/members', {
      token,
      body: memberData
    });

    assertStatus(response.status, 201);
    assertExists(response.data.org_id, 'org_id');
    assertExists(response.data.legal_entity_id, 'legal_entity_id');

    createdMemberId = response.data.org_id;
    createdLegalEntityId = response.data.legal_entity_id;
    createdMembers.push({
      orgId: createdMemberId,
      legalEntityId: createdLegalEntityId
    });
  });

  // Test: Get single member
  if (createdMemberId) {
    await runTest('Members', 'Get single member', async () => {
      const response = await apiRequest('GET', `/members/${createdMemberId}`, { token });
      assertStatus(response.status, 200);
      assertExists(response.data.org_id, 'org_id');
      assertExists(response.data.legal_name, 'legal_name');
    });
  } else {
    skipTest('Members', 'Get single member', 'No member was created');
  }

  // Test: Get member not found
  await runTest('Members', 'Get member - not found', async () => {
    const response = await apiRequest('GET', '/members/NONEXISTENT_ORG_ID', { token });
    assertStatus(response.status, 404);
  });

  // Test: Update member status - ACTIVE
  if (createdMemberId) {
    await runTest('Members', 'Update member status to ACTIVE', async () => {
      const response = await apiRequest('PATCH', `/members/${createdMemberId}/status`, {
        token,
        body: { status: 'ACTIVE', notes: 'API test activation' }
      });
      assertStatus(response.status, 200);
      assertExists(response.data.newStatus, 'newStatus');
      if (response.data.newStatus !== 'ACTIVE') {
        throw new Error(`Expected newStatus to be ACTIVE, got ${response.data.newStatus}`);
      }
    });
  } else {
    skipTest('Members', 'Update member status to ACTIVE', 'No member was created');
  }

  // Test: Update member status - SUSPENDED
  if (createdMemberId) {
    await runTest('Members', 'Update member status to SUSPENDED', async () => {
      const response = await apiRequest('PATCH', `/members/${createdMemberId}/status`, {
        token,
        body: { status: 'SUSPENDED', notes: 'API test suspension' }
      });
      assertStatus(response.status, 200);
      assertExists(response.data.newStatus, 'newStatus');
    });
  } else {
    skipTest('Members', 'Update member status to SUSPENDED', 'No member was created');
  }

  // Test: Update member status - Invalid status
  if (createdMemberId) {
    await runTest('Members', 'Update member status - invalid value', async () => {
      const response = await apiRequest('PATCH', `/members/${createdMemberId}/status`, {
        token,
        body: { status: 'INVALID_STATUS' }
      });
      assertStatus(response.status, 400);
    });
  } else {
    skipTest('Members', 'Update member status - invalid value', 'No member was created');
  }

  // Test: Create member - validation error (missing required fields)
  await runTest('Members', 'Create member - missing required fields', async () => {
    const response = await apiRequest('POST', '/members', {
      token,
      body: { org_id: 'incomplete' }  // Missing legal_name and domain
    });
    assertStatus(response.status, 400);
  });

  return { createdMembers, createdLegalEntityId };
}

/**
 * Cleanup created test members
 * Note: Members use soft delete, so we just update status to INACTIVE
 * @param {string} token - Access token
 */
async function cleanupMembers(token) {
  console.log('\n--- Cleaning up test members ---');

  for (const member of createdMembers) {
    try {
      // Set member to INACTIVE status (soft delete behavior)
      await apiRequest('PATCH', `/members/${member.orgId}/status`, {
        token,
        body: { status: 'INACTIVE', notes: 'API test cleanup' }
      });
      console.log(`  Cleaned up member: ${member.orgId}`);
    } catch (error) {
      console.log(`  Failed to cleanup member ${member.orgId}: ${error.message}`);
    }
  }
}

module.exports = { runMemberTests, cleanupMembers };
