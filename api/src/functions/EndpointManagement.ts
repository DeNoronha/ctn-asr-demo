import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import * as crypto from 'crypto';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

// List endpoints for entity
async function listEndpointsHandler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const legal_entity_id = request.params.legal_entity_id;

  if (!legal_entity_id) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legal_entity_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;

    // Admin can list endpoints for any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await pool.query(
        'SELECT * FROM legal_entity_endpoint WHERE legal_entity_id = $1 AND is_deleted = false',
        [legal_entity_id]
      );

      await logAuditEvent({
        event_type: AuditEventType.ACCESS_GRANTED,
        severity: AuditSeverity.INFO,
        result: 'success',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity_endpoint',
        resource_id: legal_entity_id,
        action: 'read',
        details: { admin_access: true, count: result.rows.length }
      }, context);

      return { status: 200, jsonBody: result.rows };
    }

    // Regular user: verify ownership
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
        action: 'read',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to access endpoints for this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to list endpoints for entity ${legal_entity_id}`);

      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to access endpoints for this entity' }
      };
    }

    const result = await pool.query(
      'SELECT * FROM legal_entity_endpoint WHERE legal_entity_id = $1 AND is_deleted = false',
      [legal_entity_id]
    );

    await logAuditEvent({
      event_type: AuditEventType.ACCESS_GRANTED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: legal_entity_id,
      action: 'read',
      details: { count: result.rows.length }
    }, context);

    return { status: 200, jsonBody: result.rows };
  } catch (error: any) {
    context.error('Error listing endpoints:', error);

    await logAuditEvent({
      event_type: AuditEventType.ACCESS_DENIED,
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
      action: 'read',
      error_message: error.message,
      details: { error: error.message }
    }, context);

    return { status: 500, jsonBody: { error: 'Failed to list endpoints' } };
  }
}

app.http('ListEndpoints', {
  methods: ['GET'],
  route: 'v1/entities/{legal_entity_id}/endpoints',
  authLevel: 'anonymous',
  handler: wrapEndpoint(listEndpointsHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

// Create endpoint
async function createEndpointHandler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const legal_entity_id = request.params.legal_entity_id;

  if (!legal_entity_id) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legal_entity_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const body = await request.json() as any;
    const userEmail = request.userEmail;

    // Admin can create endpoints for any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await pool.query(
        `INSERT INTO legal_entity_endpoint (
          legal_entity_id, endpoint_name, endpoint_url, data_category,
          endpoint_type, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
        [legal_entity_id, body.endpoint_name, body.endpoint_url, body.data_category,
         body.endpoint_type || 'REST_API', userEmail]
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
        details: { admin_access: true, legal_entity_id }
      }, context);

      return { status: 201, jsonBody: result.rows[0] };
    }

    // Regular user: verify ownership
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
        status: 403,
        jsonBody: { error: 'You do not have permission to create endpoints for this entity' }
      };
    }

    const result = await pool.query(
      `INSERT INTO legal_entity_endpoint (
        legal_entity_id, endpoint_name, endpoint_url, data_category,
        endpoint_type, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
      [legal_entity_id, body.endpoint_name, body.endpoint_url, body.data_category,
       body.endpoint_type || 'REST_API', userEmail]
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
      details: { legal_entity_id }
    }, context);

    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    context.error('Error creating endpoint:', error);

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

    return { status: 500, jsonBody: { error: 'Failed to create endpoint' } };
  }
}

app.http('CreateEndpoint', {
  methods: ['POST'],
  route: 'v1/entities/{legal_entity_id}/endpoints',
  authLevel: 'anonymous',
  handler: wrapEndpoint(createEndpointHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});

// Issue token for endpoint
async function issueTokenHandler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const endpoint_id = request.params.endpoint_id;

  if (!endpoint_id) {
    return {
      status: 400,
      jsonBody: { error: 'endpoint_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(endpoint_id);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;

    // First, get the endpoint to find the legal_entity_id
    const endpointResult = await pool.query(
      'SELECT legal_entity_id FROM legal_entity_endpoint WHERE legal_entity_endpoint_id = $1 AND is_deleted = false',
      [endpoint_id]
    );

    if (endpointResult.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' }
      };
    }

    const legal_entity_id = endpointResult.rows[0].legal_entity_id;

    // Admin can issue tokens for any endpoint
    if (!hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      // Regular user: verify ownership
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
          resource_type: 'endpoint_authorization',
          resource_id: endpoint_id,
          action: 'create',
          details: { reason: 'ownership_check_failed', legal_entity_id },
          error_message: 'User does not have permission to issue tokens for this endpoint'
        }, context);

        context.warn(`IDOR attempt: User ${userEmail} tried to issue token for endpoint ${endpoint_id}`);

        return {
          status: 403,
          jsonBody: { error: 'You do not have permission to issue tokens for this endpoint' }
        };
      }
    }

    // Generate cryptographically secure token using crypto.randomBytes
    const randomBytes = crypto.randomBytes(32);
    const token_value = `BVAD_${Date.now()}_${randomBytes.toString('hex')}`;

    const result = await pool.query(
      `INSERT INTO endpoint_authorization (
        legal_entity_endpoint_id, token_value, token_type,
        issued_at, expires_at, is_active, issued_by
      ) VALUES ($1, $2, 'BVAD', NOW(), NOW() + INTERVAL '1 year', true, $3)
      RETURNING *`,
      [endpoint_id, token_value, userEmail]
    );

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_TOKEN_ISSUED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'endpoint_authorization',
      resource_id: result.rows[0].endpoint_authorization_id,
      action: 'create',
      details: { endpoint_id, legal_entity_id }
    }, context);

    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    context.error('Error issuing token:', error);

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_TOKEN_ISSUED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'endpoint_authorization',
      resource_id: endpoint_id,
      action: 'create',
      error_message: error.message,
      details: { error: error.message }
    }, context);

    return { status: 500, jsonBody: { error: 'Failed to issue token' } };
  }
}

app.http('IssueTokenForEndpoint', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/tokens',
  authLevel: 'anonymous',
  handler: wrapEndpoint(issueTokenHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  }),
});
