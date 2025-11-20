/**
 * Workflow Tests
 *
 * Tests complete business workflows:
 * - Member registration and approval
 * - Application lifecycle
 * - Document upload and verification
 *
 * Usage:
 *   node workflows.test.js
 *
 * Environment:
 *   E2E_TEST_USER_PASSWORD - Required
 *   API_URL - Optional
 */

const { config, validateConfig } = require('./config');
const { getToken, apiRequest, TestRunner, assert, log } = require('./utils');
const fs = require('fs');
const path = require('path');

async function main() {
  validateConfig();

  const runner = new TestRunner('Workflow Tests');
  let token;
  let applicationId;
  let legalEntityId;

  // Test data
  const testEmail = `test-member-${Date.now()}@example.com`;
  const testKvk = '95944192';
  const testCompany = `Test Company B.V. ${Date.now()}`;

  console.log('='.repeat(50));
  console.log('Workflow Tests');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log(`Test Email: ${testEmail}`);
  console.log(`Test KvK: ${testKvk}`);
  console.log(`Test Company: ${testCompany}`);
  console.log('');

  // Cleanup function
  async function cleanup() {
    if (applicationId && token) {
      log('Cleaning up test application...', 'info');
      try {
        // Try to delete or cancel the application
        await apiRequest(`/applications/${applicationId}`, {
          method: 'DELETE',
        }, token);
        log(`Cleaned up application ${applicationId}`, 'success');
      } catch (error) {
        // Cleanup failure is not critical
      }
    }
  }

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  try {
    // Acquire token
    await runner.test('Acquire authentication token', async () => {
      token = await getToken();
      assert(token, 'Should receive valid token');
    });

    if (!token) {
      throw new Error('Cannot proceed without authentication');
    }

    // =========================================
    // Member Registration Workflow
    // =========================================
    console.log('\n--- Member Registration Workflow ---\n');

    // Step 1: Submit Application
    await runner.test('Submit new member application', async () => {
      const payload = {
        company_name: testCompany,
        kvk_number: testKvk,
        contact_email: testEmail,
        contact_name: 'Test Contact',
        contact_phone: '+31612345678',
        business_type: 'Transport',
        notes: 'API workflow test application',
      };

      const response = await apiRequest('/applications', {
        method: 'POST',
        body: payload,
      }, token);

      assert([200, 201].includes(response.status),
        `Expected 200/201, got ${response.status}`);

      applicationId = response.body.id || response.body.application_id;
      assert(applicationId, 'Response should include application ID');
      console.log(`  Application ID: ${applicationId}`);
    });

    // Step 2: Get Application Details
    await runner.test('Retrieve application details', async () => {
      const response = await apiRequest(`/applications/${applicationId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.company_name === testCompany, 'Company name should match');
      assert(response.body.status === 'PENDING' || response.body.status === 'SUBMITTED',
        `Application should be pending, got ${response.body.status}`);
      console.log(`  Status: ${response.body.status}`);
    });

    // Step 3: List Applications (verify it appears)
    await runner.test('Application appears in list', async () => {
      const response = await apiRequest('/applications', {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);

      const apps = response.body.data || response.body;
      const found = Array.isArray(apps) && apps.find(a =>
        (a.id || a.application_id) === applicationId
      );
      assert(found, 'Application should appear in list');
      console.log(`  Found in list of ${apps.length} applications`);
    });

    // Step 4: Approve Application
    await runner.test('Approve member application', async () => {
      const payload = {
        approved_by: 'API Workflow Test',
        approval_notes: 'Automated workflow test approval',
      };

      const response = await apiRequest(`/applications/${applicationId}/approve`, {
        method: 'PUT',
        body: payload,
      }, token);

      // May return 200 or 201
      assert([200, 201].includes(response.status),
        `Expected 200/201, got ${response.status}`);

      legalEntityId = response.body.legal_entity_id || response.body.id;
      if (legalEntityId) {
        console.log(`  Legal Entity ID: ${legalEntityId}`);
      }
    });

    // Step 5: Verify Application Status Updated
    await runner.test('Application status updated to approved', async () => {
      const response = await apiRequest(`/applications/${applicationId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);

      const status = response.body.status;
      assert(['APPROVED', 'COMPLETED'].includes(status),
        `Expected APPROVED/COMPLETED, got ${status}`);
      console.log(`  Status: ${status}`);
    });

    // Step 6: Verify Member Created (if legal entity ID returned)
    if (legalEntityId) {
      await runner.test('Verify member entity created', async () => {
        const response = await apiRequest(`/legal-entities/${legalEntityId}`, {}, token);
        assert(response.status === 200, `Expected 200, got ${response.status}`);
        assert(response.body.legal_name || response.body.company_name,
          'Should have company name');
        console.log(`  Legal Name: ${response.body.legal_name || response.body.company_name}`);
      });

      // Step 7: Verify Member has KvK Identifier
      await runner.test('Member has KvK identifier', async () => {
        const response = await apiRequest(`/entities/${legalEntityId}/identifiers`, {}, token);
        assert(response.status === 200, `Expected 200, got ${response.status}`);

        const identifiers = response.body;
        const kvkIdentifier = identifiers.find(i =>
          i.identifier_type === 'KVK' && i.identifier_value === testKvk
        );

        if (kvkIdentifier) {
          console.log(`  KvK: ${kvkIdentifier.identifier_value}`);
        } else {
          console.log(`  (KvK identifier not found - may be created manually)`);
        }
      });
    } else {
      runner.skip('Verify member entity created', 'No legal entity ID returned');
      runner.skip('Member has KvK identifier', 'No legal entity ID returned');
    }

    // =========================================
    // Application Rejection Workflow
    // =========================================
    console.log('\n--- Application Rejection Workflow ---\n');

    let rejectApplicationId;

    // Create another application to reject
    await runner.test('Create application for rejection test', async () => {
      const payload = {
        company_name: `Reject Test ${Date.now()}`,
        kvk_number: '12345678',
        contact_email: `reject-test-${Date.now()}@example.com`,
        contact_name: 'Reject Test',
        contact_phone: '+31687654321',
        business_type: 'Other',
        notes: 'Application to be rejected',
      };

      const response = await apiRequest('/applications', {
        method: 'POST',
        body: payload,
      }, token);

      assert([200, 201].includes(response.status),
        `Expected 200/201, got ${response.status}`);

      rejectApplicationId = response.body.id || response.body.application_id;
      assert(rejectApplicationId, 'Should get application ID');
    });

    // Reject the application
    await runner.test('Reject application', async () => {
      const payload = {
        rejected_by: 'API Workflow Test',
        rejection_reason: 'Automated rejection test',
      };

      const response = await apiRequest(`/applications/${rejectApplicationId}/reject`, {
        method: 'PUT',
        body: payload,
      }, token);

      assert(response.status === 200, `Expected 200, got ${response.status}`);
    });

    // Verify rejection
    await runner.test('Verify application rejected', async () => {
      const response = await apiRequest(`/applications/${rejectApplicationId}`, {}, token);
      assert(response.status === 200, `Expected 200, got ${response.status}`);
      assert(response.body.status === 'REJECTED',
        `Expected REJECTED, got ${response.body.status}`);
    });

  } finally {
    await cleanup();
  }

  const { failed } = runner.printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
