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

// List endpoints for entity
export async function ListEndpoints(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const legal_entity_id = request.params.legal_entity_id;
    const result = await pool.query(
      'SELECT * FROM legal_entity_endpoint WHERE legal_entity_id = $1 AND is_deleted = false',
      [legal_entity_id]
    );
    return { status: 200, jsonBody: result.rows };
  } catch (error: any) {
    return { status: 500, jsonBody: { error: error.message } };
  }
}

app.http('ListEndpoints', {
  methods: ['GET'],
  route: 'v1/entities/{legal_entity_id}/endpoints',
  authLevel: 'anonymous',
  handler: ListEndpoints,
});

// Create endpoint
export async function CreateEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const legal_entity_id = request.params.legal_entity_id;
    const body = await request.json() as any;
    
    const result = await pool.query(
      `INSERT INTO legal_entity_endpoint (
        legal_entity_id, endpoint_name, endpoint_url, data_category, 
        endpoint_type, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
      [legal_entity_id, body.endpoint_name, body.endpoint_url, body.data_category, 
       body.endpoint_type || 'REST_API', body.created_by || 'api']
    );
    
    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    return { status: 500, jsonBody: { error: error.message } };
  }
}

app.http('CreateEndpoint', {
  methods: ['POST'],
  route: 'v1/entities/{legal_entity_id}/endpoints',
  authLevel: 'anonymous',
  handler: CreateEndpoint,
});

// Issue token for endpoint
export async function IssueTokenForEndpoint(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const endpoint_id = request.params.endpoint_id;
    const token_value = `BVAD_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const result = await pool.query(
      `INSERT INTO endpoint_authorization (
        legal_entity_endpoint_id, token_value, token_type, 
        issued_at, expires_at, is_active, issued_by
      ) VALUES ($1, $2, 'BVAD', NOW(), NOW() + INTERVAL '1 year', true, 'api') 
      RETURNING *`,
      [endpoint_id, token_value]
    );
    
    return { status: 201, jsonBody: result.rows[0] };
  } catch (error: any) {
    return { status: 500, jsonBody: { error: error.message } };
  }
}

app.http('IssueTokenForEndpoint', {
  methods: ['POST'],
  route: 'v1/endpoints/{endpoint_id}/tokens',
  authLevel: 'anonymous',
  handler: IssueTokenForEndpoint,
});
