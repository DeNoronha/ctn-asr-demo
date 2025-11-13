import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  context.log('🔵 getEndpointsByEntity handler called');
  context.log('🔵 Method:', request.method);
  context.log('🔵 URL:', request.url);
  context.log('🔵 Params:', JSON.stringify(request.params));

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;

    context.log('🔵 Extracted legalEntityId:', legalEntityId);

    if (!legalEntityId) {
      context.warn('❌ Legal entity ID is missing from request params');
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

    context.log('✅ Found', result.rows.length, 'endpoints for legal_entity_id:', legalEntityId);

    return {
      status: 200,
      jsonBody: result.rows,
    };

  } catch (error: any) {
    context.error('❌ Error fetching endpoints:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch endpoints' },
    };
  }
}

app.http('getEndpointsByEntity', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/endpoints',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false // Either permission grants access
  }),
});
