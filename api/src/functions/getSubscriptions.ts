import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SubscriptionService } from '../services/subscriptionService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const subscriptionService = new SubscriptionService(pool);

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const legalEntityId = url.searchParams.get('legal_entity_id') || undefined;

    const subscriptions = await subscriptionService.getAllSubscriptions({
      status,
      legal_entity_id: legalEntityId
    });

    return {
      status: 200,
      jsonBody: subscriptions,
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
