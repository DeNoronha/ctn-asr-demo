import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { SubscriptionService, UpdateSubscriptionInput } from '../services/subscriptionService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function updateSubscription(
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
    const subscriptionId = request.params.subscriptionId;

    if (!subscriptionId) {
      return {
        status: 400,
        jsonBody: { error: 'Subscription ID is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const input: UpdateSubscriptionInput = await request.json() as UpdateSubscriptionInput;

    const subscriptionService = new SubscriptionService(pool);
    const subscription = await subscriptionService.updateSubscription(subscriptionId, input);

    return {
      status: 200,
      jsonBody: subscription,
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error updating subscription:', error);

    if (error.message === 'Subscription not found') {
      return {
        status: 404,
        jsonBody: { error: 'Subscription not found' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to update subscription', message: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('updateSubscription', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions/{subscriptionId}',
  handler: updateSubscription,
});
