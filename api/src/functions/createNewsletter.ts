import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { NewsletterService, CreateNewsletterInput } from '../services/newsletterService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
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
