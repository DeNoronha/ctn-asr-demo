import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function getEndpointsByEntity(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const legalEntityId = request.params.legalEntityId;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
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
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error fetching endpoints:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch endpoints' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('getEndpointsByEntity', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/endpoints',
  handler: getEndpointsByEntity,
});
