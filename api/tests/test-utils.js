/**
 * CTN ASR API Test Utilities
 * Helper functions for API testing
 */

const { config } = require('./test-config');

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: Date.now(),
  totalDuration: 0
};

/**
 * Acquire Azure AD access token using ROPC flow
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${config.auth.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: config.auth.clientId,
    scope: config.auth.scope,
    username: config.auth.testUserEmail,
    password: config.auth.testUserPassword,
    grant_type: 'password'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString(),
    signal: AbortSignal.timeout(config.timeouts.tokenAcquisition)
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const errorDesc = data.error_description || data.error || 'Unknown error';
    throw new Error(`Token acquisition failed: ${errorDesc}`);
  }

  return data.access_token;
}

/**
 * Make authenticated API request
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Request options
 * @returns {Promise<{status: number, data: any, duration: number}>}
 */
async function apiRequest(method, endpoint, options = {}) {
  const { body, token, expectedStatus, skipAuth = false } = options;
  const url = `${config.apiBaseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && !skipAuth ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(config.timeouts.request)
    });

    const duration = Date.now() - startTime;
    let data = null;

    // Try to parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
      duration,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error.name === 'TimeoutError') {
      throw new Error(`Request timeout after ${config.timeouts.request}ms`);
    }
    throw error;
  }
}

/**
 * Generate unique test ID
 * @param {string} prefix - Optional prefix
 * @returns {string}
 */
function generateTestId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${config.testDataPrefix}${prefix}${timestamp}_${random}`;
}

/**
 * Generate valid UUID for testing
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Run a single test
 * @param {string} category - Test category
 * @param {string} name - Test name
 * @param {function} testFn - Test function
 * @returns {Promise<boolean>}
 */
async function runTest(category, name, testFn) {
  const fullName = `${category} - ${name}`;
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.passed.push({ name: fullName, duration });
    console.log(`  \x1b[32m[PASS]\x1b[0m ${fullName} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.failed.push({
      name: fullName,
      error: error.message,
      duration
    });
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${fullName}`);
    console.log(`         Error: ${error.message}`);
    return false;
  }
}

/**
 * Skip a test
 * @param {string} category - Test category
 * @param {string} name - Test name
 * @param {string} reason - Skip reason
 */
function skipTest(category, name, reason) {
  const fullName = `${category} - ${name}`;
  testResults.skipped.push({ name: fullName, reason });
  console.log(`  \x1b[33m[SKIP]\x1b[0m ${fullName}`);
  console.log(`         Reason: ${reason}`);
}

/**
 * Assert condition
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if condition is false
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert status code
 * @param {number} actual - Actual status code
 * @param {number} expected - Expected status code
 * @param {string} context - Additional context for error message
 */
function assertStatus(actual, expected, context = '') {
  if (actual !== expected) {
    throw new Error(`Expected status ${expected}, got ${actual}${context ? ` - ${context}` : ''}`);
  }
}

/**
 * Assert that value exists (not null/undefined)
 * @param {any} value - Value to check
 * @param {string} fieldName - Field name for error message
 */
function assertExists(value, fieldName) {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${fieldName} to exist`);
  }
}

/**
 * Assert array has minimum length
 * @param {Array} arr - Array to check
 * @param {number} minLength - Minimum expected length
 * @param {string} context - Context for error message
 */
function assertMinLength(arr, minLength, context = 'array') {
  if (!Array.isArray(arr)) {
    throw new Error(`Expected ${context} to be an array`);
  }
  if (arr.length < minLength) {
    throw new Error(`Expected ${context} to have at least ${minLength} items, got ${arr.length}`);
  }
}

/**
 * Get test results summary
 * @returns {object}
 */
function getResults() {
  testResults.totalDuration = Date.now() - testResults.startTime;
  return {
    total: testResults.passed.length + testResults.failed.length + testResults.skipped.length,
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    skipped: testResults.skipped.length,
    duration: testResults.totalDuration,
    passedTests: testResults.passed,
    failedTests: testResults.failed,
    skippedTests: testResults.skipped
  };
}

/**
 * Print test results summary
 */
function printResults() {
  const results = getResults();

  console.log('\n============================================');
  console.log('  API Test Results Summary');
  console.log('============================================\n');

  console.log(`Total:   ${results.total}`);
  console.log(`\x1b[32mPassed:  ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed:  ${results.failed}\x1b[0m`);
  console.log(`\x1b[33mSkipped: ${results.skipped}\x1b[0m`);
  console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);

  if (results.failedTests.length > 0) {
    console.log('\n--- Failed Tests ---');
    for (const test of results.failedTests) {
      console.log(`\x1b[31m[X]\x1b[0m ${test.name}`);
      console.log(`    Error: ${test.error}`);
    }
  }

  if (results.skippedTests.length > 0) {
    console.log('\n--- Skipped Tests ---');
    for (const test of results.skippedTests) {
      console.log(`\x1b[33m[-]\x1b[0m ${test.name}`);
      console.log(`    Reason: ${test.reason}`);
    }
  }

  console.log('\n============================================\n');
}

/**
 * Save results to JSON file
 * @param {string} filepath - Output file path
 */
function saveResults(filepath) {
  const fs = require('fs');
  const results = getResults();
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${filepath}`);
}

/**
 * Reset test results (for running multiple test suites)
 */
function resetResults() {
  testResults.passed = [];
  testResults.failed = [];
  testResults.skipped = [];
  testResults.startTime = Date.now();
  testResults.totalDuration = 0;
}

module.exports = {
  getAccessToken,
  apiRequest,
  generateTestId,
  generateUUID,
  runTest,
  skipTest,
  assert,
  assertStatus,
  assertExists,
  assertMinLength,
  getResults,
  printResults,
  saveResults,
  resetResults
};
