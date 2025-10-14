import { app, HttpResponseInit, InvocationContext, HttpRequest } from '@azure/functions';

async function simpleTest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Simple test function called');

  return {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: 'Simple test function works!'
  };
}

app.http('simpleTest', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test',
  handler: simpleTest
});
