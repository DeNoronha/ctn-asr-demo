import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders, logApiRequest } from '../middleware/versioning';
import { getPool } from '../utils/database';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';
import { trackEvent, trackMetric, trackException, trackDependency } from '../utils/telemetry';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  context.log('GetMembers function triggered');

  try {
    // Track request
    trackEvent('get_members_request', {
      user_id: request.userId || 'anonymous',
      page: request.query.get('page') || '1',
      limit: request.query.get('limit') || '10'
    }, undefined, context);

    const pool = getPool();
    const pagination = getPaginationParams(request);

    const baseQuery = `
      SELECT
        m.org_id,
        m.legal_name,
        m.lei,
        m.kvk,
        m.euri as euid,
        m.domain,
        m.status,
        m.membership_level,
        m.created_at,
        m.legal_entity_id
      FROM v_members_full m
      ORDER BY m.created_at DESC
    `;

    // Track database query performance
    const dbStart = Date.now();
    const result = await executePaginatedQuery(pool, baseQuery, [], pagination);
    const dbDuration = Date.now() - dbStart;

    trackDependency('PostgreSQL:GetMembers', 'SQL', dbDuration, true, {
      table: 'members',
      operation: 'SELECT'
    });

    // Track result count
    trackMetric('get_members_count', result.data.length, {
      operation: 'get_members'
    });

    // Log API request with version info
    logApiRequest(context, 'v1', '/all-members', request as any);

    // Track total duration
    const totalDuration = Date.now() - startTime;
    trackMetric('get_members_duration', totalDuration, {
      operation: 'get_members'
    });

    trackEvent('get_members_success', {
      status: 'success',
      count: result.data.length.toString()
    }, { duration: totalDuration }, context);

    // Build response
    const response: HttpResponseInit = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: result
    };

    // Add version headers
    return addVersionHeaders(response, 'v1');
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    context.error('Error fetching members:', error);

    trackException(error as Error, {
      operation: 'get_members',
      user_id: request.userId || 'anonymous'
    });

    trackEvent('get_members_failure', {
      status: 'failure',
      error: (error as Error).message
    }, { duration: totalDuration }, context);

    return handleError(error, context);
  }
}

app.http('GetMembers', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/all-members',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
