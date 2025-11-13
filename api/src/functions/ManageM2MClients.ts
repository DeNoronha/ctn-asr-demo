import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';
import * as crypto from 'crypto';
import { handleError } from '../utils/errors';

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: Headers, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

// =====================================================
// List M2M Clients for a Legal Entity
// GET /api/v1/legal-entities/{legal_entity_id}/m2m-clients
// =====================================================
async function listM2MClientsHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const legalEntityId = request.params.legal_entity_id;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legalEntityId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for legal_entity_id' }
    };
  }

  try {
    const userEmail = request.userEmail;
    const pagination = getPaginationParams(request);

    // Admin can list M2M clients for any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const baseQuery = `
        SELECT
          c.m2m_client_id,
          c.legal_entity_id,
          c.client_name,
          c.azure_client_id,
          c.azure_object_id,
          c.description,
          c.assigned_scopes,
          c.is_active,
          c.dt_created,
          c.dt_modified,
          c.created_by,
          c.modified_by,
          -- Count active secrets (metadata only, never actual secrets)
          (SELECT COUNT(*)
           FROM m2m_client_secrets_audit s
           WHERE s.m2m_client_id = c.m2m_client_id
             AND s.is_revoked = false) as active_secrets_count,
          -- Last secret generation timestamp
          (SELECT MAX(secret_generated_at)
           FROM m2m_client_secrets_audit s
           WHERE s.m2m_client_id = c.m2m_client_id) as last_secret_generated_at
        FROM m2m_clients c
        WHERE c.legal_entity_id = $1
          AND c.is_deleted = false
        ORDER BY c.dt_created DESC
      `;

      const result = await executePaginatedQuery(pool, baseQuery, [legalEntityId], pagination);

      await logAuditEvent({
        event_type: AuditEventType.ACCESS_GRANTED,
        severity: AuditSeverity.INFO,
        result: 'success',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client',
        resource_id: legalEntityId,
        action: 'read',
        details: { admin_access: true, count: result.pagination.totalItems }
      }, context);

      return {
        status: 200,
        jsonBody: result
      };
    }

    // Regular user: verify ownership before returning M2M clients
    const ownershipCheck = await pool.query(
      `SELECT le.legal_entity_id
       FROM legal_entity le
       JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
       WHERE le.legal_entity_id = $1
         AND c.email = $2
         AND c.is_active = true
         AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
      [legalEntityId, userEmail]
    );

    if (ownershipCheck.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client',
        resource_id: legalEntityId,
        action: 'read',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to access M2M clients for this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to access M2M clients for entity ${legalEntityId}`);

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    const baseQuery = `
      SELECT
        c.m2m_client_id,
        c.legal_entity_id,
        c.client_name,
        c.azure_client_id,
        c.azure_object_id,
        c.description,
        c.assigned_scopes,
        c.is_active,
        c.dt_created,
        c.dt_modified,
        (SELECT COUNT(*)
         FROM m2m_client_secrets_audit s
         WHERE s.m2m_client_id = c.m2m_client_id
           AND s.is_revoked = false) as active_secrets_count,
        (SELECT MAX(secret_generated_at)
         FROM m2m_client_secrets_audit s
         WHERE s.m2m_client_id = c.m2m_client_id) as last_secret_generated_at
      FROM m2m_clients c
      WHERE c.legal_entity_id = $1
        AND c.is_deleted = false
      ORDER BY c.dt_created DESC
    `;

    const result = await executePaginatedQuery(pool, baseQuery, [legalEntityId], pagination);

    await logAuditEvent({
      event_type: AuditEventType.ACCESS_GRANTED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: legalEntityId,
      action: 'read',
      details: { count: result.pagination.totalItems }
    }, context);

    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.error('Error fetching M2M clients:', error);

    await logAuditEvent({
      event_type: AuditEventType.ACCESS_DENIED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: legalEntityId,
      action: 'read',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch M2M clients' }
    };
  }
}

// =====================================================
// Create M2M Client
// POST /api/v1/legal-entities/{legal_entity_id}/m2m-clients
// =====================================================
async function createM2MClientHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const legalEntityId = request.params.legal_entity_id;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legalEntityId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for legal_entity_id' }
    };
  }

  try {
    const body = await request.json() as any;
    const { client_name, description, assigned_scopes } = body;

    // Validate required fields
    if (!client_name || !assigned_scopes || !Array.isArray(assigned_scopes) || assigned_scopes.length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields',
          required: ['client_name', 'assigned_scopes'],
          note: 'assigned_scopes must be a non-empty array'
        }
      };
    }

    // Validate scope values
    const validScopes = ['ETA.Read', 'Container.Read', 'Booking.Read', 'Booking.Write', 'Orchestration.Read'];
    const invalidScopes = assigned_scopes.filter((scope: string) => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid scopes provided',
          invalid_scopes: invalidScopes,
          valid_scopes: validScopes
        }
      };
    }

    const userEmail = request.userEmail;

    // Verify ownership (admin or entity owner)
    const ownershipCheck = await pool.query(
      `SELECT le.legal_entity_id
       FROM legal_entity le
       LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id AND c.email = $2 AND c.is_active = true
       WHERE le.legal_entity_id = $1
         AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)
         AND (c.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))`,
      [legalEntityId, userEmail, request.userRoles?.[0] || 'USER']
    );

    if (ownershipCheck.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client',
        resource_id: legalEntityId,
        action: 'create',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to create M2M clients for this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to create M2M client for entity ${legalEntityId}`);

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    // Generate Azure AD client ID (UUID v4)
    const azureClientId = crypto.randomUUID();

    // Insert M2M client into database
    const result = await pool.query(
      `INSERT INTO m2m_clients (
        legal_entity_id,
        client_name,
        azure_client_id,
        description,
        assigned_scopes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        m2m_client_id,
        legal_entity_id,
        client_name,
        azure_client_id,
        azure_object_id,
        description,
        assigned_scopes,
        is_active,
        dt_created,
        dt_modified`,
      [legalEntityId, client_name, azureClientId, description || null, assigned_scopes, request.userId]
    );

    const newClient = result.rows[0];

    // Log creation
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_CREATED, // Use existing event type
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: newClient.m2m_client_id,
      action: 'create',
      details: {
        client_name,
        azure_client_id: azureClientId,
        assigned_scopes,
        legal_entity_id: legalEntityId
      }
    }, context);

    context.info(`M2M client created: ${newClient.m2m_client_id} for entity ${legalEntityId}`);

    return {
      status: 201,
      jsonBody: newClient
    };
  } catch (error) {
    context.error('Error creating M2M client:', error);

    await logAuditEvent({
      event_type: AuditEventType.MEMBER_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: legalEntityId,
      action: 'create',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to create M2M client' }
    };
  }
}

// =====================================================
// Generate Secret for M2M Client
// POST /api/v1/m2m-clients/{client_id}/generate-secret
// =====================================================
async function generateSecretHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const clientId = request.params.client_id;

  if (!clientId) {
    return {
      status: 400,
      jsonBody: { error: 'client_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for client_id' }
    };
  }

  try {
    const body = await request.json() as any;
    const expiresInDays = body.expires_in_days || 365; // Default: 1 year

    const userEmail = request.userEmail;

    // Verify ownership via legal entity
    const ownershipCheck = await pool.query(
      `SELECT c.m2m_client_id, c.legal_entity_id, c.client_name
       FROM m2m_clients c
       JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
       LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.email = $2 AND lec.is_active = true
       WHERE c.m2m_client_id = $1
         AND c.is_deleted = false
         AND c.is_active = true
         AND (lec.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))`,
      [clientId, userEmail, request.userRoles?.[0] || 'USER']
    );

    if (ownershipCheck.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client_secret',
        resource_id: clientId,
        action: 'generate_secret',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to generate secrets for this M2M client'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to generate secret for M2M client ${clientId}`);

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    // Generate secret (cryptographically secure random bytes)
    const secretBytes = crypto.randomBytes(32);
    const secret = secretBytes.toString('base64url'); // URL-safe base64 encoding

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Insert audit record (NEVER store actual secret)
    const clientIp = safeGetHeader(request.headers, 'x-forwarded-for')?.split(',')[0].trim();
    const userAgent = safeGetHeader(request.headers, 'user-agent');

    await pool.query(
      `INSERT INTO m2m_client_secrets_audit (
        m2m_client_id,
        generated_by,
        expires_at,
        generated_from_ip,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5)`,
      [clientId, request.userId, expiresAt, clientIp, userAgent]
    );

    // Log secret generation
    await logAuditEvent({
      event_type: AuditEventType.TOKEN_ISSUED, // Secret generation is similar to token issuance
      severity: AuditSeverity.WARNING, // Elevated severity for secret generation
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: clientIp || undefined,
      user_agent: userAgent || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client_secret',
      resource_id: clientId,
      action: 'generate_secret',
      details: {
        client_name: ownershipCheck.rows[0].client_name,
        legal_entity_id: ownershipCheck.rows[0].legal_entity_id,
        expires_in_days: expiresInDays,
        expires_at: expiresAt.toISOString()
      }
    }, context);

    context.warn(`SECRET GENERATED: M2M client ${clientId} for entity ${ownershipCheck.rows[0].legal_entity_id}`);

    return {
      status: 200,
      jsonBody: {
        secret, // ONLY TIME secret is returned
        client_id: clientId,
        expires_at: expiresAt.toISOString(),
        warning: 'Save this secret immediately. It will not be shown again.',
        note: 'Use this secret with client_id for OAuth2 client credentials flow'
      }
    };
  } catch (error) {
    context.error('Error generating secret:', error);

    await logAuditEvent({
      event_type: AuditEventType.TOKEN_ISSUED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client_secret',
      resource_id: clientId,
      action: 'generate_secret',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to generate secret' }
    };
  }
}

// =====================================================
// Update M2M Client Scopes
// PATCH /api/v1/m2m-clients/{client_id}/scopes
// =====================================================
async function updateScopesHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const clientId = request.params.client_id;

  if (!clientId) {
    return {
      status: 400,
      jsonBody: { error: 'client_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for client_id' }
    };
  }

  try {
    const body = await request.json() as any;
    const { assigned_scopes } = body;

    if (!assigned_scopes || !Array.isArray(assigned_scopes) || assigned_scopes.length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'assigned_scopes is required and must be a non-empty array'
        }
      };
    }

    // Validate scope values
    const validScopes = ['ETA.Read', 'Container.Read', 'Booking.Read', 'Booking.Write', 'Orchestration.Read'];
    const invalidScopes = assigned_scopes.filter((scope: string) => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid scopes provided',
          invalid_scopes: invalidScopes,
          valid_scopes: validScopes
        }
      };
    }

    const userEmail = request.userEmail;

    // Verify ownership via legal entity
    const ownershipCheck = await pool.query(
      `SELECT c.m2m_client_id, c.legal_entity_id, c.client_name, c.assigned_scopes as old_scopes
       FROM m2m_clients c
       JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
       LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.email = $2 AND lec.is_active = true
       WHERE c.m2m_client_id = $1
         AND c.is_deleted = false
         AND c.is_active = true
         AND (lec.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))`,
      [clientId, userEmail, request.userRoles?.[0] || 'USER']
    );

    if (ownershipCheck.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client',
        resource_id: clientId,
        action: 'update_scopes',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to update scopes for this M2M client'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to update scopes for M2M client ${clientId}`);

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    // Update scopes
    const result = await pool.query(
      `UPDATE m2m_clients
       SET assigned_scopes = $1, dt_modified = NOW(), modified_by = $2
       WHERE m2m_client_id = $3
       RETURNING
         m2m_client_id,
         legal_entity_id,
         client_name,
         azure_client_id,
         azure_object_id,
         description,
         assigned_scopes,
         is_active,
         dt_created,
         dt_modified`,
      [assigned_scopes, request.userId, clientId]
    );

    const updatedClient = result.rows[0];

    // Log scope update
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: clientId,
      action: 'update_scopes',
      details: {
        client_name: ownershipCheck.rows[0].client_name,
        old_scopes: ownershipCheck.rows[0].old_scopes,
        new_scopes: assigned_scopes
      }
    }, context);

    context.info(`Scopes updated for M2M client ${clientId}`);

    return {
      status: 200,
      jsonBody: updatedClient
    };
  } catch (error) {
    context.error('Error updating scopes:', error);

    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: clientId,
      action: 'update_scopes',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to update scopes' }
    };
  }
}

// =====================================================
// Deactivate M2M Client
// DELETE /api/v1/m2m-clients/{client_id}
// =====================================================
async function deactivateClientHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const clientId = request.params.client_id;

  if (!clientId) {
    return {
      status: 400,
      jsonBody: { error: 'client_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for client_id' }
    };
  }

  try {
    const body = await request.json() as any;
    const reason = body.reason || 'Client deactivated by user';

    const userEmail = request.userEmail;

    // Verify ownership via legal entity
    const ownershipCheck = await pool.query(
      `SELECT c.m2m_client_id, c.legal_entity_id, c.client_name
       FROM m2m_clients c
       JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
       LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.email = $2 AND lec.is_active = true
       WHERE c.m2m_client_id = $1
         AND c.is_deleted = false
         AND c.is_active = true
         AND (lec.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))`,
      [clientId, userEmail, request.userRoles?.[0] || 'USER']
    );

    if (ownershipCheck.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
        user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'm2m_client',
        resource_id: clientId,
        action: 'deactivate',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to deactivate this M2M client'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to deactivate M2M client ${clientId}`);

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    // Deactivate client (soft delete)
    await pool.query(
      `UPDATE m2m_clients
       SET is_active = false,
           deactivation_date = NOW(),
           deactivation_reason = $1,
           dt_modified = NOW(),
           modified_by = $2
       WHERE m2m_client_id = $3`,
      [reason, request.userId, clientId]
    );

    // Revoke all active secrets
    await pool.query(
      `UPDATE m2m_client_secrets_audit
       SET is_revoked = true,
           revoked_at = NOW(),
           revoked_by = $1,
           revocation_reason = $2
       WHERE m2m_client_id = $3
         AND is_revoked = false`,
      [request.userId, 'Client deactivated', clientId]
    );

    // Log deactivation
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_SUSPENDED,
      severity: AuditSeverity.WARNING,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: clientId,
      action: 'deactivate',
      details: {
        client_name: ownershipCheck.rows[0].client_name,
        legal_entity_id: ownershipCheck.rows[0].legal_entity_id,
        reason
      }
    }, context);

    context.warn(`M2M client deactivated: ${clientId} - Reason: ${reason}`);

    return {
      status: 200,
      jsonBody: {
        message: 'M2M client deactivated successfully',
        client_id: clientId,
        deactivated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error deactivating M2M client:', error);

    await logAuditEvent({
      event_type: AuditEventType.MEMBER_SUSPENDED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: safeGetHeader(request.headers, 'x-forwarded-for') || safeGetHeader(request.headers, 'x-real-ip') || undefined,
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'm2m_client',
      resource_id: clientId,
      action: 'deactivate',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to deactivate M2M client' }
    };
  }
}

// =====================================================
// Register HTTP endpoints
// =====================================================

app.http('ListM2MClients', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(listM2MClientsHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('CreateM2MClient', {
  methods: ['POST'],
  route: 'v1/legal-entities/{legal_entity_id}/m2m-clients',
  authLevel: 'anonymous',
  handler: wrapEndpoint(createM2MClientHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('GenerateM2MSecret', {
  methods: ['POST'],
  route: 'v1/m2m-clients/{client_id}/generate-secret',
  authLevel: 'anonymous',
  handler: wrapEndpoint(generateSecretHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('UpdateM2MClientScopes', {
  methods: ['PATCH'],
  route: 'v1/m2m-clients/{client_id}/scopes',
  authLevel: 'anonymous',
  handler: wrapEndpoint(updateScopesHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});

app.http('DeactivateM2MClient', {
  methods: ['DELETE'],
  route: 'v1/m2m-clients/{client_id}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(deactivateClientHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.DELETE_ENTITIES],
    requireAllPermissions: false
  })
});
