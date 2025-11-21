import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('CreateMemberContact function triggered');

  try {
    const pool = getPool();
    const userEmail = request.userEmail;

    // Get member's legal_entity_id and org_id
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
        event_type: AuditEventType.CONTACT_CREATED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity_contact',
        resource_id: userEmail,
        action: 'create',
        details: { reason: 'member_not_found' },
        error_message: 'Member not found'
      }, context);

      return {
        status: 404,
        jsonBody: { error: 'Member not found' }
      };
    }

    const { org_id, legal_entity_id } = memberResult.rows[0];
    const contactData = await request.json() as any;

    // Insert new contact
    const result = await pool.query(`
      INSERT INTO legal_entity_contact (
        legal_entity_id,
        contact_type,
        full_name,
        first_name,
        last_name,
        email,
        phone,
        mobile,
        job_title,
        department,
        preferred_language,
        preferred_contact_method,
        is_primary,
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING legal_entity_contact_id
    `, [
      legal_entity_id,
      contactData.contact_type || 'TECHNICAL',
      contactData.full_name,
      contactData.first_name,
      contactData.last_name,
      contactData.email,
      contactData.phone,
      contactData.mobile,
      contactData.job_title,
      contactData.department,
      contactData.preferred_language || 'en',
      contactData.preferred_contact_method || 'EMAIL',
      contactData.is_primary || false,
      true,
      userEmail
    ]);

    // Log audit event
    await logAuditEvent({
      event_type: AuditEventType.CONTACT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_contact',
      resource_id: result.rows[0].legal_entity_contact_id,
      action: 'create',
      details: { created_by: userEmail, contact_email: contactData.email, org_id }
    }, context);

    return {
      status: 201,
      jsonBody: {
        message: 'Contact created successfully',
        contactId: result.rows[0].legal_entity_contact_id
      }
    };
  } catch (error) {
    context.error('Error creating contact:', error);

    await logAuditEvent({
      event_type: AuditEventType.CONTACT_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_contact',
      resource_id: request.userEmail || 'unknown',
      action: 'create',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return handleError(error, context);
  }
}

app.http('CreateMemberContact', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/member/contacts',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY],
    requireAllPermissions: true
  })
});
