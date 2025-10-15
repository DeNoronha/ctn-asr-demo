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
    const body = await request.json() as any;
    const userEmail = request.userEmail;
    const userRoles = request.userRoles || [];

    // Admin can update any entity
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await pool.query(
        `UPDATE legal_entity
         SET primary_legal_name = COALESCE($1, primary_legal_name),
             address_line1 = COALESCE($2, address_line1),
             address_line2 = COALESCE($3, address_line2),
             postal_code = COALESCE($4, postal_code),
             city = COALESCE($5, city),
             province = COALESCE($6, province),
             country_code = COALESCE($7, country_code),
             entity_legal_form = COALESCE($8, entity_legal_form),
             registered_at = COALESCE($9, registered_at),
             dt_modified = CURRENT_TIMESTAMP,
             modified_by = $10
         WHERE legal_entity_id = $11 AND (is_deleted IS NULL OR is_deleted = FALSE)
         RETURNING *`,
        [
          body.primary_legal_name,
          body.address_line1,
          body.address_line2,
          body.postal_code,
          body.city,
          body.province,
          body.country_code,
          body.entity_legal_form,
          body.registered_at,
          userEmail,
          legalEntityId
        ]
      );

      if (result.rows.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Legal entity not found' }
        };
      }

      // Log successful update
      await logAuditEvent({
        event_type: AuditEventType.MEMBER_UPDATED,
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
        action: 'update',
        details: { admin_access: true, changes: body }
      }, context);

      return {
        status: 200,
        jsonBody: result.rows[0]
      };
    }

    // Regular user: verify ownership before update
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
      // Log unauthorized update attempt
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
        action: 'update',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to update this entity'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to update entity ${legalEntityId}`);

      return {
        status: 403,
        jsonBody: { error: 'You do not have permission to update this entity' }
      };
    }

    // Perform the update
    const result = await pool.query(
      `UPDATE legal_entity
       SET primary_legal_name = COALESCE($1, primary_legal_name),
           address_line1 = COALESCE($2, address_line1),
           address_line2 = COALESCE($3, address_line2),
           postal_code = COALESCE($4, postal_code),
           city = COALESCE($5, city),
           province = COALESCE($6, province),
           country_code = COALESCE($7, country_code),
           entity_legal_form = COALESCE($8, entity_legal_form),
           registered_at = COALESCE($9, registered_at),
           dt_modified = CURRENT_TIMESTAMP,
           modified_by = $10
       WHERE legal_entity_id = $11 AND (is_deleted IS NULL OR is_deleted = FALSE)
       RETURNING *`,
      [
        body.primary_legal_name,
        body.address_line1,
        body.address_line2,
        body.postal_code,
        body.city,
        body.province,
        body.country_code,
        body.entity_legal_form,
        body.registered_at,
        userEmail,
        legalEntityId
      ]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found' }
      };
    }

    // Log successful update
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
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
      action: 'update',
      details: { changes: body }
    }, context);

    return {
      status: 200,
      jsonBody: result.rows[0]
    };
  } catch (error) {
    context.error('Error updating legal entity:', error);

    // Log error
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
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
      action: 'update',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to update legal entity' }
    };
  }
}

app.http('UpdateLegalEntity', {
  methods: ['PUT'],
  route: 'v1/legal-entities/{legalentityid}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
