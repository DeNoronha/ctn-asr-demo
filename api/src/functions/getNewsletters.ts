import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { NewsletterService } from '../services/newsletterService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

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
    };

  } catch (error: any) {
    context.error('Error fetching newsletters:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch newsletters', message: error.message },
    };
  }
}

app.http('getNewsletters', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/newsletters',
  handler: adminEndpoint(handler),
});
