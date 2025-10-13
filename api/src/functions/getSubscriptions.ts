import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SubscriptionService } from '../services/subscriptionService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { getPaginationParams, executePaginatedQuery } from '../utils/pagination';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const pagination = getPaginationParams(request);

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const legalEntityId = url.searchParams.get('legal_entity_id') || undefined;

    // Build query dynamically based on filters
    let baseQuery = `
      SELECT
        s.subscription_id, s.legal_entity_id, s.plan_name, s.price, s.billing_cycle,
        s.status, s.start_date, s.end_date, s.next_billing_date, s.created_at, s.updated_at,
        le.primary_legal_name
      FROM subscriptions s
      JOIN legal_entity le ON s.legal_entity_id = le.legal_entity_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      baseQuery += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (legalEntityId) {
      baseQuery += ` AND s.legal_entity_id = $${paramIndex}`;
      params.push(legalEntityId);
      paramIndex++;
    }

    baseQuery += ` ORDER BY s.created_at DESC`;

    const result = await executePaginatedQuery(pool, baseQuery, params, pagination);

    return {
      status: 200,
      jsonBody: result,
    };

  } catch (error: any) {
    context.error('Error fetching subscriptions:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch subscriptions', message: error.message },
    };
  }
}

app.http('getSubscriptions', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions',
  handler: adminEndpoint(handler),
});
