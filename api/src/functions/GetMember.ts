import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const orgId = request.params.orgId;

  if (!orgId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'org_id parameter is required' })
    };
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT org_id, legal_name, lei, kvk, domain, status, membership_level,
              created_at, metadata, legal_entity_id
       FROM members
       WHERE org_id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'Member not found' })
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    context.error('Error fetching member:', error);
    return handleError(error, context);
  }
}

app.http('GetMember', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/members/{orgId}',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
