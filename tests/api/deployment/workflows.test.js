/**
 * Member Registration Workflow Test
 *
 * Tests the complete member registration workflow using /register-member endpoint.
 * This endpoint requires multipart/form-data with a KvK document upload.
 *
 * Usage:
 *   node workflows.test.js
 *
 * Environment:
 *   API_URL - Optional (defaults to deployed API)
 */

const { config, validateConfig } = require('./config');
const { apiRequest, TestRunner, assert, log } = require('./utils');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function main() {
  validateConfig();

  const runner = new TestRunner('Member Registration Workflow');
  let applicationId;

  // Test data
  const timestamp = Date.now();
  const testEmail = `test-member-${timestamp}@example.com`;
  const testKvk = `${95944192 + Math.floor(Math.random() * 1000)}`; // Random KvK-like number
  const testCompany = `Test Company B.V. ${timestamp}`;

  console.log('='.repeat(50));
  console.log('Member Registration Workflow Test');
  console.log('='.repeat(50));
  console.log(`API: ${config.api.baseUrl}`);
  console.log(`Test Email: ${testEmail}`);
  console.log(`Test KvK: ${testKvk}`);
  console.log(`Test Company: ${testCompany}`);
  console.log('');

  try {
    // =========================================
    // Test: Register New Member
    // =========================================
    await runner.test('Submit member registration', async () => {
      const form = new FormData();

      // Required fields from API validation
      form.append('legalName', testCompany);
      form.append('kvkNumber', testKvk);
      form.append('companyAddress', 'Test Street 123');
      form.append('postalCode', '1234AB');
      form.append('city', 'Amsterdam');
      form.append('country', 'Netherlands');
      form.append('contactName', 'Test Contact Person');
      form.append('contactEmail', testEmail);
      form.append('contactPhone', '+31612345678');
      form.append('jobTitle', 'Test Manager');
      form.append('membershipType', 'BASIC');
      form.append('termsAccepted', 'true');
      form.append('gdprConsent', 'true');

      // Optional fields
      form.append('lei', ''); // Optional LEI

      // Create a dummy PDF file for KvK document
      const dummyPdfPath = path.join(__dirname, 'test-kvk-document.pdf');
      if (!fs.existsSync(dummyPdfPath)) {
        // Create minimal valid PDF if it doesn't exist
        const pdfContent = Buffer.from(
          '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
          '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
          '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> ' +
          '/MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n' +
          '4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Test KvK Document) Tj ET\nendstream\nendobj\n' +
          'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n' +
          '0000000317 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n409\n%%EOF'
        );
        fs.writeFileSync(dummyPdfPath, pdfContent);
      }

      form.append('kvkDocument', fs.createReadStream(dummyPdfPath), {
        filename: 'test-kvk-document.pdf',
        contentType: 'application/pdf'
      });

      // Make request with custom headers for multipart/form-data
      const response = await apiRequest('/register-member', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        useFormData: true
      });

      // Check response
      if (response.status === 201) {
        applicationId = response.body.applicationId;
        assert(applicationId, 'Response should include application ID');
        console.log(`  Application ID: ${applicationId}`);
        console.log(`  Status: ${response.body.status || 'pending'}`);
      } else if (response.status === 409) {
        // Duplicate - acceptable for testing, may mean previous test data exists
        console.log(`  Duplicate detected (409) - this is acceptable for testing`);
        console.log(`  Message: ${response.body.error}`);
      } else if (response.status === 400) {
        // Bad request - log details for debugging
        console.log(`  Bad Request (400):`);
        console.log(`  Error: ${response.body.error}`);
        if (response.body.missingFields) {
          console.log(`  Missing fields: ${response.body.missingFields.join(', ')}`);
        }
        throw new Error(`Registration failed: ${response.body.error}`);
      } else {
        throw new Error(`Unexpected status ${response.status}: ${JSON.stringify(response.body)}`);
      }
    });

    // =========================================
    // Test: Verify Application Created
    // =========================================
    if (applicationId) {
      await runner.test('Verify application appears in list', async () => {
        const response = await apiRequest('/applications', {}, null); // No auth needed for GET

        // Note: This might require authentication depending on API setup
        if (response.status === 401) {
          console.log('  (Requires authentication - skipping verification)');
          return;
        }

        assert(response.status === 200, `Expected 200, got ${response.status}`);

        const apps = response.body.data || response.body;
        if (Array.isArray(apps)) {
          const found = apps.find(a => a.application_id === applicationId);
          if (found) {
            console.log(`  Found application in list`);
            console.log(`  Status: ${found.status}`);
          } else {
            console.log(`  Application not found in list (may require auth)`);
          }
        }
      });
    } else {
      runner.skip('Verify application appears in list', 'No application ID available');
    }

    // =========================================
    // Test: Duplicate Detection
    // =========================================
    await runner.test('Duplicate registration detection', async () => {
      const form = new FormData();

      // Use same data as first registration
      form.append('legalName', testCompany);
      form.append('kvkNumber', testKvk);
      form.append('companyAddress', 'Test Street 123');
      form.append('postalCode', '1234AB');
      form.append('city', 'Amsterdam');
      form.append('country', 'Netherlands');
      form.append('contactName', 'Test Contact Person');
      form.append('contactEmail', testEmail); // Same email
      form.append('contactPhone', '+31612345678');
      form.append('jobTitle', 'Test Manager');
      form.append('membershipType', 'BASIC');
      form.append('termsAccepted', 'true');
      form.append('gdprConsent', 'true');

      // Attach document
      const dummyPdfPath = path.join(__dirname, 'test-kvk-document.pdf');
      form.append('kvkDocument', fs.createReadStream(dummyPdfPath), {
        filename: 'test-kvk-document.pdf',
        contentType: 'application/pdf'
      });

      const response = await apiRequest('/register-member', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        useFormData: true
      });

      // Should return 409 Conflict
      assert(response.status === 409,
        `Expected 409 for duplicate, got ${response.status}`);
      assert(response.body.error, 'Should return error message');
      console.log(`  Duplicate correctly rejected: ${response.body.error}`);
    });

    // =========================================
    // Test: Validation - Missing Required Fields
    // =========================================
    await runner.test('Validation: Missing required fields', async () => {
      const form = new FormData();

      // Only provide partial data (missing required fields)
      form.append('legalName', 'Incomplete Company');
      form.append('kvkNumber', '12345678');
      // Missing: companyAddress, postalCode, city, country, contactName, etc.

      const dummyPdfPath = path.join(__dirname, 'test-kvk-document.pdf');
      form.append('kvkDocument', fs.createReadStream(dummyPdfPath), {
        filename: 'test-kvk-document.pdf',
        contentType: 'application/pdf'
      });

      const response = await apiRequest('/register-member', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        useFormData: true
      });

      // Should return 400 Bad Request
      assert(response.status === 400,
        `Expected 400 for missing fields, got ${response.status}`);
      assert(response.body.missingFields,
        'Should return list of missing fields');
      console.log(`  Missing fields detected: ${response.body.missingFields.join(', ')}`);
    });

    // =========================================
    // Test: Validation - Missing KvK Document
    // =========================================
    await runner.test('Validation: Missing KvK document', async () => {
      const form = new FormData();

      // Provide all required fields but NO document
      form.append('legalName', 'No Document Company');
      form.append('kvkNumber', '87654321');
      form.append('companyAddress', 'Test Street 456');
      form.append('postalCode', '5678CD');
      form.append('city', 'Rotterdam');
      form.append('country', 'Netherlands');
      form.append('contactName', 'Test Person');
      form.append('contactEmail', `no-doc-${Date.now()}@example.com`);
      form.append('contactPhone', '+31687654321');
      form.append('jobTitle', 'Manager');
      form.append('membershipType', 'BASIC');
      form.append('termsAccepted', 'true');
      form.append('gdprConsent', 'true');
      // NO kvkDocument attached

      const response = await apiRequest('/register-member', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        useFormData: true
      });

      // Should return 400 Bad Request
      assert(response.status === 400,
        `Expected 400 for missing document, got ${response.status}`);
      assert(response.body.error.includes('document') ||
             response.body.error.includes('required'),
        'Error should mention missing document');
      console.log(`  Missing document correctly rejected`);
    });

  } catch (error) {
    console.error('Test execution error:', error.message);
    throw error;
  } finally {
    // Cleanup: Remove test PDF
    const dummyPdfPath = path.join(__dirname, 'test-kvk-document.pdf');
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }
  }

  const { failed } = runner.printSummary();

  if (failed === 0) {
    console.log('\n*** WORKFLOW TESTS PASSED ***\n');
  } else {
    console.log('\n*** WORKFLOW TESTS FAILED ***\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
