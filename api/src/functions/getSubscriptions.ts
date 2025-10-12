import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { SubscriptionService } from '../services/subscriptionService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function getSubscriptions(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
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
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error fetching subscriptions:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch subscriptions', message: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('getSubscriptions', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/subscriptions',
  handler: getSubscriptions,
});
