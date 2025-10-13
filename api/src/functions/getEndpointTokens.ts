import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const endpointId = request.params.endpointId;

    if (!endpointId) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint ID is required' },
      };
    }

    const result = await pool.query(
      `SELECT
        endpoint_authorization_id,
        legal_entity_endpoint_id,
        token_type,
        issued_at,
        expires_at,
        revoked_at,
        revocation_reason,
        is_active,
        last_used_at,
        usage_count,
        issued_by
       FROM endpoint_authorization
       WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
       ORDER BY issued_at DESC`,
      [endpointId]
    );

    return {
      status: 200,
      jsonBody: result.rows,
    };

  } catch (error: any) {
    context.error('Error fetching tokens:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch tokens' },
    };
  }
}

app.http('getEndpointTokens', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/endpoints/{endpointId}/tokens',
  handler: memberEndpoint(handler),
});
