#!/usr/bin/env node

/**
 * CTN ASR API Test Runner
 * Comprehensive API tests for admin portal operations
 *
 * Usage:
 *   npm run test:api           # Run all tests
 *   npm run test:api:ci        # Run in CI mode (non-blocking)
 *
 * Environment Variables:
 *   E2E_TEST_USER_PASSWORD    - Required: Test user password
 *   API_BASE_URL              - Optional: Override API base URL
 *   AZURE_AD_TENANT_ID        - Optional: Override tenant ID
 *   AZURE_AD_CLIENT_ID        - Optional: Override client ID
 */

const path = require('path');
const { config, validateConfig } = require('./test-config');
const {
  getAccessToken,
  apiRequest,
  printResults,
  saveResults,
  getResults
} = require('./test-utils');

// Import test modules
const { runMemberTests, cleanupMembers } = require('./tests/members.test');
const { runLegalEntityTests } = require('./tests/legal-entities.test');
const { runIdentifierTests, cleanupIdentifiers } = require('./tests/identifiers.test');
const { runContactTests, cleanupContacts } = require('./tests/contacts.test');
const { runKvkTests } = require('./tests/kvk.test');
const { runEndpointTests, cleanupEndpoints } = require('./tests/endpoints.test');
const { runAuditTests } = require('./tests/audit.test');

// Import member portal test modules
const {
  runAllMemberPortalTests,
  cleanupAllMemberPortalTests
} = require('./tests/member-portal');

/**
 * Main test runner
 */
async function main() {
  console.log('\n============================================');
  console.log('  CTN ASR API Test Suite');
  console.log('============================================');
  console.log(`  API: ${config.apiBaseUrl}`);
  console.log(`  Mode: ${config.isCiMode ? 'CI (non-blocking)' : 'Standard'}`);
  console.log('============================================\n');

  // Validate configuration
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('\x1b[31mConfiguration errors:\x1b[0m');
    for (const error of configErrors) {
      console.error(`  - ${error}`);
    }
    console.error('\nTo set the password:');
    console.error('  export E2E_TEST_USER_PASSWORD=<password>');
    console.error('\nOr source from .credentials:');
    console.error('  source .credentials && npm run test:api\n');
    process.exit(config.isCiMode ? 0 : 1);
  }

  // Acquire access token
  console.log('Acquiring access token...');
  let token;
  try {
    token = await getAccessToken();
    console.log('\x1b[32m[PASS]\x1b[0m Access token acquired\n');
  } catch (error) {
    console.error(`\x1b[31m[FAIL]\x1b[0m Token acquisition failed: ${error.message}\n`);
    process.exit(config.isCiMode ? 0 : 1);
  }

  // Test API connectivity first
  console.log('Testing API connectivity...');
  try {
    const healthResponse = await apiRequest('GET', '/../health', { skipAuth: true });
    if (healthResponse.status === 200) {
      console.log('\x1b[32m[PASS]\x1b[0m API health check\n');
    } else {
      console.log(`\x1b[33m[WARN]\x1b[0m API health check returned ${healthResponse.status}\n`);
    }
  } catch (error) {
    console.error(`\x1b[31m[FAIL]\x1b[0m API connectivity failed: ${error.message}\n`);
    process.exit(config.isCiMode ? 0 : 1);
  }

  // Store created resources for cleanup
  let createdLegalEntityId = null;

  try {
    // Run test suites
    console.log('\n============================================');
    console.log('  Running Test Suites');
    console.log('============================================');

    // 1. Member tests (creates test data)
    const memberResults = await runMemberTests(token);
    createdLegalEntityId = memberResults.createdLegalEntityId;

    // 2. Legal Entity tests
    await runLegalEntityTests(token, createdLegalEntityId);

    // 3. Identifier tests
    await runIdentifierTests(token, createdLegalEntityId);

    // 4. Contact tests
    await runContactTests(token, createdLegalEntityId);

    // 5. KvK Integration tests
    await runKvkTests(token, createdLegalEntityId);

    // 6. Endpoint tests
    await runEndpointTests(token, createdLegalEntityId);

    // 7. Audit tests
    await runAuditTests(token);

    // 8. Member Portal tests (self-service operations)
    await runAllMemberPortalTests(token);

    // Cleanup test data
    console.log('\n============================================');
    console.log('  Cleanup');
    console.log('============================================');

    await cleanupAllMemberPortalTests(token);
    await cleanupContacts(token);
    await cleanupIdentifiers(token);
    await cleanupEndpoints(token);
    await cleanupMembers(token);

  } catch (error) {
    console.error(`\n\x1b[31mTest suite error: ${error.message}\x1b[0m\n`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  // Print results
  printResults();

  // Save results to file
  const resultsPath = path.join(__dirname, 'results', `api-test-results-${Date.now()}.json`);
  saveResults(resultsPath);

  // Determine exit code
  const results = getResults();
  const exitCode = config.isCiMode ? 0 : (results.failed > 0 ? 1 : 0);

  if (results.failed > 0) {
    console.log(`\x1b[31mTests completed with ${results.failed} failures.\x1b[0m`);
  } else {
    console.log(`\x1b[32mAll tests passed!\x1b[0m`);
  }

  console.log(`\nExit code: ${exitCode}${config.isCiMode ? ' (CI mode - non-blocking)' : ''}\n`);

  process.exit(exitCode);
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(config.isCiMode ? 0 : 1);
});
