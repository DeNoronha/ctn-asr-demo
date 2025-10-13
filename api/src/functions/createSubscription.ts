import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SubscriptionService, CreateSubscriptionInput } from '../services/subscriptionService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const input: CreateSubscriptionInput = await request.json() as CreateSubscriptionInput;

    // Validation
    if (!input.legal_entity_id || !input.plan_name || input.price === undefined || !input.billing_cycle) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: legal_entity_id, plan_name, price, billing_cycle'
        },
      };
    }

    const subscriptionService = new SubscriptionService(pool);
    const subscription = await subscriptionService.createSubscription(input);

    return {
      status: 201,
      jsonBody: subscription,
    };

  } catch (error: any) {
    context.error('Error creating subscription:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create subscription', message: error.message },
    };
  }
}

app.http('createSubscription', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions',
  handler: adminEndpoint(handler),
});
