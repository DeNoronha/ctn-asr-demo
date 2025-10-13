import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const endpointId = request.params.endpointId;
    const body = await request.json() as any;

    if (!endpointId) {
      return {
        status: 400,
        jsonBody: { error: 'Endpoint ID is required' },
      };
    }

    // Verify endpoint exists and is active
    const endpointCheck = await pool.query(
      `SELECT lee.legal_entity_endpoint_id, lee.endpoint_name, lee.legal_entity_id, le.primary_legal_name
       FROM legal_entity_endpoint lee
       JOIN legal_entity le ON lee.legal_entity_id = le.legal_entity_id
       WHERE lee.legal_entity_endpoint_id = $1
         AND lee.is_deleted = false
         AND lee.is_active = true`,
      [endpointId]
    );

    if (endpointCheck.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'Endpoint not found or inactive' },
      };
    }

    const endpoint = endpointCheck.rows[0];

    // Generate token
    const tokenValue = `bvad_${uuidv4().replace(/-/g, '')}`;
    const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');

    // Calculate expiry date (default 1 year)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert token
    const result = await pool.query(
      `INSERT INTO endpoint_authorization (
        legal_entity_endpoint_id,
        token_value,
        token_type,
        token_hash,
        issued_at,
        expires_at,
        is_active,
        issued_by
      ) VALUES ($1, $2, $3, $4, NOW(), $5, true, $6)
      RETURNING endpoint_authorization_id, issued_at, expires_at, is_active`,
      [
        endpointId,
        tokenValue,
        'BVAD',
        tokenHash,
        expiresAt,
        request.userEmail || 'SYSTEM'
      ]
    );

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'TOKEN_ISSUANCE',
        endpoint.legal_entity_id,
        'endpoint_authorization',
        result.rows[0].endpoint_authorization_id,
        'ISSUE',
        'SUCCESS',
        JSON.stringify({
          endpoint_name: endpoint.endpoint_name,
          company_name: endpoint.primary_legal_name,
          issued_by: request.userEmail
        })
      ]
    );

    return {
      status: 201,
      jsonBody: {
        token: tokenValue,
        endpoint_authorization_id: result.rows[0].endpoint_authorization_id,
        issued_at: result.rows[0].issued_at,
        expires_at: result.rows[0].expires_at,
        endpoint_name: endpoint.endpoint_name,
        message: 'Token issued successfully. Please store it securely as it cannot be retrieved again.'
      },
    };

  } catch (error: any) {
    context.error('Error issuing token:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to issue token' },
    };
  }
}

app.http('issueEndpointToken', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/endpoints/{endpointId}/tokens',
  handler: memberEndpoint(handler),
});
