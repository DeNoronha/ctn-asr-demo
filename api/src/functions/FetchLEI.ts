import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { fetchLeiForOrganization, isValidLeiFormat } from '../services/leiService';
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

/**
 * FetchLEI Function
 *
 * Fetches LEI (Legal Entity Identifier) from GLEIF API using an existing
 * registration identifier (KVK, HRB, etc.) and optionally saves it to the database.
 *
 * POST /v1/entities/{legalentityid}/identifiers/fetch-lei
 *
 * Request body:
 * {
 *   "identifier_type": "KVK",
 *   "identifier_value": "12345678",
 *   "country_code": "NL",
 *   "save_to_database": true  // optional, default true
 * }
 *
 * Response:
 * {
 *   "lei": "724500VKKSH9QOLTFR81",
 *   "legal_name": "Example Company B.V.",
 *   "registration_authority": "NL-KVK",
 *   "status": "found",
 *   "was_saved": true,
 *   "identifier_id": "uuid-of-lei-record"
 * }
 */
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
    if (!body.identifier_type || !body.identifier_value || !body.country_code) {
      return {
        status: 400,
        jsonBody: {
          error: 'identifier_type, identifier_value, and country_code are required',
          example: {
            identifier_type: 'KVK',
            identifier_value: '12345678',
            country_code: 'NL',
            save_to_database: true
          }
        }
      };
    }

    const saveToDatabase = body.save_to_database !== false; // Default true

    context.log(`Fetching LEI for ${body.identifier_type} ${body.identifier_value} (${body.country_code})`);

    // Check if LEI already exists for this entity
    const existingLeiQuery = await pool.query(
      `SELECT legal_entity_reference_id, identifier_value
       FROM legal_entity_number
       WHERE legal_entity_id = $1
         AND identifier_type = 'LEI'
         AND is_deleted = false
       LIMIT 1`,
      [legalEntityId]
    );

    if (existingLeiQuery.rows.length > 0) {
      const existingLei = existingLeiQuery.rows[0];
      context.log(`LEI already exists for entity: ${existingLei.identifier_value}`);

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
        resource_type: 'lei',
        resource_id: existingLei.legal_entity_reference_id,
        action: 'fetch',
        details: {
          legal_entity_id: legalEntityId,
          status: 'already_exists',
          lei: existingLei.identifier_value
        }
      }, context);

      return {
        status: 200,
        jsonBody: {
          lei: existingLei.identifier_value,
          status: 'already_exists',
          was_saved: false,
          identifier_id: existingLei.legal_entity_reference_id,
          message: 'LEI already exists for this entity'
        }
      };
    }

    // Fetch LEI from GLEIF API
    const result = await fetchLeiForOrganization(
      body.identifier_value,
      body.country_code,
      body.identifier_type,
      context
    );

    if (result.status === 'not_found') {
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
        resource_type: 'lei',
        resource_id: legalEntityId,
        action: 'fetch',
        details: {
          legal_entity_id: legalEntityId,
          status: 'not_found',
          attempts: result.attempts,
          message: result.message
        }
      }, context);

      return {
        status: 404,
        jsonBody: {
          lei: null,
          status: 'not_found',
          was_saved: false,
          message: result.message,
          attempts: result.attempts
        }
      };
    }

    // LEI found - save to database if requested
    let identifierId: string | null = null;
    let wasSaved = false;

    if (saveToDatabase && result.lei) {
      try {
        context.log(`Saving LEI ${result.lei} to database...`);

        const insertResult = await pool.query(
          `INSERT INTO legal_entity_number
           (legal_entity_id, identifier_type, identifier_value, country_code,
            registry_name, registry_url, validation_status, verification_notes,
            created_by, dt_created, dt_modified)
           VALUES ($1, 'LEI', $2, $3, $4, $5, 'VALIDATED', $6, $7,
                   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING legal_entity_reference_id`,
          [
            legalEntityId,
            result.lei,
            body.country_code,
            'Global Legal Entity Identifier Foundation (GLEIF)',
            'https://search.gleif.org/',
            `Fetched from GLEIF API using ${result.registration_authority}: ${result.registration_number}`,
            request.userEmail || 'system'
          ]
        );

        identifierId = insertResult.rows[0].legal_entity_reference_id;
        wasSaved = true;
        context.log(`✓ LEI saved to database: ${identifierId}`);

      } catch (dbError) {
        context.error('Failed to save LEI to database:', dbError);
        // Continue - return the LEI even if save failed
      }
    }

    // Log successful fetch
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
      resource_type: 'lei',
      resource_id: identifierId || legalEntityId,
      action: 'fetch',
      details: {
        legal_entity_id: legalEntityId,
        lei: result.lei,
        legal_name: result.legal_name,
        registration_authority: result.registration_authority,
        status: 'found',
        was_saved: wasSaved,
        attempts: result.attempts
      }
    }, context);

    return {
      status: 200,
      jsonBody: {
        lei: result.lei,
        legal_name: result.legal_name,
        registration_authority: result.registration_authority,
        registration_number: result.registration_number,
        country: result.country,
        status: 'found',
        was_saved: wasSaved,
        identifier_id: identifierId,
        attempts: result.attempts,
        message: result.message
      }
    };

  } catch (error: any) {
    context.error('Error fetching LEI:', error);

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
      resource_type: 'lei',
      resource_id: legalEntityId,
      action: 'fetch',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch LEI',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      }
    };
  }
}

app.http('FetchLEI', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/entities/{legalentityid}/identifiers/fetch-lei',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false // Either UPDATE_ALL or UPDATE_OWN
  })
});
