import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { syncEuidForEntity, supportsEuidGeneration } from '../services/euidService';
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

/**
 * GenerateEUID Function
 *
 * Automatically generates and saves an EUID (European Unique Identifier)
 * based on a national identifier (e.g., KvK number).
 *
 * POST /v1/entities/{legalentityid}/identifiers/generate-euid
 *
 * Request body:
 * {
 *   "identifier_type": "KVK",
 *   "identifier_value": "12345678"
 * }
 *
 * Response:
 * {
 *   "euid_value": "NL.KVK.12345678",
 *   "source_identifier_type": "KVK",
 *   "source_identifier_value": "12345678",
 *   "country_code": "NL",
 *   "was_created": true,
 *   "was_updated": false,
 *   "identifier_id": "uuid-of-euid-record"
 * }
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
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
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legalEntityId);
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
        jsonBody: {
          error: 'identifier_type and identifier_value are required',
          example: {
            identifier_type: 'KVK',
            identifier_value: '12345678'
          }
        }
      };
    }

    // Check if identifier type supports EUID generation
    if (!supportsEuidGeneration(body.identifier_type)) {
      return {
        status: 400,
        jsonBody: {
          error: `EUID generation not supported for identifier type: ${body.identifier_type}`,
          supported_types: ['KVK', 'HRB', 'HRA', 'KBO', 'SIREN', 'CRN']
        }
      };
    }

    // Generate and sync EUID
    const result = await syncEuidForEntity(
      legalEntityId,
      body.identifier_type,
      body.identifier_value,
      request.userEmail || 'system',
      context
    );

    // Log successful generation
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
      resource_type: 'euid',
      resource_id: result.identifier_id || 'unknown',
      action: result.was_created ? 'create' : result.was_updated ? 'update' : 'read',
      details: {
        legal_entity_id: legalEntityId,
        euid_value: result.euid_value,
        source_identifier: `${result.source_identifier_type}:${result.source_identifier_value}`,
        was_created: result.was_created,
        was_updated: result.was_updated
      }
    }, context);

    return {
      status: result.was_created ? 201 : 200,
      jsonBody: result
    };

  } catch (error: any) {
    context.error('Error generating EUID:', error);

    // Log error
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
      resource_type: 'euid',
      resource_id: legalEntityId,
      action: 'create',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, context);

    // Check for validation errors
    if (error instanceof Error && error.message.includes('Invalid')) {
      return {
        status: 400,
        jsonBody: {
          error: 'Validation error',
          details: error.message
        }
      };
    }

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to generate EUID',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GenerateEUID', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/entities/{legalentityid}/identifiers/generate-euid',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
