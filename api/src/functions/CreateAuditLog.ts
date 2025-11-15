import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { logAuditEvent, AuditEventType, AuditSeverity, AuditLogEntry } from '../middleware/auditLog';
import { handleError } from '../utils/errors';

/**
 * Handler for creating audit log entries from the frontend
 * Route: POST /api/v1/audit-logs
 * Auth: Admin only
 *
 * This endpoint allows the frontend to log events that happen outside
 * the ASR API (e.g., Microsoft Graph API operations like user management)
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('CreateAuditLog function triggered');

  try {
    const body = await request.json() as {
      action: string;
      userId?: string;
      userName?: string;
      userRole?: string;
      targetType?: string;
      targetId?: string;
      targetName?: string;
      details?: string;
      metadata?: Record<string, any>;
      severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
      result?: 'success' | 'failure';
    };

    if (!body.action) {
      return {
        status: 400,
        jsonBody: { error: 'action is required' }
      };
    }

    // Map frontend actions to backend event types
    const eventTypeMap: Record<string, AuditEventType> = {
      'USER_INVITED': AuditEventType.MEMBER_CREATED, // Using MEMBER_CREATED as closest match
      'USER_UPDATED': AuditEventType.MEMBER_UPDATED, // Using MEMBER_UPDATED as closest match
      'USER_ENABLED': AuditEventType.MEMBER_ACTIVATED,
      'USER_DISABLED': AuditEventType.MEMBER_SUSPENDED,
      'USER_ROLE_CHANGED': AuditEventType.MEMBER_UPDATED,
    };

    const eventType = eventTypeMap[body.action] || body.action as AuditEventType;

    // Create audit log entry
    const entry: AuditLogEntry = {
      event_type: eventType,
      severity: body.severity ? AuditSeverity[body.severity] : AuditSeverity.INFO,
      user_id: body.userId || request.userId,
      user_email: body.userName || request.userEmail,
      resource_type: body.targetType,
      resource_id: body.targetId,
      action: body.action,
      result: body.result || 'success',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') ||
                  undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      details: body.metadata || (body.details ? { message: body.details } : undefined),
    };

    await logAuditEvent(entry, context);

    context.log('Audit log created:', body.action);

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: true,
        message: 'Audit log entry created'
      }
    };
  } catch (error) {
    context.error('Error creating audit log:', error);
    return handleError(error, context);
  }
}

app.http('CreateAuditLog', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
