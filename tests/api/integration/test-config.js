/**
 * CTN ASR API Test Configuration
 * Centralized configuration for API tests
 */

// Load environment variables or use defaults
const config = {
  // API Base URL
  apiBaseUrl: process.env.API_BASE_URL || 'https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1',

  // Azure AD Authentication
  auth: {
    tenantId: process.env.AZURE_AD_TENANT_ID || '598664e7-725c-4daa-bd1f-89c4ada717ff',
    clientId: process.env.AZURE_AD_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde',
    testUserEmail: process.env.E2E_TEST_USER_EMAIL || 'test-e2@denoronha.consulting',
    testUserPassword: process.env.E2E_TEST_USER_PASSWORD || '',
    scope: process.env.AZURE_AD_API_SCOPE || 'api://d3037c11-a541-4f21-8862-8079137a0cde/.default'
  },

  // Test timeouts (milliseconds)
  timeouts: {
    request: 30000,      // Individual request timeout
    tokenAcquisition: 10000  // Token acquisition timeout
  },

  // Test data prefix for easy identification and cleanup
  testDataPrefix: 'TEST_API_',

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delayMs: 1000
  },

  // CI/CD mode (non-blocking)
  isCiMode: process.argv.includes('--ci') || process.env.CI === 'true'
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  if (!config.auth.testUserPassword) {
    errors.push('E2E_TEST_USER_PASSWORD environment variable is required');
  }

  return errors;
}

module.exports = { config, validateConfig };
