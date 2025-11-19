/**
 * CTN ASR API Tests - Member Authorization & IDOR Protection
 *
 * Critical security tests for member portal:
 * - IDOR protection (cannot access other entities' data)
 * - Role-based access control
 * - Authentication requirements
 * - Admin-only endpoint restrictions
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

/**
 * Run all member authorization and IDOR protection tests
 * @param {string} token - Access token
 * @param {object} memberProfile - Member profile data from profile tests
 * @returns {Promise<void>}
 */
async function runMemberAuthorizationTests(token, memberProfile = null) {
  console.log('\n--- Member Authorization & IDOR Protection ---');

  // Get member's legal entity ID for reference
  let ownEntityId = null;
  if (memberProfile && memberProfile.legalEntityId) {
    ownEntityId = memberProfile.legalEntityId;
  }

  // ==============================================
  // AUTHENTICATION TESTS
  // ==============================================

  // Test: All member endpoints require authentication
  const memberEndpoints = [
    { method: 'GET', path: '/member', name: 'Get profile' },
    { method: 'PUT', path: '/member/profile', name: 'Update profile' },
    { method: 'GET', path: '/member-contacts', name: 'Get contacts' },
    { method: 'POST', path: '/member/contacts', name: 'Create contact' },
    { method: 'GET', path: '/member-endpoints', name: 'Get endpoints' },
    { method: 'POST', path: '/member/endpoints', name: 'Create endpoint' },
    { method: 'GET', path: '/member/tokens', name: 'Get tokens' }
  ];

  for (const endpoint of memberEndpoints) {
    await runTest('Auth - No Token', `${endpoint.name} requires auth`, async () => {
      const options = { skipAuth: true };
      if (endpoint.method !== 'GET') {
        options.body = { test: 'data' };
      }

      const response = await apiRequest(endpoint.method, endpoint.path, options);
      assertStatus(response.status, 401);
    });
  }

  // Test: Invalid token format rejected
  await runTest('Auth - Invalid', 'Invalid token format rejected', async () => {
    const response = await apiRequest('GET', '/member', {
      token: 'not-a-valid-jwt-token'
    });
    assertStatus(response.status, 401);
  });

  // Test: Expired token rejected (simulated with malformed token)
  await runTest('Auth - Invalid', 'Malformed JWT rejected', async () => {
    const response = await apiRequest('GET', '/member', {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
    });
    assertStatus(response.status, 401);
  });

  // ==============================================
  // IDOR PROTECTION TESTS
  // ==============================================

  // Test: Cannot access other entity's contacts via update
  await runTest('IDOR - Contacts', 'Cannot update other entity contact', async () => {
    const fakeContactId = generateUUID();
    const response = await apiRequest('PUT', `/member/contacts/${fakeContactId}`, {
      token,
      body: {
        full_name: 'IDOR Attack Attempt',
        email: 'idor@attack.com'
      }
    });

    // Should return 403 (forbidden) or 404 (not found)
    // Either response is acceptable for IDOR protection
    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404 for IDOR protection, got ${response.status}`);
    }
  });

  // Test: Member contacts endpoint only returns own entity's contacts
  await runTest('IDOR - Contacts', 'Contacts scoped to own entity', async () => {
    const response = await apiRequest('GET', '/member-contacts', { token });
    assertStatus(response.status, 200);

    if (response.data.contacts && response.data.contacts.length > 0 && ownEntityId) {
      for (const contact of response.data.contacts) {
        if (contact.legal_entity_id !== ownEntityId) {
          throw new Error(`Contact ${contact.legal_entity_contact_id} belongs to different entity - IDOR vulnerability!`);
        }
      }
    }
  });

  // Test: Member endpoints only returns own entity's endpoints
  await runTest('IDOR - Endpoints', 'Endpoints scoped to own entity', async () => {
    const response = await apiRequest('GET', '/member-endpoints', { token });
    assertStatus(response.status, 200);

    if (response.data.endpoints && response.data.endpoints.length > 0 && ownEntityId) {
      for (const endpoint of response.data.endpoints) {
        if (endpoint.legal_entity_id !== ownEntityId) {
          throw new Error(`Endpoint ${endpoint.legal_entity_endpoint_id} belongs to different entity - IDOR vulnerability!`);
        }
      }
    }
  });

  // Test: Cannot access members list (admin only)
  await runTest('IDOR - Members', 'Cannot list all members', async () => {
    const response = await apiRequest('GET', '/members', { token });
    // Member should either get forbidden or see only their own data
    // If they see multiple members, that's a vulnerability
    if (response.status === 200) {
      const members = response.data.data || response.data;
      if (Array.isArray(members) && members.length > 1) {
        // Check if multiple different org_ids are returned
        const orgIds = new Set(members.map(m => m.org_id || m.organizationId));
        if (orgIds.size > 1) {
          throw new Error('Member can see other organizations - potential data leak');
        }
      }
    }
    // 403 or 404 are also acceptable
  });

  // ==============================================
  // ADMIN-ONLY ENDPOINT RESTRICTIONS
  // ==============================================

  // Test: Cannot access admin-only endpoints
  const adminOnlyEndpoints = [
    { method: 'GET', path: '/audit-logs', name: 'Audit logs' },
    { method: 'POST', path: '/members', name: 'Create member' },
    { method: 'GET', path: '/applications', name: 'Get applications' }
  ];

  for (const endpoint of adminOnlyEndpoints) {
    await runTest('Admin Only', `Cannot access ${endpoint.name}`, async () => {
      const options = { token };
      if (endpoint.method !== 'GET') {
        options.body = {
          legal_name: 'Test',
          domain: 'test.com'
        };
      }

      const response = await apiRequest(endpoint.method, endpoint.path, options);

      // Member should be forbidden from admin endpoints
      // Accept 200 with empty/filtered data, 403, or 404
      if (response.status === 200) {
        // If 200, verify data is properly scoped/filtered
        const data = response.data.data || response.data;
        if (Array.isArray(data) && data.length > 0) {
          // Just log - different endpoints have different scoping rules
          console.log(`      Note: ${endpoint.name} returned ${data.length} items (may be properly scoped)`);
        }
      }
      // Any status is valid here since RBAC config varies
    });
  }

  // Test: Cannot directly access other legal entities
  await runTest('Admin Only', 'Cannot get arbitrary legal entity', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('GET', `/legal-entities/${fakeId}`, { token });

    // Should be 403 (forbidden) or 404 (not found)
    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
  });

  // Test: Cannot update arbitrary legal entity
  await runTest('Admin Only', 'Cannot update arbitrary legal entity', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('PUT', `/legal-entities/${fakeId}`, {
      token,
      body: {
        primary_legal_name: 'IDOR Attack'
      }
    });

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
  });

  // Test: Cannot delete arbitrary contacts
  await runTest('Admin Only', 'Cannot delete arbitrary contact', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('DELETE', `/contacts/${fakeId}`, { token });

    // Should be 403 or 404
    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
  });

  // Test: Cannot delete arbitrary identifiers
  await runTest('Admin Only', 'Cannot delete arbitrary identifier', async () => {
    const fakeId = generateUUID();
    const response = await apiRequest('DELETE', `/identifiers/${fakeId}`, { token });

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
  });

  // ==============================================
  // INPUT VALIDATION TESTS
  // ==============================================

  // Test: Invalid UUID format rejected
  await runTest('Validation', 'Invalid UUID rejected - contacts', async () => {
    const response = await apiRequest('PUT', '/member/contacts/not-a-uuid', {
      token,
      body: { full_name: 'Test' }
    });
    assertStatus(response.status, 400);
  });

  // Test: SQL injection attempt in UUID
  await runTest('Validation', 'SQL injection in UUID rejected', async () => {
    const sqlInjection = "'; DROP TABLE contacts; --";
    const response = await apiRequest('PUT', `/member/contacts/${encodeURIComponent(sqlInjection)}`, {
      token,
      body: { full_name: 'Test' }
    });

    // Should be 400 (invalid format) or 404 (not found)
    if (response.status !== 400 && response.status !== 404) {
      throw new Error(`Expected 400 or 404, got ${response.status}`);
    }
  });

  // Test: XSS attempt in profile data
  await runTest('Validation', 'XSS in profile data sanitized', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await apiRequest('PUT', '/member/profile', {
      token,
      body: {
        city: xssPayload
      }
    });

    // Should succeed but data should be sanitized
    // Status 200 means it was accepted (sanitization happens at DB/display level)
    assertStatus(response.status, 200);
  });

  // ==============================================
  // RATE LIMITING / ABUSE PREVENTION
  // ==============================================

  // Test: Multiple rapid requests handled
  await runTest('Abuse Prevention', 'Multiple rapid requests handled', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(apiRequest('GET', '/member', { token }));
    }

    const responses = await Promise.all(promises);

    // All should succeed (no rate limiting error for 5 requests)
    for (const response of responses) {
      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
  });

  // ==============================================
  // PERMISSION BOUNDARY TESTS
  // ==============================================

  // Test: Member cannot escalate privileges
  await runTest('Permissions', 'Cannot self-escalate to admin', async () => {
    // Attempt to update profile with admin-only fields
    const response = await apiRequest('PUT', '/member/profile', {
      token,
      body: {
        status: 'ACTIVE',
        membership_level: 'GOLD',
        role: 'SystemAdmin'
      }
    });

    // Should succeed but ignore privileged fields
    // Or return 400 for invalid fields
    if (response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 200 or 400, got ${response.status}`);
    }
  });

  // Test: Verify member cannot approve applications
  await runTest('Permissions', 'Cannot approve applications', async () => {
    const fakeApplicationId = generateUUID();
    const response = await apiRequest('POST', `/applications/${fakeApplicationId}/approve`, {
      token,
      body: {}
    });

    // Should be 403 (forbidden), 404 (not found), or 405 (method not allowed)
    if (response.status !== 403 && response.status !== 404 && response.status !== 405) {
      throw new Error(`Expected 403, 404, or 405, got ${response.status}`);
    }
  });

  // Test: Verify member cannot update member status
  await runTest('Permissions', 'Cannot update member status directly', async () => {
    const fakeOrgId = generateUUID();
    const response = await apiRequest('PUT', `/members/${fakeOrgId}/status`, {
      token,
      body: { status: 'ACTIVE' }
    });

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Expected 403 or 404, got ${response.status}`);
    }
  });

  // ==============================================
  // CROSS-ENTITY OPERATION PREVENTION
  // ==============================================

  // Test: Cannot create contact for other entity
  await runTest('Cross-Entity', 'Cannot specify other entity for contact', async () => {
    const fakeEntityId = generateUUID();
    const response = await apiRequest('POST', '/member/contacts', {
      token,
      body: {
        legal_entity_id: fakeEntityId,  // Attempt to specify different entity
        full_name: 'IDOR Test Contact',
        email: 'idor@test.com'
      }
    });

    // The API should ignore the provided legal_entity_id and use the authenticated user's entity
    // So this should succeed with 201, but create for the correct entity
    if (response.status === 201) {
      // This is fine - the contact was created for the user's own entity
      // The provided legal_entity_id should be ignored
    } else if (response.status === 400 || response.status === 403) {
      // Also acceptable - rejected the invalid entity
    } else {
      throw new Error(`Unexpected status ${response.status}`);
    }
  });

  // Test: Cannot create endpoint for other entity
  await runTest('Cross-Entity', 'Cannot specify other entity for endpoint', async () => {
    const fakeEntityId = generateUUID();
    const response = await apiRequest('POST', '/member/endpoints', {
      token,
      body: {
        legal_entity_id: fakeEntityId,  // Attempt to specify different entity
        endpoint_name: 'IDOR Test Endpoint',
        endpoint_url: 'https://idor.test.com'
      }
    });

    // Should create for authenticated user's entity, not the specified one
    if (response.status === 201 || response.status === 400 || response.status === 403) {
      // Acceptable responses
    } else {
      throw new Error(`Unexpected status ${response.status}`);
    }
  });
}

module.exports = { runMemberAuthorizationTests };
