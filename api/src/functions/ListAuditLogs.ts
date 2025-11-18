import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Startup logging
console.log('[ListAuditLogs] Module loading...');

/**
 * Handler for retrieving audit logs - absolute minimal test version
 * Route: GET /api/v1/audit-logs
 * No auth - just testing route
 */
async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('ListAuditLogs function triggered');

  // Return minimal test response
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: {
      message: 'Audit logs endpoint working',
      test: true
    }
  };
}

console.log('[ListAuditLogs] Registering function...');

app.http('ListAuditLogs', {
  methods: ['GET'],
  route: 'v1/list-audit-logs',
  authLevel: 'anonymous',
  handler: handler
});

console.log('[ListAuditLogs] Function registered successfully');
