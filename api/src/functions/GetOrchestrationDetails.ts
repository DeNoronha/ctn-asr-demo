import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getOrchestrationDetails, isPartyInvolvedInOrchestration } from '../utils/gremlinClient';
import { handleError } from '../utils/errors';

/**
 * Get Orchestration Details
 * Returns detailed information about a specific orchestration including:
 * - Orchestration properties
 * - All involved parties (respecting visibility boundaries)
 * - Recent events
 * - Parent/child orchestrations
 *
 * Security:
 * - User must be involved in the orchestration
 * - Visibility boundaries enforced (cannot see child orchestration details)
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetOrchestrationDetails function triggered');

  try {
    const orchestrationId = request.params.orchestrationid;

    if (!orchestrationId) {
      return {
        status: 400,
        jsonBody: { error: 'orchestration_id parameter is required' }
      };
    }

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

    context.log(`Fetching orchestration details: ${orchestrationId} for party: ${partyId}`);

    // Query Gremlin for orchestration details
    const details = await getOrchestrationDetails(orchestrationId);

    if (!details || !details.orchestration) {
      // Log potential IDOR attempt
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
        resource_type: 'orchestration',
        resource_id: orchestrationId,
        action: 'read',
        details: { reason: 'orchestration_not_found' },
        error_message: 'Orchestration not found'
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Orchestration not found' }
      };
    }

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
        resource_type: 'orchestration',
        resource_id: orchestrationId,
        action: 'read',
        details: {
          reason: 'party_not_involved',
          party_id: partyId,
          security_issue: 'IDOR_ATTEMPT'
        },
        error_message: 'Access denied: Party not involved in orchestration'
      }, context);

      // Return 404 instead of 403 to avoid information disclosure
      // (don't reveal whether the orchestration exists)
      return {
        status: 404,
        jsonBody: { error: 'Orchestration not found' }
      };
    }

    // Transform Gremlin results to API format
    const orchestration = details.orchestration;
    const transformedData = {
      id: orchestration.id?.[0] || orchestration.id,
      container_id: orchestration.container_id?.[0] || orchestration.container_id,
      bol_number: orchestration.bol_number?.[0] || orchestration.bol_number,
      status: orchestration.status?.[0] || orchestration.status,
      priority: orchestration.priority?.[0] || orchestration.priority || 'MEDIUM',
      created_at: orchestration.created_at?.[0] || orchestration.created_at,
      created_by: orchestration.created_by?.[0] || orchestration.created_by,
      expires_at: orchestration.expires_at?.[0] || orchestration.expires_at,
      parties: details.parties?.map((party: any) => ({
        id: party.id?.[0] || party.id,
        name: party.name?.[0] || party.name,
        role: party.role?.[0] || party.role,
        involvement_type: party.involvement_type?.[0] || party.involvement_type,
        added_at: party.added_at?.[0] || party.added_at
      })) || [],
      events: details.events?.map((event: any) => ({
        id: event.id?.[0] || event.id,
        event_type: event.event_type?.[0] || event.event_type,
        timestamp: event.timestamp?.[0] || event.timestamp,
        location: event.location?.[0] || event.location,
        details: event.details?.[0] || event.details
      })) || [],
      parent: details.parent?.[0] ? {
        id: details.parent[0].id?.[0] || details.parent[0].id,
        container_id: details.parent[0].container_id?.[0] || details.parent[0].container_id
      } : null,
      children: details.children?.map((child: any) => ({
        id: child.id?.[0] || child.id,
        container_id: child.container_id?.[0] || child.container_id
      })) || []
    };

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
      resource_type: 'orchestration',
      resource_id: orchestrationId,
      action: 'read',
      details: {
        party_id: partyId,
        parties_count: transformedData.parties.length,
        events_count: transformedData.events.length
      }
    }, context);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: transformedData
    };

  } catch (error) {
    context.error('Error fetching orchestration details:', error);

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
      resource_type: 'orchestration',
      resource_id: request.params.orchestrationid,
      action: 'read',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch orchestration details',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GetOrchestrationDetails', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/orchestrations/{orchestrationid}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ORCHESTRATIONS],
    requireAllPermissions: false
  })
});
