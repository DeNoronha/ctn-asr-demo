import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { NewsletterService } from '../services/newsletterService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function getNewsletters(
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
    const newsletterService = new NewsletterService(pool);

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

    const newsletters = await newsletterService.getAllNewsletters({ status, limit });

    return {
      status: 200,
      jsonBody: newsletters,
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error fetching newsletters:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch newsletters', message: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('getNewsletters', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/newsletters',
  handler: getNewsletters,
});
