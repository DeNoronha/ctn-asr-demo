import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';

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

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const identifierId = request.params.identifierId;

  // Extract headers safely at the beginning
  const clientIp = safeGetHeader(request.headers, 'x-forwarded-for') ||
                   safeGetHeader(request.headers, 'x-real-ip') ||
                   undefined;
  const userAgent = safeGetHeader(request.headers, 'user-agent') || undefined;
  const requestPath = request.url;
  const requestMethod = request.method;

  if (!identifierId) {
    return {
      status: 400,
      jsonBody: { error: 'identifier_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifierId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for identifier_id' }
    };
  }

  try {
    // Soft delete: mark as deleted rather than actually removing the record
    const result = await pool.query(
      `UPDATE legal_entity_number
       SET is_deleted = true,
           dt_modified = CURRENT_TIMESTAMP,
           modified_by = $1
       WHERE legal_entity_reference_id = $2
       RETURNING legal_entity_id, identifier_type, identifier_value`,
      [request.userEmail || 'system', identifierId]
    );

    if (result.rows.length === 0) {
      // Log not found
      await logAuditEvent({
        event_type: AuditEventType.IDENTIFIER_DELETED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        request_path: requestPath,
        request_method: requestMethod,
        resource_type: 'legal_entity_identifier',
        resource_id: identifierId,
        action: 'delete',
        error_message: 'Identifier not found',
        details: { reason: 'not_found' }
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Identifier not found' }
      };
    }

    // Log successful deletion
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_DELETED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: clientIp,
      user_agent: userAgent,
      request_path: requestPath,
      request_method: requestMethod,
      resource_type: 'legal_entity_identifier',
      resource_id: identifierId,
      action: 'delete',
      details: {
        legal_entity_id: result.rows[0].legal_entity_id,
        identifier_type: result.rows[0].identifier_type,
        identifier_value: result.rows[0].identifier_value
      }
    }, context);

    return {
      status: 200,
      jsonBody: { message: 'Identifier deleted successfully' }
    };
  } catch (error) {
    context.error('Error deleting identifier:', error);

    // Log error
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_DELETED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: clientIp,
      user_agent: userAgent,
      request_path: requestPath,
      request_method: requestMethod,
      resource_type: 'legal_entity_identifier',
      resource_id: identifierId,
      action: 'delete',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to delete identifier' }
    };
  }
}

app.http('DeleteIdentifier', {
  methods: ['DELETE', 'OPTIONS'],
  route: 'v1/identifiers/{identifierId}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
