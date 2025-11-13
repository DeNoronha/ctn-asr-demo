import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import { isValidUUID } from '../utils/validators';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('=== CreateIdentifierSimple called ===');
  const pool = getPool();
  const legalEntityId = request.params.legalentityid;

  context.log('Legal Entity ID from URL:', legalEntityId);

  if (!legalEntityId) {
    context.log('ERROR: No legal entity ID in URL');
    return {
      status: 400,
      jsonBody: { error: 'legal_entity_id parameter is required' }
    };
  }

  // Validate UUID format
  const isUUID = isValidUUID(legalEntityId);
  if (!isUUID) {
    context.log('ERROR: Invalid UUID format');
    return {
      status: 400,
      jsonBody: { error: 'Invalid UUID format for legal_entity_id' }
    };
  }

  try {
    const body = await request.json() as any;
    context.log('Request body:', JSON.stringify(body));

    // Validate required fields
    if (!body.identifier_type || !body.identifier_value) {
      context.log('ERROR: Missing required fields');
      return {
        status: 400,
        jsonBody: { error: 'identifier_type and identifier_value are required' }
      };
    }

    context.log('Attempting to insert identifier:', body.identifier_type, body.identifier_value);

    // Insert the identifier
    const result = await pool.query(
      `INSERT INTO legal_entity_number
       (legal_entity_id, identifier_type, identifier_value, country_code,
        registry_name, registry_url, validation_status,
        created_by, dt_created, dt_modified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        legalEntityId,
        body.identifier_type,
        body.identifier_value,
        body.country_code || null,
        body.registry_name || null,
        body.registry_url || null,
        body.validation_status || 'PENDING',
        request.userEmail || 'system'
      ]
    );

    context.log('SUCCESS: Identifier created:', result.rows[0].legal_entity_reference_id);

    return {
      status: 201,
      jsonBody: result.rows[0]
    };
  } catch (error: any) {
    context.error('=== ERROR in CreateIdentifierSimple ===');
    context.error('Error message:', error.message);
    context.error('Error code:', error.code);
    context.error('Error detail:', error.detail);
    context.error('Error stack:', error.stack);

    // Check for foreign key constraint violation
    if (error.code === '23503') {
      context.log('Foreign key violation - entity not found');
      return {
        status: 404,
        jsonBody: {
          error: 'Legal entity not found',
          legal_entity_id: legalEntityId,
          db_error: error.message
        }
      };
    }

    // Check for unique constraint violation
    if (error.code === '23505') {
      context.log('Unique constraint violation - duplicate');
      return {
        status: 409,
        jsonBody: {
          error: 'This identifier already exists for this entity',
          db_error: error.message
        }
      };
    }

    // Return detailed error
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to create identifier',
        details: error.message,
        error_code: error.code,
        error_detail: error.detail,
        legal_entity_id: legalEntityId
      }
    };
  }
}

app.http('CreateIdentifierSimple', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/entities/{legalentityid}/identifiers-test',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY, Permission.UPDATE_ALL_ENTITIES],
    requireAllPermissions: false
  })
});
