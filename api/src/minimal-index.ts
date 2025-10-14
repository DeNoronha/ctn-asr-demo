// Minimal test - no dependencies
import { app } from '@azure/functions';

app.http('minimalTest', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'minimal',
  handler: async (request, context) => {
    context.log('Minimal test called');
    return {
      status: 200,
      jsonBody: {
        message: 'Minimal test works!',
        timestamp: new Date().toISOString()
      }
    };
  }
});

console.log('Minimal index loaded successfully');
