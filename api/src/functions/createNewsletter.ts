import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { NewsletterService, CreateNewsletterInput } from '../services/newsletterService';
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
    const input: CreateNewsletterInput = await request.json() as CreateNewsletterInput;

    // Validation
    if (!input.title || !input.subject_line || !input.content || !input.html_content) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: title, subject_line, content, html_content'
        },
      };
    }

    const newsletterService = new NewsletterService(pool);
    const newsletter = await newsletterService.createNewsletter(input);

    return {
      status: 201,
      jsonBody: newsletter,
    };

  } catch (error: any) {
    context.error('Error creating newsletter:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create newsletter', message: error.message },
    };
  }
}

app.http('createNewsletter', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/newsletters',
  handler: adminEndpoint(handler),
});
