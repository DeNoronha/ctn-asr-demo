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

export async function reviewKvkVerification(
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
    const legalEntityId = request.params.legalEntityId;
    const body = await request.json() as any;

    const { status, notes, reviewedBy } = body;

    if (!status || !['verified', 'failed'].includes(status)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid status. Must be "verified" or "failed"' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Update verification status
    await pool.query(
      `UPDATE legal_entity 
       SET kvk_verification_status = $1,
           kvk_verified_at = NOW(),
           kvk_verified_by = $2,
           kvk_verification_notes = $3
       WHERE legal_entity_id = $4`,
      [status, reviewedBy || 'ADMIN', notes || '', legalEntityId]
    );

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'KVK_REVIEW',
        reviewedBy || 'ADMIN',
        'legal_entity',
        legalEntityId,
        'MANUAL_REVIEW',
        status.toUpperCase(),
        JSON.stringify({ notes })
      ]
    );

    return {
      status: 200,
      jsonBody: { message: 'Verification reviewed successfully', status },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to review verification' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('reviewKvkVerification', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalEntityId}/kvk-verification/review',
  handler: reviewKvkVerification,
});
