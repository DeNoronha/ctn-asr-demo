import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

/**
 * Get Webhooks
 * Returns webhook configurations for the authenticated user's party
 *
 * Note: Webhooks are stored in PostgreSQL, not the graph database
 * This is simpler since webhooks don't have complex relationships
 *
 * Response:
 * {
 *   data: [
 *     {
 *       webhook_id: "uuid",
 *       party_id: "party-123",
 *       url: "https://example.com/webhooks/orchestrations",
 *       event_types: ["CONTAINER_GATE_IN", "VESSEL_DEPARTURE"],
 *       is_active: true,
 *       created_at: "2025-10-18T...",
 *       last_triggered: "2025-10-18T...",
 *       delivery_stats: {
 *         total_attempts: 150,
 *         successful: 148,
 *         failed: 2
 *       }
 *     }
 *   ]
 * }
 */
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetWebhooks function triggered');

  try {
    // Get authenticated party ID
    const partyId = request.userId;

    if (!partyId) {
      return {
        status: 401,
        jsonBody: { error: 'Party identification required' }
      };
    }

    const pool = getPool();

    // Query PostgreSQL for webhooks
    // Note: This table would need to be created via migration
    const result = await pool.query(
      `SELECT
        webhook_id,
        party_id,
        url,
        event_types,
        is_active,
        created_at,
        last_triggered_at,
        total_deliveries,
        successful_deliveries,
        failed_deliveries
      FROM orchestration_webhooks
      WHERE party_id = $1
      ORDER BY created_at DESC`,
      [partyId]
    );

    const webhooks = result.rows.map(row => ({
      webhook_id: row.webhook_id,
      party_id: row.party_id,
      url: row.url,
      event_types: row.event_types,
      is_active: row.is_active,
      created_at: row.created_at,
      last_triggered: row.last_triggered_at,
      delivery_stats: {
        total_attempts: row.total_deliveries || 0,
        successful: row.successful_deliveries || 0,
        failed: row.failed_deliveries || 0,
        success_rate: row.total_deliveries > 0
          ? ((row.successful_deliveries / row.total_deliveries) * 100).toFixed(2) + '%'
          : '0%'
      }
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
      resource_type: 'webhooks',
      action: 'list',
      details: {
        party_id: partyId,
        webhook_count: webhooks.length
      }
    }, context);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        data: webhooks
      }
    };

  } catch (error) {
    context.error('Error fetching webhooks:', error);

    // Check if this is a "table doesn't exist" error
    const isTableMissing = error instanceof Error &&
      (error.message.includes('relation') || error.message.includes('does not exist'));

    if (isTableMissing) {
      context.warn('orchestration_webhooks table does not exist yet - returning empty array');

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          data: [],
          message: 'Webhooks feature is being set up. No webhooks configured yet.'
        }
      };
    }

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
      resource_type: 'webhooks',
      action: 'list',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fetch webhooks',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('GetWebhooks', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/webhooks',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ORCHESTRATIONS],
    requireAllPermissions: false
  })
});
