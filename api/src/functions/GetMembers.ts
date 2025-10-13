import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMembers function triggered');

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT org_id, legal_name, lei, kvk, domain, status, membership_level, created_at, legal_entity_id FROM members ORDER BY created_at DESC'
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: result.rows,
        count: result.rows.length
      })
    };
  } catch (error) {
    context.error('Error fetching members:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch members' })
    };
  }
}

app.http('GetMembers', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/members',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
