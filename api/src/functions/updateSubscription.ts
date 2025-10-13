import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SubscriptionService, UpdateSubscriptionInput } from '../services/subscriptionService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const subscriptionId = request.params.subscriptionId;

    if (!subscriptionId) {
      return {
        status: 400,
        jsonBody: { error: 'Subscription ID is required' },
      };
    }

    const input: UpdateSubscriptionInput = await request.json() as UpdateSubscriptionInput;

    const subscriptionService = new SubscriptionService(pool);
    const subscription = await subscriptionService.updateSubscription(subscriptionId, input);

    return {
      status: 200,
      jsonBody: subscription,
    };

  } catch (error: any) {
    context.error('Error updating subscription:', error);

    if (error.message === 'Subscription not found') {
      return {
        status: 404,
        jsonBody: { error: 'Subscription not found' },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to update subscription', message: error.message },
    };
  }
}

app.http('updateSubscription', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions/{subscriptionId}',
  handler: adminEndpoint(handler),
});
