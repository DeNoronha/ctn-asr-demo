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

export async function createEndpoint(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const legalEntityId = request.params.legalEntityId;
    const body = await request.json() as any;

    if (!legalEntityId) {
      return {
        status: 400,
        jsonBody: { error: 'Legal entity ID is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Validate required fields
    if (!body.endpoint_name) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint name is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
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
        headers: { 'Access-Control-Allow-Origin': '*' },
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
        body.created_by || 'SYSTEM'
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
        JSON.stringify({ endpoint_name: body.endpoint_name })
      ]
    );

    return {
      status: 201,
      jsonBody: result.rows[0],
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error creating endpoint:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create endpoint', details: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('createEndpoint', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/endpoints',
  handler: createEndpoint,
});
