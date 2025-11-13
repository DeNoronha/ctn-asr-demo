import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { handleError } from '../utils/errors';

/**
 * Handler for retrieving audit logs with filtering and pagination
 * Route: GET /api/v1/audit-logs
 * Auth: Admin only
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetAuditLogs function triggered');

  try {
    const pool = getPool();
    const pagination = getPaginationParams(request);

    // Extract filter parameters from query string
    const eventType = request.query.get('event_type');
    const userEmail = request.query.get('user_email');
    const resourceType = request.query.get('resource_type');
    const resourceId = request.query.get('resource_id');
    const result = request.query.get('result');
    const startDate = request.query.get('start_date');
    const endDate = request.query.get('end_date');
    const severity = request.query.get('severity');

    // Build dynamic WHERE clause with parameterized queries
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(eventType);
    }

    if (userEmail) {
      conditions.push(`user_email ILIKE $${paramIndex++}`);
      params.push(`%${userEmail}%`);
    }

    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    if (resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(resourceId);
    }

    if (result && (result === 'success' || result === 'failure')) {
      conditions.push(`result = $${paramIndex++}`);
      params.push(result);
    }

    if (severity && ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(severity.toUpperCase())) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity.toUpperCase());
    }

    if (startDate) {
      conditions.push(`dt_created >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`dt_created <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_log ${whereClause}`;
    const { rows: countRows } = await pool.query(countQuery, params);
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
        user_email,
        resource_type,
        resource_id,
        action,
        ip_address,
        user_agent,
        request_path,
        request_method,
        details,
        error_message,
        dt_created
      FROM audit_log
      ${whereClause}
      ORDER BY dt_created DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

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
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch audit logs' }
    };
  }
}

app.http('GetAuditLogs', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
