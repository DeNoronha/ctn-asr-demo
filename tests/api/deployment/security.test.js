/**
 * Security Tests
 *
 * Tests security controls including:
 * - IDOR (Insecure Direct Object Reference) prevention
 * - Authorization checks
 * - Input validation
 *
 * Usage:
 *   node security.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required
 *   API_URL - Optional
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, TestRunner, assert, log } = require('./utils');

async function main() {
  validateConfig();

  const runner = new TestRunner('Security Tests');
  let token;

  console.log('='.repeat(50));
  console.log('Security Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log('');

  // Acquire token
  await runner.test('Acquire authentication token', async () => {
    token = await getToken();
    assert(token, 'Should receive valid token');
  });

  if (!token) {
    throw new Error('Cannot proceed without authentication');
  }

  // Get current user's party info
  let userPartyId;
  await runner.test('Get current user party info', async () => {
    const response = await apiRequest('/auth/resolve-party', {}, token);
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    userPartyId = response.body.party_id;
    console.log(`  User party: ${userPartyId}`);
  });

  // ======================
  // IDOR Prevention Tests
  // ======================
  console.log('\n--- IDOR Prevention Tests ---\n');

  // Test 1: Attempt to access non-existent entity
  await runner.test('IDOR: Access non-existent entity returns 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await apiRequest(`/legal-entities/${fakeId}`, {}, token);
    // Should return 404, not 403 (to prevent enumeration)
    assert(response.status === 404,
      `Expected 404 for non-existent entity, got ${response.status}`);
  });

  // Test 2: Attempt to access entity with invalid UUID format
  await runner.test('IDOR: Invalid UUID format rejected', async () => {
    const response = await apiRequest('/legal-entities/invalid-uuid', {}, token);
    assert([400, 404].includes(response.status),
      `Expected 400/404 for invalid UUID, got ${response.status}`);
  });

  // Test 3: SQL injection attempt in path parameter
  await runner.test('Security: SQL injection in path rejected', async () => {
    const malicious = "'; DROP TABLE members; --";
    const response = await apiRequest(`/legal-entities/${encodeURIComponent(malicious)}`, {}, token);
    assert([400, 404].includes(response.status),
      `SQL injection should be rejected, got ${response.status}`);
  });

  // ======================
  // Authorization Tests
  // ======================
  console.log('\n--- Authorization Tests ---\n');

  // Test 4: Unauthenticated request rejected
  await runner.test('Auth: Unauthenticated request returns 401', async () => {
    const response = await apiRequest('/all-members', {}); // No token
    assert(response.status === 401,
      `Expected 401 for unauthenticated request, got ${response.status}`);
  });

  // Test 5: Invalid token rejected
  await runner.test('Auth: Invalid token returns 401', async () => {
    const response = await apiRequest('/all-members', {}, 'invalid-token');
    assert(response.status === 401,
      `Expected 401 for invalid token, got ${response.status}`);
  });

  // Test 6: Expired token handling (simulated with malformed JWT)
  await runner.test('Auth: Malformed JWT returns 401', async () => {
    const malformedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid';
    const response = await apiRequest('/all-members', {}, malformedJwt);
    assert(response.status === 401,
      `Expected 401 for malformed JWT, got ${response.status}`);
  });

  // ======================
  // Input Validation Tests
  // ======================
  console.log('\n--- Input Validation Tests ---\n');

  // Test 7: XSS in request body sanitized
  await runner.test('Validation: XSS payload in body handled', async () => {
    const payload = {
      legal_entity_id: config.testData.legalEntityId,
      contact_type: 'PRIMARY',
      first_name: '<script>alert("xss")</script>',
      last_name: 'Test',
      email_address: 'xss-test@example.com',
    };

    const response = await apiRequest('/contacts', {
      method: 'POST',
      body: payload,
    }, token);

    // Should either sanitize or reject
    if (response.status === 201 || response.status === 200) {
      // Check if XSS was sanitized
      assert(!response.body.first_name?.includes('<script>'),
        'XSS payload should be sanitized');
    } else {
      // Rejection is also acceptable
      assert([400, 422].includes(response.status),
        `XSS should be sanitized or rejected, got ${response.status}`);
    }
  });

  // Test 8: Invalid email format rejected
  await runner.test('Validation: Invalid email format rejected', async () => {
    const payload = {
      legal_entity_id: config.testData.legalEntityId,
      contact_type: 'PRIMARY',
      first_name: 'Test',
      last_name: 'Invalid',
      email_address: 'not-an-email',
    };

    const response = await apiRequest('/contacts', {
      method: 'POST',
      body: payload,
    }, token);

    assert([400, 422].includes(response.status),
      `Invalid email should be rejected, got ${response.status}`);
  });

  // Test 9: Empty required fields rejected
  await runner.test('Validation: Empty required fields rejected', async () => {
    const payload = {
      legal_entity_id: config.testData.legalEntityId,
      contact_type: '',
      first_name: '',
      last_name: '',
    };

    const response = await apiRequest('/contacts', {
      method: 'POST',
      body: payload,
    }, token);

    assert([400, 422].includes(response.status),
      `Empty required fields should be rejected, got ${response.status}`);
  });

  // ======================
  // Rate Limiting (if applicable)
  // ======================
  // Note: Rate limiting tests may interfere with other tests
  // Uncomment if needed
  /*
  console.log('\n--- Rate Limiting Tests ---\n');

  await runner.test('Rate limiting: Multiple rapid requests', async () => {
    const requests = Array(20).fill().map(() =>
      apiRequest('/health', {}, token)
    );
    const responses = await Promise.all(requests);
    const tooMany = responses.filter(r => r.status === 429).length;
    console.log(`  ${tooMany}/20 requests rate-limited`);
  });
  */

  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
