import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { isValidUUID } from '../utils/validators';
import * as crypto from 'crypto';
import { handleError } from '../utils/errors';

/**
 * Step 1: Initiate Endpoint Registration
 * Creates an endpoint in PENDING status and generates a verification token
 */
async function initiateRegistrationHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const legal_entity_id = request.params.legal_entity_id;

  if (!legal_entity_id) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(legal_entity_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const body = await request.json() as any;
    const userEmail = request.userEmail;

    // Validate required fields
    if (!body.endpoint_name || !body.endpoint_url) {
      return {
        status: 400,
        jsonBody: { error: 'endpoint_name and endpoint_url are required' }
      };
    }

    // Validate URL format (must be HTTPS)
    try {
      const url = new URL(body.endpoint_url);
      if (url.protocol !== 'https:') {
        return {
          status: 400,
          jsonBody: { error: 'endpoint_url must use HTTPS protocol' }
        };
      }
    } catch (urlError) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid endpoint_url format' }
      };
    }

    // Verify legal entity exists (for all users)
    const entityCheck = await pool.query(
      `SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false`,
      [legal_entity_id]
    );

    if (entityCheck.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found' }
      };
    }

    // Regular user: verify ownership (admins bypass ownership check)
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const ownershipCheck = await pool.query(
        `SELECT le.legal_entity_id
         FROM legal_entity le
         JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
         WHERE le.legal_entity_id = $1
           AND c.email = $2
           AND c.is_active = true
           AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
        [legal_entity_id, userEmail]
      );

      if (ownershipCheck.rows.length === 0) {
        await logAuditEvent({
          event_type: AuditEventType.ACCESS_DENIED,
          severity: AuditSeverity.WARNING,
          result: 'failure',
          user_id: request.userId,
          user_email: request.userEmail,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          user_agent: request.headers.get('user-agent') || undefined,
          request_path: request.url,
          request_method: request.method,
          resource_type: 'legal_entity_endpoint',
          resource_id: legal_entity_id,
          action: 'create',
          details: { reason: 'ownership_check_failed' },
          error_message: 'User does not have permission to create endpoints for this entity'
        }, context);

        context.warn(`IDOR attempt: User ${userEmail} tried to create endpoint for entity ${legal_entity_id}`);

        return {
          status: 404,
          jsonBody: { error: 'Legal entity not found' }
        };
      }
    }

    // Generate verification token (32 bytes = 64 hex characters)
    const randomBytes = crypto.randomBytes(32);
    const verification_token = randomBytes.toString('hex');

    // Create endpoint with verification fields
    const result = await pool.query(
      `INSERT INTO legal_entity_endpoint (
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        is_active,
        verification_token,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, false, $7, 'PENDING', NOW(), NOW() + INTERVAL '24 hours', $8)
      RETURNING *`,
      [
        legal_entity_id,
        body.endpoint_name,
        body.endpoint_url,
        body.endpoint_description || null,
        body.data_category || 'DATA_EXCHANGE',
        body.endpoint_type || 'REST_API',
        verification_token,
        userEmail
      ]
    );

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: result.rows[0].legal_entity_endpoint_id,
      action: 'create',
      details: { legal_entity_id, status: 'PENDING', has_token: true }
    }, context);

    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    context.error('Error initiating endpoint registration:', error);

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: legal_entity_id,
      action: 'create',
      error_message: error.message,
      details: { error: error.message }
    }, context);

    return { status: 500, jsonBody: { error: 'Failed to initiate endpoint registration', details: error.message } };
  }
}

/**
 * Step 2: Send Verification Email (Mock)
 * In production, this would use Azure Communication Services to send email
 * For now, logs the token for development/testing
 */
async function sendVerificationEmailHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const endpoint_id = request.params.endpoint_id;

  if (!endpoint_id) {
    return {
      status: 400,
      jsonBody: { error: 'endpoint_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(endpoint_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;

    // Get endpoint and verify ownership
    const endpointResult = await pool.query(
      `SELECT e.*, le.primary_legal_name
       FROM legal_entity_endpoint e
       JOIN legal_entity le ON e.legal_entity_id = le.legal_entity_id
       WHERE e.legal_entity_endpoint_id = $1 AND e.is_deleted = false`,
      [endpoint_id]
    );

    if (endpointResult.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' }
      };
    }

    const endpoint = endpointResult.rows[0];

    // Verify ownership (admins bypass)
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const ownershipCheck = await pool.query(
        `SELECT le.legal_entity_id
         FROM legal_entity le
         JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
         WHERE le.legal_entity_id = $1
           AND c.email = $2
           AND c.is_active = true
           AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
        [endpoint.legal_entity_id, userEmail]
      );

      if (ownershipCheck.rows.length === 0) {
        context.warn(`IDOR attempt: User ${userEmail} tried to send verification for endpoint ${endpoint_id}`);
        return {
          status: 404,
          jsonBody: { error: 'Endpoint not found' }
        };
      }
    }

    // Update status to SENT
    await pool.query(
      `UPDATE legal_entity_endpoint
       SET verification_status = 'SENT',
           verification_sent_at = NOW(),
           verification_expires_at = NOW() + INTERVAL '24 hours',
           dt_modified = NOW()
       WHERE legal_entity_endpoint_id = $1`,
      [endpoint_id]
    );

    // MOCK: Log the token instead of sending email
    context.log('='.repeat(80));
    context.log('MOCK EMAIL - Endpoint Verification Token');
    context.log('='.repeat(80));
    context.log(`To: ${userEmail}`);
    context.log(`Subject: Verify Your Endpoint - ${endpoint.endpoint_name}`);
    context.log('');
    context.log(`Dear ${endpoint.primary_legal_name},`);
    context.log('');
    context.log(`Your verification token for endpoint "${endpoint.endpoint_name}" is:`);
    context.log('');
    context.log(`  ${endpoint.verification_token}`);
    context.log('');
    context.log('This token will expire in 24 hours.');
    context.log('Please enter this token in the Member Portal to continue registration.');
    context.log('='.repeat(80));

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: endpoint_id,
      action: 'update',
      details: { action: 'verification_email_sent', mock: true }
    }, context);

    return {
      status: 200,
      jsonBody: {
        message: 'Verification email sent successfully',
        mock: true,
        token: endpoint.verification_token, // Only for development
        expires_at: endpoint.verification_expires_at
      }
    };
  } catch (error: any) {
    context.error('Error sending verification email:', error);
    return { status: 500, jsonBody: { error: 'Failed to send verification email', details: error.message } };
  }
}

/**
 * Step 3: Verify Endpoint Token
 * Validates the verification token provided by the user
 */
async function verifyTokenHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const endpoint_id = request.params.endpoint_id;

  if (!endpoint_id) {
    return {
      status: 400,
      jsonBody: { error: 'endpoint_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(endpoint_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const body = await request.json() as any;
    const userEmail = request.userEmail;

    if (!body.token) {
      return {
        status: 400,
        jsonBody: { error: 'token is required' }
      };
    }

    // Get endpoint and verify ownership
    const endpointResult = await pool.query(
      `SELECT e.*
       FROM legal_entity_endpoint e
       WHERE e.legal_entity_endpoint_id = $1 AND e.is_deleted = false`,
      [endpoint_id]
    );

    if (endpointResult.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' }
      };
    }

    const endpoint = endpointResult.rows[0];

    // Verify ownership (admins bypass)
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const ownershipCheck = await pool.query(
        `SELECT le.legal_entity_id
         FROM legal_entity le
         JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
         WHERE le.legal_entity_id = $1
           AND c.email = $2
           AND c.is_active = true
           AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
        [endpoint.legal_entity_id, userEmail]
      );

      if (ownershipCheck.rows.length === 0) {
        context.warn(`IDOR attempt: User ${userEmail} tried to verify token for endpoint ${endpoint_id}`);
        return {
          status: 404,
          jsonBody: { error: 'Endpoint not found' }
        };
      }
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(endpoint.verification_expires_at);
    if (now > expiresAt) {
      await pool.query(
        `UPDATE legal_entity_endpoint
         SET verification_status = 'EXPIRED', dt_modified = NOW()
         WHERE legal_entity_endpoint_id = $1`,
        [endpoint_id]
      );

      return {
        status: 400,
        jsonBody: { error: 'Verification token has expired', expired: true }
      };
    }

    // Verify token matches
    if (body.token !== endpoint.verification_token) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity_endpoint',
        resource_id: endpoint_id,
        action: 'verify',
        details: { reason: 'invalid_token' },
        error_message: 'Invalid verification token'
      }, context);

      return {
        status: 400,
        jsonBody: { error: 'Invalid verification token' }
      };
    }

    // Token is valid - update status to VERIFIED
    const updateResult = await pool.query(
      `UPDATE legal_entity_endpoint
       SET verification_status = 'VERIFIED',
           dt_modified = NOW()
       WHERE legal_entity_endpoint_id = $1
       RETURNING *`,
      [endpoint_id]
    );

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: endpoint_id,
      action: 'verify',
      details: { status: 'VERIFIED' }
    }, context);

    return {
      status: 200,
      jsonBody: {
        message: 'Token verified successfully',
        endpoint: updateResult.rows[0]
      }
    };
  } catch (error: any) {
    context.error('Error verifying token:', error);
    return { status: 500, jsonBody: { error: 'Failed to verify token', details: error.message } };
  }
}

/**
 * Step 4: Test Endpoint (Mock)
 * In production, this would make a real API call to the endpoint
 * For now, returns mock successful test data
 */
async function testEndpointHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const endpoint_id = request.params.endpoint_id;

  if (!endpoint_id) {
    return {
      status: 400,
      jsonBody: { error: 'endpoint_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(endpoint_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;

    // Get endpoint and verify ownership
    const endpointResult = await pool.query(
      `SELECT e.*
       FROM legal_entity_endpoint e
       WHERE e.legal_entity_endpoint_id = $1 AND e.is_deleted = false`,
      [endpoint_id]
    );

    if (endpointResult.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' }
      };
    }

    const endpoint = endpointResult.rows[0];

    // Verify ownership (admins bypass)
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const ownershipCheck = await pool.query(
        `SELECT le.legal_entity_id
         FROM legal_entity le
         JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
         WHERE le.legal_entity_id = $1
           AND c.email = $2
           AND c.is_active = true
           AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
        [endpoint.legal_entity_id, userEmail]
      );

      if (ownershipCheck.rows.length === 0) {
        context.warn(`IDOR attempt: User ${userEmail} tried to test endpoint ${endpoint_id}`);
        return {
          status: 404,
          jsonBody: { error: 'Endpoint not found' }
        };
      }
    }

    // Check if endpoint is verified
    if (endpoint.verification_status !== 'VERIFIED') {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint must be verified before testing', status: endpoint.verification_status }
      };
    }

    // MOCK: Simulate API test call
    const mockTestData = {
      success: true,
      tested_at: new Date().toISOString(),
      endpoint_url: endpoint.endpoint_url,
      response_time_ms: Math.floor(Math.random() * 200) + 50,
      status_code: 200,
      mock_response: {
        version: '1.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        capabilities: ['data_exchange', 'real_time_updates']
      }
    };

    context.log('='.repeat(80));
    context.log('MOCK ENDPOINT TEST');
    context.log('='.repeat(80));
    context.log(`Endpoint URL: ${endpoint.endpoint_url}`);
    context.log(`Response Time: ${mockTestData.response_time_ms}ms`);
    context.log(`Status Code: ${mockTestData.status_code}`);
    context.log('='.repeat(80));

    // Store test result data
    const updateResult = await pool.query(
      `UPDATE legal_entity_endpoint
       SET test_result_data = $1,
           dt_modified = NOW()
       WHERE legal_entity_endpoint_id = $2
       RETURNING *`,
      [JSON.stringify(mockTestData), endpoint_id]
    );

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: endpoint_id,
      action: 'test',
      details: { success: true, mock: true, response_time_ms: mockTestData.response_time_ms }
    }, context);

    return {
      status: 200,
      jsonBody: {
        message: 'Endpoint test successful',
        mock: true,
        test_data: mockTestData,
        endpoint: updateResult.rows[0]
      }
    };
  } catch (error: any) {
    context.error('Error testing endpoint:', error);

    // Store failed test result
    const failedTestData = {
      success: false,
      tested_at: new Date().toISOString(),
      error: error.message
    };

    await pool.query(
      `UPDATE legal_entity_endpoint
       SET test_result_data = $1,
           dt_modified = NOW()
       WHERE legal_entity_endpoint_id = $2`,
      [JSON.stringify(failedTestData), endpoint_id]
    );

    return { status: 500, jsonBody: { error: 'Failed to test endpoint', details: error.message } };
  }
}

/**
 * Step 5: Activate Endpoint
 * Final step - marks endpoint as active and available in discovery service
 */
async function activateEndpointHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const endpoint_id = request.params.endpoint_id;

  if (!endpoint_id) {
    return {
      status: 400,
      jsonBody: { error: 'endpoint_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(endpoint_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;

    // Get endpoint and verify ownership
    const endpointResult = await pool.query(
      `SELECT e.*
       FROM legal_entity_endpoint e
       WHERE e.legal_entity_endpoint_id = $1 AND e.is_deleted = false`,
      [endpoint_id]
    );

    if (endpointResult.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' }
      };
    }

    const endpoint = endpointResult.rows[0];

    // Verify ownership (admins bypass)
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const ownershipCheck = await pool.query(
        `SELECT le.legal_entity_id
         FROM legal_entity le
         JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
         WHERE le.legal_entity_id = $1
           AND c.email = $2
           AND c.is_active = true
           AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
        [endpoint.legal_entity_id, userEmail]
      );

      if (ownershipCheck.rows.length === 0) {
        context.warn(`IDOR attempt: User ${userEmail} tried to activate endpoint ${endpoint_id}`);
        return {
          status: 404,
          jsonBody: { error: 'Endpoint not found' }
        };
      }
    }

    // Check if endpoint is verified and tested
    if (endpoint.verification_status !== 'VERIFIED') {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint must be verified before activation', status: endpoint.verification_status }
      };
    }

    if (!endpoint.test_result_data) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint must be tested before activation' }
      };
    }

    const testData = typeof endpoint.test_result_data === 'string'
      ? JSON.parse(endpoint.test_result_data)
      : endpoint.test_result_data;

    if (!testData.success) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint test must pass before activation' }
      };
    }

    // Activate endpoint
    const updateResult = await pool.query(
      `UPDATE legal_entity_endpoint
       SET is_active = true,
           activation_date = NOW(),
           dt_modified = NOW()
       WHERE legal_entity_endpoint_id = $1
       RETURNING *`,
      [endpoint_id]
    );

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: endpoint_id,
      action: 'activate',
      details: { is_active: true, activation_date: updateResult.rows[0].activation_date }
    }, context);

    return {
      status: 200,
      jsonBody: {
        message: 'Endpoint activated successfully and available in discovery service',
        endpoint: updateResult.rows[0]
      }
    };
  } catch (error: any) {
    context.error('Error activating endpoint:', error);
    return { status: 500, jsonBody: { error: 'Failed to activate endpoint', details: error.message } };
  }
}

// Register Azure Functions
app.http('InitiateEndpointRegistration', {
  methods: ['POST'],
  route: 'v1/entities/{legal_entity_id}/endpoints/register',
  authLevel: 'anonymous',
  handler: wrapEndpoint(initiateRegistrationHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

app.http('SendEndpointVerificationEmail', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/send-verification',
  authLevel: 'anonymous',
  handler: wrapEndpoint(sendVerificationEmailHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

app.http('VerifyEndpointToken', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/verify-token',
  authLevel: 'anonymous',
  handler: wrapEndpoint(verifyTokenHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

app.http('TestEndpoint', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/test',
  authLevel: 'anonymous',
  handler: wrapEndpoint(testEndpointHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

app.http('ActivateEndpoint', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/activate',
  authLevel: 'anonymous',
  handler: wrapEndpoint(activateEndpointHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});
