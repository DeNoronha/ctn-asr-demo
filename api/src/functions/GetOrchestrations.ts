import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getOrchestrationsForParty } from '../utils/gremlinClient';

/**
 * Get Orchestrations
 * Returns list of orchestrations that the authenticated user's party is involved in
 *
 * Query Parameters:
 * - status: Filter by status (DRAFT, ACTIVE, IN_TRANSIT, COMPLETED, CANCELLED)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Response:
 * {
 *   data: [...orchestrations],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 45
 *   }
 * }
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetOrchestrations function triggered');

  try {
    // Get authenticated party ID from middleware (resolved from Azure AD oid)
    const partyId = request.partyId;

    if (!partyId) {
      context.warn('User does not have a party ID association');
      return {
        status: 404,
        jsonBody: {
          error: 'not_found',
          message: 'User is not associated with any registered party',
          hint: 'Contact administrator to link your account to an organization'
        }
      };
    }

    // Parse query parameters
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    // Parse status filter
    const statusFilter = statusParam
      ? statusParam.split(',').map(s => s.trim().toUpperCase())
      : ['ACTIVE', 'IN_TRANSIT']; // Default: show active orchestrations

    // Calculate pagination
    const skip = (page - 1) * limit;

    context.log(`Fetching orchestrations for party: ${partyId}, status: ${statusFilter.join(',')}, page: ${page}`);

    // Query Gremlin for orchestrations
    const orchestrations = await getOrchestrationsForParty(partyId, statusFilter, skip, limit);

    // Transform Gremlin results to API format
    const transformedData = orchestrations.map((orch: any) => ({
      id: orch.id?.[0] || orch.id,
      container_id: orch.container_id?.[0] || orch.container_id,
      bol_number: orch.bol_number?.[0] || orch.bol_number,
      status: orch.status?.[0] || orch.status,
      priority: orch.priority?.[0] || orch.priority || 'MEDIUM',
      created_at: orch.created_at?.[0] || orch.created_at,
      created_by: orch.created_by?.[0] || orch.created_by
    }));

    // Log successful access
    await logAuditEvent({
      event_type: AuditEventType.ACCESS_GRANTED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'orchestrations',
      action: 'list',
      details: {
        party_id: partyId,
        status_filter: statusFilter,
        page,
        limit,
        result_count: transformedData.length
      }
    }, context);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        data: transformedData,
        pagination: {
          page,
          limit,
          total: transformedData.length, // Note: Actual total would require separate count query
          has_more: transformedData.length === limit
        }
      }
    };

  } catch (error) {
    context.error('Error fetching orchestrations:', error);

    // Log error
    await logAuditEvent({
      event_type: AuditEventType.ACCESS_DENIED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'orchestrations',
      action: 'list',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch orchestrations',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GetOrchestrations', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/orchestrations',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ORCHESTRATIONS],
    requireAllPermissions: false
  })
});
