import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const pool = getPool();
  const legalEntityId = request.params.legalentityid;

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
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;
    const userRoles = request.userRoles || [];
    const pagination = getPaginationParams(request);

    // Admin can read contacts for any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const baseQuery = `
        SELECT legal_entity_contact_id, legal_entity_id, dt_created, dt_modified,
                created_by, modified_by, is_deleted, contact_type, first_name, last_name,
                email, phone, mobile, job_title, department, is_primary,
                CONCAT(first_name, ' ', last_name) as full_name
         FROM legal_entity_contact
         WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)
         ORDER BY is_primary DESC, last_name, first_name
      `;

      const result = await executePaginatedQuery(pool, baseQuery, [legalEntityId], pagination);

      // Log successful access
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
        resource_type: 'legal_entity_contact',
        resource_id: legalEntityId,
        action: 'read',
        details: { admin_access: true, count: result.pagination.totalItems }
      }, context);

      return {
        status: 200,
        jsonBody: result
      };
    }

    // Regular user: verify ownership before returning contacts
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
      // Log unauthorized access attempt
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
        resource_type: 'legal_entity_contact',
        resource_id: legalEntityId,
        action: 'read',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to access contacts for this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to access contacts for entity ${legalEntityId}`);

      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to access contacts for this entity' }
      };
    }

    // Return contacts with pagination
    const baseQuery = `
      SELECT legal_entity_contact_id, legal_entity_id, dt_created, dt_modified,
              created_by, modified_by, is_deleted, contact_type, first_name, last_name,
              email, phone, mobile, job_title, department, is_primary,
              CONCAT(first_name, ' ', last_name) as full_name
       FROM legal_entity_contact
       WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)
       ORDER BY is_primary DESC, last_name, first_name
    `;

    const result = await executePaginatedQuery(pool, baseQuery, [legalEntityId], pagination);

    // Log successful access
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
      resource_type: 'legal_entity_contact',
      resource_id: legalEntityId,
      action: 'read',
      details: { count: result.pagination.totalItems }
    }, context);

    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.error('Error fetching contacts:', error);

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
      resource_type: 'legal_entity_contact',
      resource_id: legalEntityId,
      action: 'read',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch contacts' }
    };
  }
}

app.http('GetContacts', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legalentityid}/contacts',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false // Either READ_ALL or READ_OWN
  })
});
