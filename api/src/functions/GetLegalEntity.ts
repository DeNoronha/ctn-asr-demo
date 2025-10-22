import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';

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
    const userPermissions = request.userPermissions || [];

    // User with READ_ALL_ENTITIES permission can read any entity
    if (userPermissions.includes(Permission.READ_ALL_ENTITIES) ||
        hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await pool.query(
        `SELECT legal_entity_id, party_id, dt_created, dt_modified, created_by, modified_by,
                is_deleted, primary_legal_name, address_line1, address_line2, postal_code,
                city, province, country_code, entity_legal_form, registered_at,
                direct_parent_legal_entity_id, ultimate_parent_legal_entity_id
         FROM legal_entity
         WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)`,
        [legalEntityId]
      );

      if (result.rows.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Legal entity not found' }
        };
      }

      // Fetch identifiers for this entity
      const identifiersResult = await pool.query(
        `SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
                country_code, registry_name, registry_url, valid_from, valid_to, issued_by,
                validated_by, validation_status, validation_date, verification_document_url,
                verification_notes, dt_created, dt_modified, created_by, modified_by, is_deleted
         FROM legal_entity_number
         WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)
         ORDER BY dt_created DESC`,
        [legalEntityId]
      );

      const entity = result.rows[0];
      entity.identifiers = identifiersResult.rows;

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
        resource_type: 'legal_entity',
        resource_id: legalEntityId,
        action: 'read',
        details: { admin_access: true }
      }, context);

      return {
        status: 200,
        jsonBody: entity
      };
    }

    // Regular user: verify ownership
    const result = await pool.query(
      `SELECT le.legal_entity_id, le.party_id, le.dt_created, le.dt_modified, le.created_by, le.modified_by,
              le.is_deleted, le.primary_legal_name, le.address_line1, le.address_line2, le.postal_code,
              le.city, le.province, le.country_code, le.entity_legal_form, le.registered_at,
              le.direct_parent_legal_entity_id, le.ultimate_parent_legal_entity_id
       FROM legal_entity le
       JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
       WHERE le.legal_entity_id = $1
         AND c.email = $2
         AND c.is_active = true
         AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)`,
      [legalEntityId, userEmail]
    );

    if (result.rows.length === 0) {
      // Log potential IDOR attempt
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
        resource_type: 'legal_entity',
        resource_id: legalEntityId,
        action: 'read',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to access this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to access entity ${legalEntityId}`);

      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to access this entity' }
      };
    }

    // Fetch identifiers for this entity
    const identifiersResult = await pool.query(
      `SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
              country_code, registry_name, registry_url, valid_from, valid_to, issued_by,
              validated_by, validation_status, validation_date, verification_document_url,
              verification_notes, dt_created, dt_modified, created_by, modified_by, is_deleted
       FROM legal_entity_number
       WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)
       ORDER BY dt_created DESC`,
      [legalEntityId]
    );

    const entity = result.rows[0];
    entity.identifiers = identifiersResult.rows;

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
      resource_type: 'legal_entity',
      resource_id: legalEntityId,
      action: 'read'
    }, context);

    return {
      status: 200,
      jsonBody: entity
    };
  } catch (error) {
    context.error('Error fetching legal entity:', error);

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
      resource_type: 'legal_entity',
      resource_id: legalEntityId,
      action: 'read',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch legal entity' }
    };
  }
}

app.http('GetLegalEntity', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legalentityid}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false // Either READ_ALL or READ_OWN
  })
});
