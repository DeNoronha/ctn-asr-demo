import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalEntityId;

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

app.http('getEndpointsByEntity', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/endpoints',
  handler: memberEndpoint(handler),
});
