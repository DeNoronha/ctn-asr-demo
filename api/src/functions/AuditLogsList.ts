import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

console.log('[AuditLogsList] Loading module');

async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { message: 'Audit logs working' }
  };
}

app.http('AuditLogsList', {
  methods: ['GET'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler
});
