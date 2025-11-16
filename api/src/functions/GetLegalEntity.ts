import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission, hasAnyRole, UserRole } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { isValidUUID } from '../utils/validators';
import { handleError } from '../utils/errors';

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
  const isUUID = isValidUUID(legalEntityId);
  if (!isUUID) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format' }
    };
  }

  try {
    const userEmail = request.userEmail;
    const userRoles = request.userRoles || [];

    // Admin users can read any entity (permissions already validated by endpoint wrapper)
    if (hasAnyRole(request, [UserRole.SYSTEM_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
      const result = await pool.query(
        `SELECT le.legal_entity_id, le.party_id, le.dt_created, le.dt_modified, le.created_by, le.modified_by,
                le.is_deleted, le.primary_legal_name, le.address_line1, le.address_line2, le.postal_code,
                le.city, le.province, le.country_code, le.entity_legal_form, le.registered_at,
                le.direct_parent_legal_entity_id, le.ultimate_parent_legal_entity_id,
                le.kvk_document_url, le.kvk_verification_status, le.kvk_verified_at, le.kvk_verified_by,
                le.kvk_verification_notes, le.kvk_extracted_company_name, le.kvk_extracted_number,
                le.kvk_api_response, le.kvk_mismatch_flags, le.document_uploaded_at,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'legal_entity_reference_id', len.legal_entity_reference_id,
                      'legal_entity_id', len.legal_entity_id,
                      'identifier_type', len.identifier_type,
                      'identifier_value', len.identifier_value,
                      'country_code', len.country_code,
                      'registry_name', len.registry_name,
                      'registry_url', len.registry_url,
                      'valid_from', len.valid_from,
                      'valid_to', len.valid_to,
                      'issued_by', len.issued_by,
                      'validated_by', len.validated_by,
                      'validation_status', len.validation_status,
                      'validation_date', len.validation_date,
                      'verification_document_url', len.verification_document_url,
                      'verification_notes', len.verification_notes,
                      'dt_created', len.dt_created,
                      'dt_modified', len.dt_modified,
                      'created_by', len.created_by,
                      'modified_by', len.modified_by,
                      'is_deleted', len.is_deleted
                    ) ORDER BY len.dt_created DESC
                  ) FILTER (WHERE len.legal_entity_reference_id IS NOT NULL),
                  '[]'
                ) as identifiers
         FROM legal_entity le
         LEFT JOIN legal_entity_number len
           ON len.legal_entity_id = le.legal_entity_id
           AND (len.is_deleted IS NULL OR len.is_deleted = FALSE)
         WHERE le.legal_entity_id = $1 AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)
         GROUP BY le.legal_entity_id`,
        [legalEntityId]
      );

      if (result.rows.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'Legal entity not found' }
        };
      }

      const entity = result.rows[0];

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
              le.direct_parent_legal_entity_id, le.ultimate_parent_legal_entity_id,
              le.kvk_document_url, le.kvk_verification_status, le.kvk_verified_at, le.kvk_verified_by,
              le.kvk_verification_notes, le.kvk_extracted_company_name, le.kvk_extracted_number,
              le.kvk_api_response, le.kvk_mismatch_flags, le.document_uploaded_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'legal_entity_reference_id', len.legal_entity_reference_id,
                    'legal_entity_id', len.legal_entity_id,
                    'identifier_type', len.identifier_type,
                    'identifier_value', len.identifier_value,
                    'country_code', len.country_code,
                    'registry_name', len.registry_name,
                    'registry_url', len.registry_url,
                    'valid_from', len.valid_from,
                    'valid_to', len.valid_to,
                    'issued_by', len.issued_by,
                    'validated_by', len.validated_by,
                    'validation_status', len.validation_status,
                    'validation_date', len.validation_date,
                    'verification_document_url', len.verification_document_url,
                    'verification_notes', len.verification_notes,
                    'dt_created', len.dt_created,
                    'dt_modified', len.dt_modified,
                    'created_by', len.created_by,
                    'modified_by', len.modified_by,
                    'is_deleted', len.is_deleted
                  ) ORDER BY len.dt_created DESC
                ) FILTER (WHERE len.legal_entity_reference_id IS NOT NULL),
                '[]'
              ) as identifiers
       FROM legal_entity le
       JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
       LEFT JOIN legal_entity_number len
         ON len.legal_entity_id = le.legal_entity_id
         AND (len.is_deleted IS NULL OR len.is_deleted = FALSE)
       WHERE le.legal_entity_id = $1
         AND c.email = $2
         AND c.is_active = true
         AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)
       GROUP BY le.legal_entity_id`,
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

    const entity = result.rows[0];

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

    return handleError(error, context);
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
