/**
 * Configuration for API Deployment Tests
 *
 * Environment variables:
 * - API_URL: API base URL (default: Container Apps dev)
 * - E2E_TEST_USER_PASSWORD: Password for test user
 */

const config = {
  // Azure AD Configuration
  auth: {
    tenantId: '598664e7-725c-4daa-bd1f-89c4ada717ff',
    clientId: 'd3037c11-a541-4f21-8862-8079137a0cde',
    username: 'test-e2@denoronha.consulting',
    password: process.env.E2E_TEST_USER_PASSWORD || '',
  },

  // API Configuration
  api: {
    baseUrl: process.env.API_URL || 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',
    healthUrl: process.env.API_URL
      ? process.env.API_URL.replace('/v1', '/health')
      : 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/health',
    timeout: 30000,
  },

  // Test Data
  testData: {
    // Default legal entity for CRUD tests
    legalEntityId: 'fbc4bcdc-a9f9-4621-a153-c5deb6c49519',
    // Member entity
    memberId: null, // Will be set dynamically
  },

  // Output Configuration
  output: {
    verbose: process.env.VERBOSE === 'true',
    colors: process.stdout.isTTY,
  },
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  if (!config.auth.password) {
    errors.push('E2E_TEST_USER_PASSWORD environment variable not set');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\nSet required environment variables from .credentials file');
    process.exit(1);
  }
}

module.exports = { config, validateConfig };
