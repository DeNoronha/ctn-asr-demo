/**
 * CTN ASR API Tests - Member Portal Test Suite
 *
 * Comprehensive tests for member portal self-service operations
 * focusing on proper scoping, IDOR protection, and authorization.
 */

const { runMemberProfileTests, restoreProfile } = require('./member-profile.test');
const { runMemberContactTests, cleanupMemberContacts } = require('./member-contacts.test');
const { runMemberEndpointTests, cleanupMemberEndpoints } = require('./member-endpoints.test');
const { runMemberAuthorizationTests } = require('./member-authorization.test');

/**
 * Run all member portal tests
 * @param {string} token - Access token
 * @returns {Promise<{memberProfile: object}>}
 */
async function runAllMemberPortalTests(token) {
  console.log('\n============================================');
  console.log('  Member Portal Test Suite');
  console.log('============================================');

  let memberProfile = null;

  // 1. Run profile tests first (needed for other tests)
  const profileResults = await runMemberProfileTests(token);
  memberProfile = profileResults.memberProfile;

  // 2. Run contact tests
  await runMemberContactTests(token);

  // 3. Run endpoint tests
  await runMemberEndpointTests(token);

  // 4. Run authorization/IDOR tests (critical security tests)
  await runMemberAuthorizationTests(token, memberProfile);

  return { memberProfile };
}

/**
 * Cleanup all member portal test data
 * @param {string} token - Access token
 */
async function cleanupAllMemberPortalTests(token) {
  console.log('\n============================================');
  console.log('  Member Portal Test Cleanup');
  console.log('============================================');

  // Cleanup in reverse order of creation
  await cleanupMemberEndpoints(token);
  await cleanupMemberContacts(token);
  await restoreProfile(token);
}

module.exports = {
  runAllMemberPortalTests,
  cleanupAllMemberPortalTests,
  // Also export individual test modules for selective running
  runMemberProfileTests,
  runMemberContactTests,
  runMemberEndpointTests,
  runMemberAuthorizationTests
};
