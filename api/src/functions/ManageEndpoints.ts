import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';

// =====================================================
// Handler: Get Endpoints by Legal Entity
// =====================================================
async function getEndpointsByEntityHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
      };
    }

    const result = await pool.query(
      `SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        connection_test_details,
        is_active,
        activation_date,
        deactivation_date,
        deactivation_reason,
        dt_created,
        dt_modified
       FROM legal_entity_endpoint
       WHERE legal_entity_id = $1 AND is_deleted = false
       ORDER BY dt_created DESC`,
      [legalEntityId]
    );

    return {
      status: 200,
      jsonBody: result.rows,
    };

  } catch (error: any) {
    return handleError(error, context);
  }
}

// =====================================================
// Handler: Create Endpoint
// =====================================================
async function createEndpointHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;
    const body = await request.json() as any;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
      };
    }

    // Validate required fields
    if (!body.endpoint_name) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint name is required' },
      };
    }

    // Verify legal entity exists
    const entityCheck = await pool.query(
      'SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false',
      [legalEntityId]
    );

    if (entityCheck.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found' },
      };
    }

    // Create endpoint
    const result = await pool.query(
      `INSERT INTO legal_entity_endpoint (
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        is_active,
        activation_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        legalEntityId,
        body.endpoint_name,
        body.endpoint_url || null,
        body.endpoint_description || null,
        body.data_category || null,
        body.endpoint_type || 'REST_API',
        body.authentication_method || 'TOKEN',
        body.is_active !== undefined ? body.is_active : true,
        body.is_active !== false ? new Date() : null,
        request.userEmail || 'SYSTEM'
      ]
    );

    // Log audit event using standardized middleware
    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      user_id: request.userId,
      user_email: request.userEmail,
      resource_type: 'legal_entity_endpoint',
      resource_id: result.rows[0].legal_entity_endpoint_id,
      action: 'create',
      result: 'success',
      details: {
        endpoint_name: body.endpoint_name,
        legal_entity_id: legalEntityId,
        created_by: request.userEmail
      }
    }, context);

    return {
      status: 201,
      jsonBody: result.rows[0],
    };

  } catch (error: any) {
    return handleError(error, context);
  }
}

// =====================================================
// Route Registrations (BOTH in same file)
// =====================================================

// GET endpoints for a legal entity
app.http('GetEndpointsByEntity', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: wrapEndpoint(getEndpointsByEntityHandler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false // Either permission grants access
  }),
});

// POST create new endpoint for a legal entity
app.http('CreateEndpoint', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: memberEndpoint(createEndpointHandler),
});
