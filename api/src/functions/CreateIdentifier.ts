import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { syncEuidForEntity, supportsEuidGeneration } from '../services/euidService';
import { isValidUUID } from '../utils/validators';
import { handleError } from '../utils/errors';

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: any, name: string): string | null {
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
  const legalEntityId = request.params.legalentityid;

  // Extract request metadata for audit logging
  const clientIp = safeGetHeader(request.headers, 'x-forwarded-for')?.split(',')[0].trim();
  const userAgent = safeGetHeader(request.headers, 'user-agent');
  const requestPath = request.url;
  const requestMethod = request.method;

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
      jsonBody: { error: 'Invalid UUID format for legal_entity_id' }
    };
  }

  try {
    const body = await request.json() as any;

    // Validate required fields
    if (!body.identifier_type || !body.identifier_value) {
      return {
        status: 400,
        jsonBody: { error: 'identifier_type and identifier_value are required' }
      };
    }

    // Validate identifier_type enum
    const validTypes = ['LEI', 'KVK', 'EORI', 'VAT', 'DUNS', 'EUID', 'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER'];
    if (!validTypes.includes(body.identifier_type)) {
      return {
        status: 400,
        jsonBody: { error: `Invalid identifier_type. Must be one of: ${validTypes.join(', ')}` }
      };
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

    // Insert the identifier
    const result = await pool.query(
      `INSERT INTO legal_entity_number
       (legal_entity_id, identifier_type, identifier_value, country_code,
        registry_name, registry_url, valid_from, valid_to, issued_by, validated_by,
        validation_status, validation_date, verification_document_url, verification_notes,
        created_by, dt_created, dt_modified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        legalEntityId,
        body.identifier_type,
        body.identifier_value,
        body.country_code || null,
        body.registry_name || null,
        body.registry_url || null,
        body.valid_from || null,
        body.valid_to || null,
        body.issued_by || null,
        body.validated_by || null,
        body.validation_status || 'PENDING',
        body.validation_date || null,
        body.verification_document_url || null,
        body.verification_notes || null,
        request.userEmail || 'system'
      ]
    );

    // Log successful creation
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: clientIp,
      user_agent: userAgent,
      request_path: requestPath,
      request_method: requestMethod,
      resource_type: 'legal_entity_identifier',
      resource_id: result.rows[0].legal_entity_reference_id,
      action: 'create',
      details: {
        legal_entity_id: legalEntityId,
        identifier_type: body.identifier_type,
        identifier_value: body.identifier_value
      }
    }, context);

    // Auto-generate EUID if applicable (KVK, HRB, HRA, KBO, SIREN, CRN)
    let euidGenerated = false;
    if (supportsEuidGeneration(body.identifier_type)) {
      try {
        context.log(`Auto-generating EUID for ${body.identifier_type}: ${body.identifier_value}`);
        await syncEuidForEntity(
          legalEntityId,
          body.identifier_type,
          body.identifier_value,
          request.userEmail || 'system',
          context
        );
        euidGenerated = true;
        context.log(`✓ EUID auto-generated successfully`);
      } catch (euidError) {
        // Log warning but don't fail the main operation
        context.warn('Failed to auto-generate EUID:', euidError);
        await logAuditEvent({
          event_type: AuditEventType.IDENTIFIER_CREATED,
          severity: AuditSeverity.WARNING,
          result: 'failure',
          user_id: request.userId,
          user_email: request.userEmail,
          ip_address: clientIp,
          user_agent: userAgent,
          request_path: requestPath,
          request_method: requestMethod,
          resource_type: 'euid',
          resource_id: legalEntityId,
          action: 'auto_generate',
          error_message: euidError instanceof Error ? euidError.message : 'Unknown error',
          details: {
            reason: 'euid_auto_generation_failed',
            source_identifier: `${body.identifier_type}:${body.identifier_value}`
          }
        }, context);
      }
    }

    return {
      status: 201,
      jsonBody: {
        ...result.rows[0],
        euid_auto_generated: euidGenerated
      }
    };
  } catch (error: any) {
    context.error('Error creating identifier:', error);
    context.error('Error code:', error.code);
    context.error('Error detail:', error.detail);

    // Check for foreign key constraint violation
    if (error.code === '23503') {
      await logAuditEvent({
        event_type: AuditEventType.IDENTIFIER_CREATED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        request_path: requestPath,
        request_method: requestMethod,
        resource_type: 'legal_entity_identifier',
        resource_id: legalEntityId,
        action: 'create',
        error_message: 'Legal entity not found',
        details: { reason: 'foreign_key_violation', legal_entity_id: legalEntityId }
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found', legal_entity_id: legalEntityId }
      };
    }

    // Check for unique constraint violation
    if (error.code === '23505') {
      await logAuditEvent({
        event_type: AuditEventType.IDENTIFIER_CREATED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: clientIp,
        user_agent: userAgent,
        request_path: requestPath,
        request_method: requestMethod,
        resource_type: 'legal_entity_identifier',
        resource_id: legalEntityId,
        action: 'create',
        error_message: 'Duplicate identifier',
        details: { reason: 'unique_constraint_violation' }
      }, context);

      return {
        status: 409,
        jsonBody: { error: 'This identifier already exists for this entity' }
      };
    }

    // Log error with full details
    await logAuditEvent({
      event_type: AuditEventType.IDENTIFIER_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: clientIp,
      user_agent: userAgent,
      request_path: requestPath,
      request_method: requestMethod,
      resource_type: 'legal_entity_identifier',
      resource_id: legalEntityId,
      action: 'create',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        error_code: error.code,
        error_detail: error.detail
      }
    }, context);

    return handleError(error, context);
  }
}

app.http('CreateIdentifier', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/entities/{legalentityid}/identifiers',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
