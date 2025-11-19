import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { handleError } from '../utils/errors';
import { AuditEventType, AuditSeverity, logAuditEvent } from '../middleware/auditLog';

console.log('[AuditLogsList] Module loading...');

/**
 * Handler for retrieving audit logs with pagination
 * Route: GET /api/v1/audit-logs
 * Auth: Admin only
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('AuditLogsList function triggered');

  try {
    const pool = getPool();
    const pagination = getPaginationParams(request);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_log`;
    const { rows: countRows } = await pool.query(countQuery);
    const totalItems = parseInt(countRows[0].count, 10);

    // Get paginated data
    const offset = pagination.offset;
    const limit = pagination.limit;

    const dataQuery = `
      SELECT
        audit_log_id,
        event_type,
        severity,
        result,
        user_id,
        user_email_pseudonym,
        resource_type,
        resource_id,
        action,
        ip_address_pseudonym,
        user_agent,
        request_path,
        request_method,
        details,
        error_message,
        dt_created
      FROM audit_log
      ORDER BY dt_created DESC
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await pool.query(dataQuery, [limit, offset]);

    // Log access to audit logs
    await logAuditEvent(
      {
        event_type: AuditEventType.DATA_EXPORTED,
        severity: AuditSeverity.INFO,
        user_id: request.userId,
        user_email: request.userEmail,
        action: 'read',
        resource_type: 'audit_log',
        result: 'success',
        details: {
          result_count: rows.length,
          total_items: totalItems
        }
      },
      context
    );

    // Create paginated response
    const response = createPaginatedResponse(
      rows,
      pagination.page,
      pagination.limit,
      totalItems
    );

    context.log(`Retrieved ${rows.length} audit logs (total: ${totalItems})`);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: response
    };
  } catch (error) {
    context.error('Error fetching audit logs:', error);
    return handleError(error, context);
  }
}

console.log('[AuditLogsList] Registering function...');

app.http('AuditLogsList', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});

console.log('[AuditLogsList] Function registered successfully');
