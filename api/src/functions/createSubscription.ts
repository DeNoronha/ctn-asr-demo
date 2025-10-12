import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { SubscriptionService, CreateSubscriptionInput } from '../services/subscriptionService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function createSubscription(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const input: CreateSubscriptionInput = await request.json() as CreateSubscriptionInput;

    // Validation
    if (!input.legal_entity_id || !input.plan_name || input.price === undefined || !input.billing_cycle) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: legal_entity_id, plan_name, price, billing_cycle'
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const subscriptionService = new SubscriptionService(pool);
    const subscription = await subscriptionService.createSubscription(input);

    return {
      status: 201,
      jsonBody: subscription,
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error creating subscription:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create subscription', message: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('createSubscription', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions',
  handler: createSubscription,
});
