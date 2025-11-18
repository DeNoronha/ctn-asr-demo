import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

// Startup logging
console.log('[ListAuditLogs] Module loading...');

/**
 * Handler for retrieving audit logs - minimal test version
 * Route: GET /api/v1/audit-logs
 * Auth: Admin only
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('ListAuditLogs function triggered');

  // Return minimal test response
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0
      },
      message: 'Audit logs endpoint working - minimal test version'
    }
  };
}

console.log('[ListAuditLogs] Registering function...');

app.http('ListAuditLogs', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});

console.log('[ListAuditLogs] Function registered successfully');
