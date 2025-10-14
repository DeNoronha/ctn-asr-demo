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
    const body = await request.json() as any;

    // Validate identifier_type if provided
    if (body.identifier_type) {
      const validTypes = ['LEI', 'KVK', 'EORI', 'VAT', 'DUNS', 'EUID', 'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER'];
      if (!validTypes.includes(body.identifier_type)) {
        return {
          status: 400,
          jsonBody: { error: `Invalid identifier_type. Must be one of: ${validTypes.join(', ')}` }
        };
      }
    }

    // Validate validation_status if provided
    if (body.validation_status) {
      const validStatuses = ['PENDING', 'VALIDATED', 'FAILED', 'EXPIRED'];
      if (!validStatuses.includes(body.validation_status)) {
        return {
          status: 400,
          jsonBody: { error: `Invalid validation_status. Must be one of: ${validStatuses.join(', ')}` }
        };
      }
    }

    const result = await pool.query(
      `UPDATE legal_entity_number
       SET identifier_type = COALESCE($1, identifier_type),
           identifier_value = COALESCE($2, identifier_value),
           country_code = COALESCE($3, country_code),
           registry_name = COALESCE($4, registry_name),
           registry_url = COALESCE($5, registry_url),
           valid_from = COALESCE($6, valid_from),
           valid_to = COALESCE($7, valid_to),
           issued_by = COALESCE($8, issued_by),
           validated_by = COALESCE($9, validated_by),
           validation_status = COALESCE($10, validation_status),
           validation_date = COALESCE($11, validation_date),
           verification_document_url = COALESCE($12, verification_document_url),
           verification_notes = COALESCE($13, verification_notes),
           dt_modified = CURRENT_TIMESTAMP,
           modified_by = $14
       WHERE legal_entity_reference_id = $15
       RETURNING *`,
      [
        body.identifier_type,
        body.identifier_value,
        body.country_code,
        body.registry_name,
        body.registry_url,
        body.valid_from,
        body.valid_to,
        body.issued_by,
        body.validated_by,
        body.validation_status,
        body.validation_date,
        body.verification_document_url,
        body.verification_notes,
        request.userEmail || 'system',
        identifierId
      ]
    );

    if (result.rows.length === 0) {
      // Log not found
      await logAuditEvent({
        event_type: AuditEventType.IDENTIFIER_UPDATED,
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
        action: 'update',
        error_message: 'Identifier not found',
        details: { reason: 'not_found' }
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Identifier not found' }
      };
    }

    // Log successful update
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_UPDATED,
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
      action: 'update',
      details: {
        identifier_type: result.rows[0].identifier_type,
        identifier_value: result.rows[0].identifier_value
      }
    }, context);

    return {
      status: 200,
      jsonBody: result.rows[0]
    };
  } catch (error: any) {
    context.error('Error updating identifier:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      await logAuditEvent({
        event_type: AuditEventType.IDENTIFIER_UPDATED,
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
        action: 'update',
        error_message: 'Duplicate identifier',
        details: { reason: 'unique_constraint_violation' }
      }, context);

      return {
        status: 409,
        jsonBody: { error: 'This identifier already exists for this entity' }
      };
    }

    // Log error
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_UPDATED,
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
      action: 'update',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to update identifier' }
    };
  }
}

app.http('UpdateIdentifier', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/identifiers/{identifierId}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
