/**
 * ResolveParty
 * Maps Azure AD authenticated users to their party_id in the database
 *
 * Security: CRITICAL - Enables multi-tenant data isolation in Orchestrator Portal
 * Related: AUTH-001 implementation
 *
 * Query Path:
 * members.azure_ad_object_id (oid from JWT)
 *   → members.legal_entity_id
 *   → legal_entity.party_id
 *   → party_reference.party_id
 *
 * Returns:
 * {
 *   party_id: "uuid",
 *   legal_entity_id: "uuid",
 *   party_type: "string",
 *   party_class: "string",
 *   org_id: "string",
 *   legal_name: "string"
 * }
 *
 * Errors:
 * - 401 Unauthorized: Invalid/missing token
 * - 403 Forbidden: Missing oid claim in token
 * - 404 Not Found: User not associated with any party
 * - 500 Internal Server Error: Database error
 */

import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  context.log('ResolveParty function triggered');

  try {
    // Extract oid (Azure AD object ID) from authenticated token
    const oid = request.user?.oid;

    trackEvent('resolve_party_request', {
      user_id: request.userId || 'anonymous',
      oid: oid || 'missing'
    }, undefined, context);

    if (!oid) {
      context.warn('Party resolution failed: Missing oid claim in JWT');
      return {
        status: 403,
        jsonBody: {
          error: 'forbidden',
          message: 'Token missing required oid claim'
        }
      };
    }

    context.log(`Resolving party for Azure AD oid: ${oid}`);

    const pool = getPool();

    // Query to resolve party ID from Azure AD object ID
    // Joins: members → legal_entity → party_reference
    const query = `
      SELECT
        m.id as member_id,
        m.org_id,
        m.legal_name,
        m.email,
        m.azure_ad_object_id,
        le.legal_entity_id,
        le.primary_legal_name,
        pr.party_id,
        pr.party_type,
        pr.party_class
      FROM members m
      INNER JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      INNER JOIN party_reference pr ON le.party_id = pr.party_id
      WHERE m.azure_ad_object_id = $1
        AND m.status != 'DELETED'
        AND le.is_deleted = false
        AND pr.is_deleted = false
      LIMIT 1
    `;

    const dbStart = Date.now();
    const result = await pool.query(query, [oid]);
    const dbDuration = Date.now() - dbStart;

    trackDependency('PostgreSQL:ResolveParty', 'SQL', dbDuration, true, {
      table: 'members_legal_entity_party',
      operation: 'SELECT'
    });

    // Check if user has party association
    if (result.rows.length === 0) {
      context.warn(`No party association found for oid: ${oid}`);

      // Log security event - potential unauthorized access attempt
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
        resource_type: 'party_resolution',
        action: 'resolve',
        error_message: 'User not associated with any party',
        details: { oid }
      }, context);

      return {
        status: 404,
        jsonBody: {
          error: 'not_found',
          message: 'User is not associated with any registered party',
          hint: 'Contact administrator to link your account to an organization'
        }
      };
    }

    const party = result.rows[0];

    context.log(`Party resolved successfully: ${party.party_id} (${party.legal_name})`);

    // Log successful party resolution
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
      resource_type: 'party_resolution',
      action: 'resolve',
      details: {
        party_id: party.party_id,
        legal_entity_id: party.legal_entity_id,
        org_id: party.org_id
      }
    }, context);

    // Track success
    const totalDuration = Date.now() - startTime;
    trackEvent('resolve_party_success', {
      status: 'success',
      party_id: party.party_id
    }, { duration: totalDuration }, context);

    trackMetric('resolve_party_duration', totalDuration, {
      operation: 'resolve_party'
    });

    // Return party information
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        party_id: party.party_id,
        legal_entity_id: party.legal_entity_id,
        party_type: party.party_type,
        party_class: party.party_class,
        org_id: party.org_id,
        legal_name: party.legal_name,
        primary_legal_name: party.primary_legal_name,
        email: party.email
      }
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    context.error('Error resolving party:', error);

    // Track failure
    trackException(error as Error, {
      operation: 'resolve_party',
      user_id: request.userId || 'anonymous'
    });

    trackEvent('resolve_party_failure', {
      status: 'failure',
      error: (error as Error).message
    }, { duration: totalDuration }, context);

    // Log error
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
      resource_type: 'party_resolution',
      action: 'resolve',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'internal_server_error',
        message: 'Failed to resolve party identity',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('ResolveParty', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/auth/resolve-party',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [], // No specific permissions required - just authentication
    requireAllPermissions: false
  })
});
