import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getEventsForOrchestration, isPartyInvolvedInOrchestration } from '../utils/gremlinClient';

/**
 * Get Events
 * Returns events for orchestrations that the authenticated user's party is involved in
 *
 * Query Parameters:
 * - orchestration_id: Filter by orchestration (optional)
 * - event_type: Filter by event type (optional)
 * - limit: Max events to return (default: 50, max: 200)
 *
 * Response:
 * {
 *   data: [...events],
 *   pagination: {
 *     limit: 50,
 *     has_more: false
 *   }
 * }
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetEvents function triggered');

  try {
    // Get authenticated party ID
    const partyId = request.userId;

    if (!partyId) {
      return {
        status: 401,
        jsonBody: { error: 'Party identification required' }
      };
    }

    // Parse query parameters
    const url = new URL(request.url);
    const orchestrationId = url.searchParams.get('orchestration_id');
    const eventType = url.searchParams.get('event_type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    if (!orchestrationId) {
      return {
        status: 400,
        jsonBody: {
          error: 'orchestration_id parameter is required',
          message: 'You must specify which orchestration to get events for'
        }
      };
    }

    context.log(`Fetching events for orchestration: ${orchestrationId}, type: ${eventType || 'all'}`);

    // SECURITY: Verify user's party is involved in this orchestration (IDOR prevention)
    const isInvolved = await isPartyInvolvedInOrchestration(orchestrationId, partyId);

    if (!isInvolved) {
      // Log IDOR attempt
      await logAuditEvent({
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'events',
        resource_id: orchestrationId,
        action: 'list',
        details: {
          reason: 'party_not_involved',
          party_id: partyId,
          security_issue: 'IDOR_ATTEMPT'
        },
        error_message: 'Access denied: Party not involved in orchestration'
      }, context);

      // Return 404 instead of 403 to avoid information disclosure
      return {
        status: 404,
        jsonBody: { error: 'Orchestration not found' }
      };
    }

    // Query Gremlin for events
    const events = await getEventsForOrchestration(
      orchestrationId,
      eventType || undefined,
      limit
    );

    // Transform Gremlin results to API format
    const transformedData = events.map((event: any) => ({
      id: event.id?.[0] || event.id,
      event_type: event.event_type?.[0] || event.event_type,
      timestamp: event.timestamp?.[0] || event.timestamp,
      location: event.location?.[0] || event.location,
      details: event.details?.[0] || event.details,
      orchestration_id: orchestrationId
    }));

    // Sort by timestamp descending (most recent first)
    transformedData.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

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
      resource_type: 'events',
      action: 'list',
      details: {
        party_id: partyId,
        orchestration_id: orchestrationId,
        event_type: eventType,
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
          limit,
          has_more: transformedData.length === limit
        }
      }
    };

  } catch (error) {
    context.error('Error fetching events:', error);

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
      resource_type: 'events',
      action: 'list',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GetEvents', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/events',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ORCHESTRATIONS],
    requireAllPermissions: false
  })
});
