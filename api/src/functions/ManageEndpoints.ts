import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';

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
    context.error('Error fetching endpoints:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch endpoints' },
    };
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

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'ENDPOINT_MANAGEMENT',
        legalEntityId,
        'legal_entity_endpoint',
        result.rows[0].legal_entity_endpoint_id,
        'CREATE',
        'SUCCESS',
        JSON.stringify({ endpoint_name: body.endpoint_name, created_by: request.userEmail })
      ]
    );

    return {
      status: 201,
      jsonBody: result.rows[0],
    };

  } catch (error: any) {
    context.error('Error creating endpoint:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create endpoint', details: error.message },
    };
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
