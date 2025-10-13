import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Pool } from 'pg';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMemberEndpoints function triggered');

  try {
    const userEmail = request.userEmail;

    // Get member's legal_entity_id
    const memberResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
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
