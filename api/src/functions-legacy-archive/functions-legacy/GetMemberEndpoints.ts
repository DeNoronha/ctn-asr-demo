import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMemberEndpoints function triggered');

  try {
    const pool = getPool();
    const userEmail = request.userEmail;

    if (!userEmail) {
      context.warn('GetMemberEndpoints: Missing userEmail in request');
      return { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Get member's legal_entity_id using email (same pattern as GetAuthenticatedMember)
    // First try to find via contact email
    let memberResult = await pool.query(`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    // If not found, try by domain
    if (memberResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      memberResult = await pool.query(`
        SELECT m.legal_entity_id
        FROM v_members_full m
        WHERE m.domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (memberResult.rows.length === 0) {
      context.warn('GetMemberEndpoints: Legal entity not found for user', { userEmail });
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
        AND is_deleted = false
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
    return handleError(error, context);
  }
}

app.http('GetMemberEndpoints', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member-endpoints',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
