import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';
import { retrieveOriginalValue } from '../utils/pseudonymization';
import { AuditEventType, AuditSeverity, logAuditEvent } from '../middleware/auditLog';

/**
 * Handler for de-pseudonymizing audit log PII
 *
 * RESTRICTED ACCESS:
 * - SystemAdmin role ONLY
 * - All access is logged in audit_log with severity=WARNING
 * - Should only be used for emergency debugging/support cases
 *
 * GDPR Compliance:
 * - Article 32: Monitoring and logging of PII access
 * - Access audit trail stored in audit_log_pii_access table
 * - Requires explicit reason for access
 *
 * Route: GET /api/v1/audit-logs/pii/{pseudonym}
 * Auth: Admin only (SystemAdmin role enforced in handler)
 *
 * Query Parameters:
 * - reason (required): Reason for accessing PII (e.g., "Customer support ticket #12345")
 *
 * Example:
 *   GET /api/v1/audit-logs/pii/email_a1b2c3d4e5f6g7h8?reason=Support+ticket+12345
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetAuditLogPII function triggered');

  try {
    // SECURITY: Verify SystemAdmin role
    // This is a critical security check - do NOT remove or bypass
    if (!request.userRoles?.includes('SystemAdmin')) {
      context.warn(`Unauthorized PII access attempt by user: ${request.userId} (roles: ${request.userRoles?.join(', ')})`);

      // Log unauthorized access attempt
      await logAuditEvent(
        {
          event_type: AuditEventType.PERMISSION_VIOLATION,
          severity: AuditSeverity.WARNING,
          user_id: request.userId,
          user_email: request.userEmail,
          action: 'de_pseudonymize',
          resource_type: 'audit_log_pii_mapping',
          result: 'failure',
          error_message: 'Insufficient permissions - SystemAdmin role required'
        },
        context
      );

      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Forbidden',
          message: 'SystemAdmin role required to access PII'
        }
      };
    }

    // Extract pseudonym from route params
    const pseudonym = request.params.pseudonym;

    if (!pseudonym) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Bad Request',
          message: 'Pseudonym parameter is required'
        }
      };
    }

    // Validate pseudonym format (email_xxx, ipv4_xxx, or ipv6_xxx)
    const validPseudonymRegex = /^(email_[a-f0-9]{16}|ipv4_[a-f0-9]{12}|ipv6_[a-f0-9]{12})$/;
    if (!validPseudonymRegex.test(pseudonym)) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Bad Request',
          message: 'Invalid pseudonym format'
        }
      };
    }

    // Require reason for access (GDPR compliance)
    const reason = request.query.get('reason');

    if (!reason || reason.trim().length < 10) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Bad Request',
          message: 'Access reason is required (minimum 10 characters)'
        }
      };
    }

    // Extract IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip');

    // Log this PII access (audit trail)
    const pool = getPool();
    await pool.query(
      `INSERT INTO audit_log_pii_access (
        pseudonym,
        accessed_by,
        accessed_at,
        access_reason,
        user_agent,
        ip_address
      ) VALUES ($1, $2, NOW(), $3, $4, $5)`,
      [
        pseudonym,
        request.userId,
        reason,
        request.headers.get('user-agent') || null,
        clientIp || null
      ]
    );

    // Retrieve original PII value
    const originalValue = await retrieveOriginalValue(pseudonym, context);

    if (!originalValue) {
      context.warn(`PII mapping not found for pseudonym: ${pseudonym}`);

      // Log failed access attempt (mapping not found)
      await logAuditEvent(
        {
          event_type: AuditEventType.ACCESS_DENIED,
          severity: AuditSeverity.WARNING,
          user_id: request.userId,
          user_email: request.userEmail,
          action: 'de_pseudonymize',
          resource_type: 'audit_log_pii_mapping',
          resource_id: pseudonym,
          result: 'failure',
          error_message: 'PII mapping not found',
          details: { reason }
        },
        context
      );

      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Not Found',
          message: 'No PII mapping found for this pseudonym'
        }
      };
    }

    // Log successful PII access (WARNING severity)
    await logAuditEvent(
      {
        event_type: AuditEventType.DATA_EXPORTED,
        severity: AuditSeverity.WARNING, // WARNING severity for PII access
        user_id: request.userId,
        user_email: request.userEmail,
        action: 'de_pseudonymize',
        resource_type: 'audit_log_pii_mapping',
        resource_id: pseudonym,
        result: 'success',
        details: {
          reason,
          pseudonym_type: pseudonym.startsWith('email_') ? 'email' : 'ip_address'
        }
      },
      context
    );

    context.log(`PII de-pseudonymization successful: ${pseudonym} by ${request.userId}`);

    // Return de-pseudonymized value
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        pseudonym,
        original_value: originalValue,
        accessed_by: request.userId,
        accessed_at: new Date().toISOString(),
        reason,
        warning: 'This is sensitive PII. Handle with care. All access is logged.'
      }
    };
  } catch (error) {
    context.error('Error retrieving PII:', error);

    // Log error
    await logAuditEvent(
      {
        event_type: AuditEventType.ACCESS_DENIED,
        severity: AuditSeverity.ERROR,
        user_id: request.userId,
        user_email: request.userEmail,
        action: 'de_pseudonymize',
        resource_type: 'audit_log_pii_mapping',
        result: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      },
      context
    );

    return handleError(error, context);
  }
}

app.http('GetAuditLogPII', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/audit-logs/pii/{pseudonym}',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
