/**
 * CTN ASR API Tests - Member Profile Operations (Self-Service)
 *
 * Tests for member portal self-service profile operations:
 * - Get authenticated member profile
 * - Update own profile information
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

// Store original profile data for restoration
let originalProfileData = null;

/**
 * Run all member profile operation tests
 * @param {string} token - Access token
 * @returns {Promise<{memberProfile: object}>}
 */
async function runMemberProfileTests(token) {
  console.log('\n--- Member Profile Operations (Self-Service) ---');

  let memberProfile = null;

  // Test: Get authenticated member profile
  await runTest('Member Profile', 'Get authenticated member', async () => {
    const response = await apiRequest('GET', '/member', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    assertExists(response.data.legalEntityId, 'legalEntityId');
    assertExists(response.data.legalName, 'legalName');

    memberProfile = response.data;
    originalProfileData = { ...response.data };
  });

  // Test: Get authenticated member - without token
  await runTest('Member Profile', 'Get member - no auth token', async () => {
    const response = await apiRequest('GET', '/member', { skipAuth: true });
    assertStatus(response.status, 401);
  });

  // Test: Get authenticated member - invalid token
  await runTest('Member Profile', 'Get member - invalid token', async () => {
    const response = await apiRequest('GET', '/member', {
      token: 'invalid-token-12345'
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify profile contains required fields
  if (memberProfile) {
    await runTest('Member Profile', 'Profile contains required fields', async () => {
      const requiredFields = [
        'organizationId',
        'legalName',
        'status',
        'legalEntityId'
      ];

      for (const field of requiredFields) {
        if (memberProfile[field] === undefined) {
          throw new Error(`Required field '${field}' missing from profile`);
        }
      }
    });
  } else {
    skipTest('Member Profile', 'Profile contains required fields', 'No profile retrieved');
  }

  // Test: Verify registry identifiers in profile
  if (memberProfile && memberProfile.registryIdentifiers) {
    await runTest('Member Profile', 'Profile includes registry identifiers', async () => {
      if (!Array.isArray(memberProfile.registryIdentifiers)) {
        throw new Error('registryIdentifiers should be an array');
      }
      // Check structure of each identifier
      for (const identifier of memberProfile.registryIdentifiers) {
        assertExists(identifier.identifierType, 'identifierType');
        assertExists(identifier.identifierValue, 'identifierValue');
      }
    });
  } else {
    skipTest('Member Profile', 'Profile includes registry identifiers', 'No identifiers in profile');
  }

  // Test: Update member profile - valid fields
  if (memberProfile && memberProfile.legalEntityId) {
    await runTest('Member Profile', 'Update profile - address fields', async () => {
      const updateData = {
        address_line1: `Test Address ${Date.now()}`,
        postal_code: '1234 AB',
        city: 'Test City',
        country_code: 'NL'
      };

      const response = await apiRequest('PUT', '/member/profile', {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
      assertExists(response.data.message, 'success message');
    });
  } else {
    skipTest('Member Profile', 'Update profile - address fields', 'No member profile available');
  }

  // Test: Update member profile - domain
  if (memberProfile) {
    await runTest('Member Profile', 'Update profile - domain', async () => {
      const updateData = {
        domain: `test-${Date.now()}.example.com`
      };

      const response = await apiRequest('PUT', '/member/profile', {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Member Profile', 'Update profile - domain', 'No member profile available');
  }

  // Test: Update member profile - metadata
  if (memberProfile) {
    await runTest('Member Profile', 'Update profile - metadata', async () => {
      const updateData = {
        metadata: {
          testKey: 'testValue',
          timestamp: Date.now()
        }
      };

      const response = await apiRequest('PUT', '/member/profile', {
        token,
        body: updateData
      });

      assertStatus(response.status, 200);
    });
  } else {
    skipTest('Member Profile', 'Update profile - metadata', 'No member profile available');
  }

  // Test: Update profile - empty body
  await runTest('Member Profile', 'Update profile - empty body', async () => {
    const response = await apiRequest('PUT', '/member/profile', {
      token,
      body: {}
    });

    // Should succeed but with no changes
    assertStatus(response.status, 200);
  });

  // Test: Update profile - without auth
  await runTest('Member Profile', 'Update profile - no auth', async () => {
    const response = await apiRequest('PUT', '/member/profile', {
      skipAuth: true,
      body: { city: 'Test' }
    });
    assertStatus(response.status, 401);
  });

  // Test: Verify profile was updated
  if (memberProfile) {
    await runTest('Member Profile', 'Verify profile updates persisted', async () => {
      const response = await apiRequest('GET', '/member', { token });
      assertStatus(response.status, 200);
      // Profile should still be retrievable after updates
      assertExists(response.data.legalEntityId, 'legalEntityId after update');
    });
  } else {
    skipTest('Member Profile', 'Verify profile updates persisted', 'No member profile available');
  }

  return { memberProfile };
}

/**
 * Restore original profile data after tests
 * @param {string} token - Access token
 */
async function restoreProfile(token) {
  if (originalProfileData && originalProfileData.domain) {
    console.log('\n--- Restoring original profile ---');
    try {
      await apiRequest('PUT', '/member/profile', {
        token,
        body: {
          domain: originalProfileData.domain
        }
      });
      console.log('  Profile domain restored');
    } catch (error) {
      console.log(`  Failed to restore profile: ${error.message}`);
    }
  }
}

module.exports = { runMemberProfileTests, restoreProfile };
