import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool, escapeSqlWildcards } from '../utils/database';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { handleError } from '../utils/errors';
import { AuditEventType, AuditSeverity } from '../middleware/auditLog';

/**
 * Allowed values for query parameters (allow-lists)
 */
const ALLOWED_EVENT_TYPES = new Set(Object.values(AuditEventType));
const ALLOWED_SEVERITIES = new Set(Object.values(AuditSeverity));
const ALLOWED_RESULTS = new Set(['success', 'failure']);

// Common resource types found in the codebase
const ALLOWED_RESOURCE_TYPES = new Set([
  'member',
  'legal_entity',
  'legal_entity_contact',
  'legal_entity_endpoint',
  'legal_entity_identifier',
  'endpoint_authorization',
  'euid',
  'lei',
  'subscription',
  'newsletter',
  'task',
  'document',
  'webhook',
  'event',
  'party'
]);

// Common actions found in the codebase
const ALLOWED_ACTIONS = new Set([
  'create',
  'read',
  'update',
  'delete',
  'fetch',
  'verify',
  'test',
  'activate',
  'suspend',
  'approve',
  'reject',
  'submit',
  'auto_generate',
  'export'
]);

/**
 * Validation result interface
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates email format (basic RFC 5322 compliance)
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validates ISO 8601 date format
 */
function isValidISODate(date: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!isoRegex.test(date)) {
    return false;
  }
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validates query parameters and returns validation errors
 */
function validateQueryParameters(request: AuthenticatedRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate event_type
  const eventType = request.query.get('event_type');
  if (eventType && !ALLOWED_EVENT_TYPES.has(eventType as AuditEventType)) {
    errors.push({
      field: 'event_type',
      message: `Invalid event_type: '${eventType}'. Must be one of: ${Array.from(ALLOWED_EVENT_TYPES).sort().join(', ')}`
    });
  }

  // Validate severity
  const severity = request.query.get('severity');
  if (severity && !ALLOWED_SEVERITIES.has(severity.toUpperCase() as AuditSeverity)) {
    errors.push({
      field: 'severity',
      message: `Invalid severity: '${severity}'. Must be one of: ${Array.from(ALLOWED_SEVERITIES).join(', ')}`
    });
  }

  // Validate user_email format
  const userEmail = request.query.get('user_email');
  if (userEmail && !isValidEmail(userEmail)) {
    errors.push({
      field: 'user_email',
      message: `Invalid user_email format: '${userEmail}'. Must be a valid email address (max 255 characters)`
    });
  }

  // Validate resource_type
  const resourceType = request.query.get('resource_type');
  if (resourceType && !ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    errors.push({
      field: 'resource_type',
      message: `Invalid resource_type: '${resourceType}'. Must be one of: ${Array.from(ALLOWED_RESOURCE_TYPES).sort().join(', ')}`
    });
  }

  // Validate action
  const action = request.query.get('action');
  if (action && !ALLOWED_ACTIONS.has(action)) {
    errors.push({
      field: 'action',
      message: `Invalid action: '${action}'. Must be one of: ${Array.from(ALLOWED_ACTIONS).sort().join(', ')}`
    });
  }

  // Validate result
  const result = request.query.get('result');
  if (result && !ALLOWED_RESULTS.has(result)) {
    errors.push({
      field: 'result',
      message: `Invalid result: '${result}'. Must be one of: ${Array.from(ALLOWED_RESULTS).join(', ')}`
    });
  }

  // Validate start_date
  const startDate = request.query.get('start_date');
  if (startDate && !isValidISODate(startDate)) {
    errors.push({
      field: 'start_date',
      message: `Invalid start_date format: '${startDate}'. Must be a valid ISO 8601 date (e.g., '2024-01-01' or '2024-01-01T00:00:00Z')`
    });
  }

  // Validate end_date
  const endDate = request.query.get('end_date');
  if (endDate && !isValidISODate(endDate)) {
    errors.push({
      field: 'end_date',
      message: `Invalid end_date format: '${endDate}'. Must be a valid ISO 8601 date (e.g., '2024-01-01' or '2024-01-01T00:00:00Z')`
    });
  }

  // Validate date range logic (start_date must be before end_date)
  if (startDate && endDate && isValidISODate(startDate) && isValidISODate(endDate)) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      errors.push({
        field: 'date_range',
        message: `Invalid date range: start_date (${startDate}) must be before or equal to end_date (${endDate})`
      });
    }
  }

  // Validate resource_id format (if provided)
  const resourceId = request.query.get('resource_id');
  if (resourceId && resourceId.length > 255) {
    errors.push({
      field: 'resource_id',
      message: `Invalid resource_id: exceeds maximum length of 255 characters`
    });
  }

  return errors;
}

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
    // Validate query parameters BEFORE processing
    const validationErrors = validateQueryParameters(request);
    if (validationErrors.length > 0) {
      context.warn('Invalid query parameters:', validationErrors);
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: 'Invalid query parameters',
          details: validationErrors
        }
      };
    }

    const pool = getPool();
    const pagination = getPaginationParams(request);

    // Extract filter parameters from query string (already validated)
    const eventType = request.query.get('event_type');
    const userEmail = request.query.get('user_email');
    const resourceType = request.query.get('resource_type');
    const resourceId = request.query.get('resource_id');
    const result = request.query.get('result');
    const startDate = request.query.get('start_date');
    const endDate = request.query.get('end_date');
    const severity = request.query.get('severity');
    const action = request.query.get('action');

    // Build dynamic WHERE clause with parameterized queries
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(eventType);
    }

    if (userEmail) {
      // Use ILIKE for case-insensitive partial matching with sanitized wildcards
      conditions.push(`user_email ILIKE $${paramIndex++}`);
      params.push(`%${escapeSqlWildcards(userEmail)}%`);
    }

    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    if (resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(resourceId);
    }

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (result) {
      // Already validated - no need to re-check
      conditions.push(`result = $${paramIndex++}`);
      params.push(result);
    }

    if (severity) {
      // Already validated - normalize to uppercase for DB comparison
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
    return handleError(error, context);
  }
}

app.http('GetAuditLogs', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/audit-logs',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
