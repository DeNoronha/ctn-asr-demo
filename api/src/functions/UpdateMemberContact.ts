import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('UpdateMemberContact function triggered');

  try {
    const pool = getPool();
    const userEmail = request.userEmail;
    const contactId = request.params.contactId;

    if (!contactId) {
      return {
        status: 400,
        jsonBody: { error: 'Contact ID is required' }
      };
    }

    // Validate UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId);
    if (!isUUID) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid UUID format' }
      };
    }

    // Verify this contact belongs to the user's organization
    const verifyResult = await pool.query(`
      SELECT c.legal_entity_id, m.org_id
      FROM legal_entity_contact c
      JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
      JOIN members m ON le.legal_entity_id = m.legal_entity_id
      JOIN legal_entity_contact uc ON m.legal_entity_id = uc.legal_entity_id
      WHERE c.legal_entity_contact_id = $1 AND uc.email = $2 AND uc.is_active = true
    `, [contactId, userEmail]);

    if (verifyResult.rows.length === 0) {
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
        resource_type: 'legal_entity_contact',
        resource_id: contactId,
        action: 'update',
        details: { reason: 'ownership_check_failed' },
        error_message: 'User does not have permission to update this contact'
      }, context);

      context.warn(`IDOR attempt: User ${userEmail} tried to update contact ${contactId}`);

      return {
        status: 403,
        jsonBody: { error: 'Not authorized to update this contact' }
      };
    }

    const { org_id } = verifyResult.rows[0];
    const updateData = await request.json() as any;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.full_name) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(updateData.full_name);
    }
    if (updateData.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(updateData.first_name);
    }
    if (updateData.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(updateData.last_name);
    }
    if (updateData.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(updateData.email);
    }
    if (updateData.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(updateData.phone);
    }
    if (updateData.mobile !== undefined) {
      updates.push(`mobile = $${paramIndex++}`);
      values.push(updateData.mobile);
    }
    if (updateData.job_title !== undefined) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(updateData.job_title);
    }
    if (updateData.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(updateData.department);
    }
    if (updateData.contact_type) {
      updates.push(`contact_type = $${paramIndex++}`);
      values.push(updateData.contact_type);
    }

    updates.push(`dt_modified = now()`);
    updates.push(`modified_by = $${paramIndex++}`);
    values.push(userEmail);
    values.push(contactId);

    await pool.query(`
      UPDATE legal_entity_contact
      SET ${updates.join(', ')}
      WHERE legal_entity_contact_id = $${paramIndex}
    `, values);

    // Log audit event
    await logAuditEvent({
      event_type: AuditEventType.CONTACT_UPDATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_contact',
      resource_id: contactId,
      action: 'update',
      details: { updated_by: userEmail, changes: updateData, org_id }
    }, context);

    return {
      status: 200,
      jsonBody: { message: 'Contact updated successfully' }
    };
  } catch (error) {
    context.error('Error updating contact:', error);

    await logAuditEvent({
      event_type: AuditEventType.CONTACT_UPDATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_contact',
      resource_id: request.params.contactId || 'unknown',
      action: 'update',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to update contact' }
    };
  }
}

app.http('UpdateMemberContact', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/member/contacts/{contactId}',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY],
    requireAllPermissions: true
  })
});
