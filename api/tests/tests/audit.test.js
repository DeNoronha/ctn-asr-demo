/**
 * CTN ASR API Tests - Audit Log Operations
 */

const {
  apiRequest,
  runTest,
  skipTest,
  assertStatus,
  assertExists,
  assertMinLength
} = require('../test-utils');

/**
 * Run all audit log operation tests
 * @param {string} token - Access token
 */
async function runAuditTests(token) {
  console.log('\n--- Audit Log Operations ---');

  // Test: Get audit logs
  await runTest('Audit', 'Get audit logs', async () => {
    const response = await apiRequest('GET', '/audit-logs', { token });
    assertStatus(response.status, 200);
    assertExists(response.data, 'response data');
    // Response should be paginated
    if (response.data.data) {
      assertMinLength(response.data.data, 0, 'audit logs array');
    }
  });

  // Test: Get audit logs with pagination
  await runTest('Audit', 'Get audit logs with pagination', async () => {
    const response = await apiRequest('GET', '/audit-logs?page=1&limit=10', { token });
    assertStatus(response.status, 200);
    assertExists(response.data.pagination, 'pagination info');
  });

  // Test: Get audit logs filtered by event type
  await runTest('Audit', 'Get audit logs by event type', async () => {
    const response = await apiRequest('GET', '/audit-logs?event_type=MEMBER_CREATED', { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs filtered by severity
  await runTest('Audit', 'Get audit logs by severity', async () => {
    const response = await apiRequest('GET', '/audit-logs?severity=INFO', { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs filtered by result
  await runTest('Audit', 'Get audit logs by result', async () => {
    const response = await apiRequest('GET', '/audit-logs?result=success', { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs filtered by resource type
  await runTest('Audit', 'Get audit logs by resource type', async () => {
    const response = await apiRequest('GET', '/audit-logs?resource_type=member', { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs filtered by action
  await runTest('Audit', 'Get audit logs by action', async () => {
    const response = await apiRequest('GET', '/audit-logs?action=create', { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs filtered by date range
  await runTest('Audit', 'Get audit logs by date range', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const response = await apiRequest('GET', `/audit-logs?start_date=${startDate}&end_date=${endDate}`, { token });
    assertStatus(response.status, 200);
  });

  // Test: Get audit logs - invalid event type
  await runTest('Audit', 'Get audit logs - invalid event type', async () => {
    const response = await apiRequest('GET', '/audit-logs?event_type=INVALID_TYPE', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs - invalid severity
  await runTest('Audit', 'Get audit logs - invalid severity', async () => {
    const response = await apiRequest('GET', '/audit-logs?severity=INVALID', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs - invalid result
  await runTest('Audit', 'Get audit logs - invalid result', async () => {
    const response = await apiRequest('GET', '/audit-logs?result=invalid', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs - invalid resource type
  await runTest('Audit', 'Get audit logs - invalid resource type', async () => {
    const response = await apiRequest('GET', '/audit-logs?resource_type=invalid_type', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs - invalid date format
  await runTest('Audit', 'Get audit logs - invalid date format', async () => {
    const response = await apiRequest('GET', '/audit-logs?start_date=invalid-date', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs - invalid date range (end before start)
  await runTest('Audit', 'Get audit logs - invalid date range', async () => {
    const response = await apiRequest('GET', '/audit-logs?start_date=2025-12-31&end_date=2025-01-01', { token });
    assertStatus(response.status, 400);
  });

  // Test: Get audit logs with multiple filters
  await runTest('Audit', 'Get audit logs with multiple filters', async () => {
    const response = await apiRequest('GET', '/audit-logs?resource_type=member&action=create&result=success', { token });
    assertStatus(response.status, 200);
  });

  return {};
}

module.exports = { runAuditTests };
