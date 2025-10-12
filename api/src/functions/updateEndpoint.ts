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

export async function updateEndpoint(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const endpointId = request.params.endpointId;
    const body = await request.json() as any;

    if (!endpointId) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint ID is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const result = await pool.query(
      `UPDATE legal_entity_endpoint
       SET endpoint_name = COALESCE($1, endpoint_name),
           endpoint_url = COALESCE($2, endpoint_url),
           endpoint_description = COALESCE($3, endpoint_description),
           data_category = COALESCE($4, data_category),
           endpoint_type = COALESCE($5, endpoint_type),
           authentication_method = COALESCE($6, authentication_method),
           is_active = COALESCE($7, is_active),
           deactivation_date = CASE WHEN $8 = false THEN NOW() ELSE deactivation_date END,
           deactivation_reason = COALESCE($9, deactivation_reason),
           modified_by = $10
       WHERE legal_entity_endpoint_id = $11 AND is_deleted = false
       RETURNING *`,
      [
        body.endpoint_name || null,
        body.endpoint_url || null,
        body.endpoint_description || null,
        body.data_category || null,
        body.endpoint_type || null,
        body.authentication_method || null,
        body.is_active,
        body.is_active,
        body.deactivation_reason || null,
        body.modified_by || 'SYSTEM',
        endpointId
      ]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    return {
      status: 200,
      jsonBody: result.rows[0],
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error updating endpoint:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to update endpoint' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('updateEndpoint', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/endpoints/{endpointId}',
  handler: updateEndpoint,
});
