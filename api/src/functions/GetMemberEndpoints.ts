import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMemberEndpoints function triggered');

  try {
    const pool = getPool();
    const { partyId } = request;

    // SECURITY: Require partyId from JWT token (prevent IDOR)
    if (!partyId) {
      context.warn('GetMemberEndpoints: Missing partyId in JWT token', { userEmail: request.userEmail });
      return { status: 403, body: JSON.stringify({ error: 'Forbidden: Missing party association' }) };
    }

    // Get member's legal_entity_id using partyId (NOT email)
    const memberResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      WHERE le.party_id = $1
      LIMIT 1
    `, [partyId]);

    if (memberResult.rows.length === 0) {
      context.warn('GetMemberEndpoints: Legal entity not found for partyId', { partyId });
      return { status: 404, body: JSON.stringify({ error: 'Member not found' }) };
    }

    const { legal_entity_id } = memberResult.rows[0];

    // Get all endpoints for this member's legal entity
    const result = await pool.query(`
      SELECT
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
        is_active,
        activation_date,
        deactivation_date,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1
      ORDER BY dt_created DESC
    `, [legal_entity_id]);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoints: result.rows
      })
    };
  } catch (error) {
    context.error('Error getting endpoints:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to get endpoints' })
    };
  }
}

app.http('GetMemberEndpoints', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member-endpoints',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
