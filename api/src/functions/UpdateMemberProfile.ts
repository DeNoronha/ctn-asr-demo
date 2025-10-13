import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('UpdateMemberProfile function triggered');

  try {
    const pool = getPool();
    const userEmail = request.userEmail;

    // Get member's org_id
    const memberResult = await pool.query(`
      SELECT m.org_id, m.legal_entity_id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

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
        resource_id: userEmail,
        action: 'update',
        details: { reason: 'member_not_found' },
        error_message: 'Member not found'
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Member not found' }
      };
    }

    const { org_id, legal_entity_id } = memberResult.rows[0];
    const updateData = await request.json() as any;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update member table
      if (updateData.domain || updateData.metadata) {
        const memberUpdates: string[] = [];
        const memberValues: any[] = [];
        let paramIndex = 1;

        if (updateData.domain) {
          memberUpdates.push(`domain = $${paramIndex++}`);
          memberValues.push(updateData.domain);
        }
        if (updateData.metadata) {
          memberUpdates.push(`metadata = $${paramIndex++}`);
          memberValues.push(JSON.stringify(updateData.metadata));
        }

        memberUpdates.push(`updated_at = now()`);
        memberValues.push(org_id);

        await pool.query(`
          UPDATE members
          SET ${memberUpdates.join(', ')}
          WHERE org_id = $${paramIndex}
        `, memberValues);
      }

      // Update legal_entity table
      if (legal_entity_id && (updateData.address_line1 || updateData.postal_code || updateData.city || updateData.country_code)) {
        const leUpdates: string[] = [];
        const leValues: any[] = [];
        let paramIndex = 1;

        if (updateData.address_line1) {
          leUpdates.push(`address_line1 = $${paramIndex++}`);
          leValues.push(updateData.address_line1);
        }
        if (updateData.address_line2 !== undefined) {
          leUpdates.push(`address_line2 = $${paramIndex++}`);
          leValues.push(updateData.address_line2);
        }
        if (updateData.postal_code) {
          leUpdates.push(`postal_code = $${paramIndex++}`);
          leValues.push(updateData.postal_code);
        }
        if (updateData.city) {
          leUpdates.push(`city = $${paramIndex++}`);
          leValues.push(updateData.city);
        }
        if (updateData.province) {
          leUpdates.push(`province = $${paramIndex++}`);
          leValues.push(updateData.province);
        }
        if (updateData.country_code) {
          leUpdates.push(`country_code = $${paramIndex++}`);
          leValues.push(updateData.country_code);
        }

        leUpdates.push(`dt_modified = now()`);
        leUpdates.push(`modified_by = $${paramIndex++}`);
        leValues.push(userEmail);
        leValues.push(legal_entity_id);

        await pool.query(`
          UPDATE legal_entity
          SET ${leUpdates.join(', ')}
          WHERE legal_entity_id = $${paramIndex}
        `, leValues);
      }

      // Log audit event using the new audit system
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
        resource_id: org_id,
        action: 'update',
        details: { updated_by: userEmail, changes: updateData }
      }, context);

      await pool.query('COMMIT');

      return {
        status: 200,
        jsonBody: { message: 'Profile updated successfully' }
      };
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    context.error('Error updating member profile:', error);

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
      resource_id: request.userEmail || 'unknown',
      action: 'update',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: {
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('UpdateMemberProfile', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/member/profile',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY],
    requireAllPermissions: true
  })
});
