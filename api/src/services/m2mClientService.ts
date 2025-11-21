/**
 * M2M Client Service
 *
 * Business logic layer for M2M client operations.
 * Orchestrates validation, database access, and audit logging.
 * Adheres to Single Responsibility Principle - each function handles one business operation.
 */

import { Pool } from 'pg';
import { InvocationContext, HttpResponseInit } from '@azure/functions';
import { AuthenticatedRequest } from '../middleware/endpointWrapper';
import { UserRole, hasAnyRole } from '../middleware/rbac';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';
import {
  validateLegalEntityId,
  validateClientId,
  validateCreateClientData,
  validateGenerateSecretData,
  validateUpdateScopesData,
  validateDeactivateClientData
} from '../validators/m2mClientValidators';
import {
  fetchClientsByLegalEntity,
  verifyLegalEntityOwnership,
  insertM2MClient,
  verifyM2MClientOwnership,
  verifyCreatePermission,
  insertSecretAuditRecord,
  updateClientScopes,
  deactivateClient,
  revokeAllClientSecrets
} from '../database/m2mClientRepository';
import {
  extractAuditParams,
  extractClientIp,
  extractUserAgent,
  logAccessGranted,
  logAccessDenied,
  logClientCreated,
  logSecretGenerated,
  logScopesUpdated,
  logClientDeactivated,
  logOperationError,
  generateClientSecret,
  generateAzureClientId,
  calculateExpirationDate
} from '../utils/m2mClientUtils';
import { AuditEventType, AuditSeverity } from '../middleware/auditLog';

/**
 * Lists M2M clients for a legal entity
 * Handles both admin and user access with ownership verification
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param pool - Database connection pool
 * @returns HTTP response with paginated client list
 */
export async function listM2MClients(
  request: AuthenticatedRequest,
  context: InvocationContext,
  pool: Pool
): Promise<HttpResponseInit> {
  const legalEntityIdParam = request.params.legal_entity_id;

  // Validate legal entity ID
  const validation = validateLegalEntityId(legalEntityIdParam);
  if (!validation.isValid) {
    return {
      status: 400,
      jsonBody: { error: validation.error }
    };
  }

  // After validation, legal EntityId is guaranteed to be a string
  const legalEntityId = legalEntityIdParam!;

  try {
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

      await logAccessGranted(request, context, legalEntityId, {
        admin_access: true,
        count: result.pagination.totalItems
      });

      return {
        status: 200,
        jsonBody: result
      };
    }

    // Regular user: verify ownership
    const ownershipCheck = await verifyLegalEntityOwnership(pool, legalEntityId, request.userEmail);

    if (ownershipCheck.rows.length === 0) {
      await logAccessDenied(request, context, legalEntityId, 'read', 'ownership_check_failed');

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

    const result = await executePaginatedQuery(pool, baseQuery, [legalEntityId!], pagination);

    await logAccessGranted(request, context, legalEntityId!, {
      count: result.pagination.totalItems
    });

    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    await logOperationError(
      request,
      context,
      legalEntityId!,
      'read',
      AuditEventType.ACCESS_DENIED,
      AuditSeverity.ERROR,
      error
    );

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch M2M clients' }
    };
  }
}

/**
 * Creates a new M2M client
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param pool - Database connection pool
 * @returns HTTP response with created client
 */
export async function createM2MClient(
  request: AuthenticatedRequest,
  context: InvocationContext,
  pool: Pool
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legal_entity_id;

  // Validate legal entity ID
  const idValidation = validateLegalEntityId(legalEntityId);
  if (!idValidation.isValid) {
    return {
      status: 400,
      jsonBody: { error: idValidation.error }
    };
  }

  try {
    const body = await request.json() as any;

    // Validate request body
    const dataValidation = validateCreateClientData(body);
    if (!dataValidation.isValid) {
      return {
        status: 400,
        jsonBody: {
          error: dataValidation.error,
          ...(dataValidation.details && { details: dataValidation.details })
        }
      };
    }

    const { client_name, description, assigned_scopes } = body;

    // Verify ownership (admin or entity owner)
    const userRole = request.userRoles?.[0] || 'USER';
    const ownershipCheck = await verifyCreatePermission(
      pool,
      legalEntityId!,
      request.userEmail,
      userRole
    );

    if (ownershipCheck.rows.length === 0) {
      await logAccessDenied(request, context, legalEntityId!, 'create', 'ownership_check_failed');

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    // Generate Azure AD client ID
    const azureClientId = generateAzureClientId();

    // Insert M2M client
    const result = await insertM2MClient(pool, {
      legal_entity_id: legalEntityId!,
      client_name,
      azure_client_id: azureClientId,
      description: description || null,
      assigned_scopes,
      created_by: request.userId
    });

    const newClient = result.rows[0];

    // Log creation
    await logClientCreated(request, context, newClient.m2m_client_id, {
      client_name,
      azure_client_id: azureClientId,
      assigned_scopes,
      legal_entity_id: legalEntityId
    });

    return {
      status: 201,
      jsonBody: newClient
    };
  } catch (error) {
    await logOperationError(
      request,
      context,
      legalEntityId!,
      'create',
      AuditEventType.MEMBER_CREATED,
      AuditSeverity.ERROR,
      error
    );

    return {
      status: 500,
      jsonBody: { error: 'Failed to create M2M client' }
    };
  }
}

/**
 * Generates a new secret for an M2M client
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param pool - Database connection pool
 * @returns HTTP response with generated secret (ONLY TIME secret is returned)
 */
export async function generateSecret(
  request: AuthenticatedRequest,
  context: InvocationContext,
  pool: Pool
): Promise<HttpResponseInit> {
  const clientId = request.params.client_id;

  // Validate client ID
  const validation = validateClientId(clientId);
  if (!validation.isValid) {
    return {
      status: 400,
      jsonBody: { error: validation.error }
    };
  }

  try {
    const body = await request.json() as any;

    // Validate request body
    const dataValidation = validateGenerateSecretData(body);
    if (!dataValidation.isValid) {
      return {
        status: 400,
        jsonBody: { error: dataValidation.error }
      };
    }

    const expiresInDays = dataValidation.expires_in_days!;

    // Verify ownership
    const userRole = request.userRoles?.[0] || 'USER';
    const ownershipCheck = await verifyM2MClientOwnership(
      pool,
      clientId!,
      request.userEmail,
      userRole,
      false
    );

    if (ownershipCheck.rows.length === 0) {
      await logAccessDenied(request, context, clientId!, 'generate_secret', 'ownership_check_failed');

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    const clientData = ownershipCheck.rows[0];

    // Generate secret
    const secret = generateClientSecret();

    // Calculate expiration
    const expiresAt = calculateExpirationDate(expiresInDays);

    // Insert audit record (NEVER store actual secret)
    await insertSecretAuditRecord(pool, {
      m2m_client_id: clientId!,
      generated_by: request.userId,
      expires_at: expiresAt,
      generated_from_ip: extractClientIp(request.headers) || null,
      user_agent: extractUserAgent(request.headers) || null
    });

    // Log secret generation
    await logSecretGenerated(request, context, clientId!, {
      client_name: clientData.client_name,
      legal_entity_id: clientData.legal_entity_id,
      expires_in_days: expiresInDays,
      expires_at: expiresAt.toISOString()
    });

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
    await logOperationError(
      request,
      context,
      clientId!,
      'generate_secret',
      AuditEventType.TOKEN_ISSUED,
      AuditSeverity.ERROR,
      error
    );

    return {
      status: 500,
      jsonBody: { error: 'Failed to generate secret' }
    };
  }
}

/**
 * Updates M2M client scopes
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param pool - Database connection pool
 * @returns HTTP response with updated client
 */
export async function updateScopes(
  request: AuthenticatedRequest,
  context: InvocationContext,
  pool: Pool
): Promise<HttpResponseInit> {
  const clientId = request.params.client_id;

  // Validate client ID
  const idValidation = validateClientId(clientId);
  if (!idValidation.isValid) {
    return {
      status: 400,
      jsonBody: { error: idValidation.error }
    };
  }

  try {
    const body = await request.json() as any;

    // Validate request body
    const dataValidation = validateUpdateScopesData(body);
    if (!dataValidation.isValid) {
      return {
        status: 400,
        jsonBody: {
          error: dataValidation.error,
          ...(dataValidation.details && { details: dataValidation.details })
        }
      };
    }

    const { assigned_scopes } = body;

    // Verify ownership (need old_scopes for audit log)
    const userRole = request.userRoles?.[0] || 'USER';
    const ownershipCheck = await verifyM2MClientOwnership(
      pool,
      clientId!,
      request.userEmail,
      userRole,
      true // Include old_scopes
    );

    if (ownershipCheck.rows.length === 0) {
      await logAccessDenied(request, context, clientId!, 'update_scopes', 'ownership_check_failed');

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    const clientData = ownershipCheck.rows[0];

    // Update scopes
    const result = await updateClientScopes(pool, clientId!, assigned_scopes, request.userId);
    const updatedClient = result.rows[0];

    // Log scope update
    await logScopesUpdated(request, context, clientId!, {
      client_name: clientData.client_name,
      old_scopes: clientData.old_scopes,
      new_scopes: assigned_scopes
    });

    return {
      status: 200,
      jsonBody: updatedClient
    };
  } catch (error) {
    await logOperationError(
      request,
      context,
      clientId!,
      'update_scopes',
      AuditEventType.MEMBER_UPDATED,
      AuditSeverity.ERROR,
      error
    );

    return {
      status: 500,
      jsonBody: { error: 'Failed to update scopes' }
    };
  }
}

/**
 * Deactivates an M2M client and revokes all secrets
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param pool - Database connection pool
 * @returns HTTP response confirming deactivation
 */
export async function deactivateM2MClient(
  request: AuthenticatedRequest,
  context: InvocationContext,
  pool: Pool
): Promise<HttpResponseInit> {
  const clientId = request.params.client_id;

  // Validate client ID
  const validation = validateClientId(clientId);
  if (!validation.isValid) {
    return {
      status: 400,
      jsonBody: { error: validation.error }
    };
  }

  try {
    const body = await request.json() as any;

    // Validate request body
    const dataValidation = validateDeactivateClientData(body);
    if (!dataValidation.isValid) {
      return {
        status: 400,
        jsonBody: { error: dataValidation.error }
      };
    }

    const reason = dataValidation.reason!;

    // Verify ownership
    const userRole = request.userRoles?.[0] || 'USER';
    const ownershipCheck = await verifyM2MClientOwnership(
      pool,
      clientId!,
      request.userEmail,
      userRole,
      false
    );

    if (ownershipCheck.rows.length === 0) {
      await logAccessDenied(request, context, clientId!, 'deactivate', 'ownership_check_failed');

      return {
        status: 404, // Return 404 to prevent information disclosure
        jsonBody: { error: 'Resource not found' }
      };
    }

    const clientData = ownershipCheck.rows[0];

    // Deactivate client (soft delete)
    await deactivateClient(pool, clientId!, reason, request.userId);

    // Revoke all active secrets
    await revokeAllClientSecrets(pool, clientId!, request.userId, 'Client deactivated');

    // Log deactivation
    await logClientDeactivated(request, context, clientId!, {
      client_name: clientData.client_name,
      legal_entity_id: clientData.legal_entity_id,
      reason
    });

    return {
      status: 200,
      jsonBody: {
        message: 'M2M client deactivated successfully',
        client_id: clientId,
        deactivated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    await logOperationError(
      request,
      context,
      clientId!,
      'deactivate',
      AuditEventType.MEMBER_SUSPENDED,
      AuditSeverity.ERROR,
      error
    );

    return {
      status: 500,
      jsonBody: { error: 'Failed to deactivate M2M client' }
    };
  }
}
