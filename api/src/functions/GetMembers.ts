import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMembers function triggered');

  try {
    const pool = getPool();
    const pagination = getPaginationParams(request);

    const baseQuery = `
      SELECT org_id, legal_name, lei, kvk, domain, status, membership_level, created_at, legal_entity_id
      FROM members
      ORDER BY created_at DESC
    `;

    const result = await executePaginatedQuery(pool, baseQuery, [], pagination);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: result
    };
  } catch (error) {
    context.error('Error fetching members:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch members' }
    };
  }
}

app.http('GetMembers', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/members',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
