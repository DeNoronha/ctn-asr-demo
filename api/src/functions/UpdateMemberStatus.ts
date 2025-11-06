/**
 * Update Member Status Function
 * PATCH /api/v1/members/{orgId}/status
 * Allows AssociationAdmin or SystemAdmin to update member status
 */

import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../utils/database';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders } from '../middleware/versioning';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const orgId = request.params.orgId;

  try {
    // Get request body
    const body = await request.json() as { status: string; notes?: string };
    const newStatus = body.status;
    const notes = body.notes || '';
    const updatedBy = request.userEmail || 'unknown';

    // Validate status value
    const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'];
    if (!validStatuses.includes(newStatus)) {
      return addVersionHeaders({
        status: 400,
        jsonBody: {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }
      }, 'v1');
    }

    context.log(`Updating member ${orgId} status to ${newStatus} by ${updatedBy}`);

    // Check if member exists
    const memberResult = await pool.query(
      'SELECT org_id, legal_name, status FROM members WHERE org_id = $1',
      [orgId]
    );

    if (memberResult.rows.length === 0) {
      await logAuditEvent({
        event_type: AuditEventType.MEMBER_UPDATED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'member',
        resource_id: orgId,
        action: 'update_status',
        details: { reason: 'member_not_found' },
        error_message: 'Member not found'
      }, context);

      return addVersionHeaders({
        status: 404,
        jsonBody: {
          error: 'Member not found'
        }
      }, 'v1');
    }

    const member = memberResult.rows[0];
    const oldStatus = member.status;

    // Update member status
    await pool.query(
      `UPDATE members
       SET status = $1,
           updated_at = NOW()
       WHERE org_id = $2`,
      [newStatus, orgId]
    );

    // Log audit event
    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'member',
      resource_id: orgId,
      action: 'update_status',
      details: {
        member_name: member.legal_name,
        old_status: oldStatus,
        new_status: newStatus,
        notes: notes,
        updated_by: updatedBy
      }
    }, context);

    context.log(`✓ Member ${orgId} status updated: ${oldStatus} → ${newStatus}`);

    return addVersionHeaders({
      status: 200,
      jsonBody: {
        message: 'Member status updated successfully',
        orgId: orgId,
        oldStatus: oldStatus,
        newStatus: newStatus
      }
    }, 'v1');

  } catch (error: any) {
    context.error('Error updating member status:', error);

    await logAuditEvent({
      event_type: AuditEventType.MEMBER_UPDATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'member',
      resource_id: orgId,
      action: 'update_status',
      error_message: error.message,
      details: { error: error.message }
    }, context);

    return addVersionHeaders({
      status: 500,
      jsonBody: {
        error: 'Failed to update member status',
        message: error.message
      }
    }, 'v1');
  }
}

app.http('UpdateMemberStatus', {
  methods: ['PATCH', 'OPTIONS'],
  route: 'v1/members/{orgId}/status',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
