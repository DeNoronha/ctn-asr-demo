import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import { getPool } from '../utils/database';

async function handler(request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('CreateMemberEndpoint function triggered');

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
        event_type: AuditEventType.ENDPOINT_CREATED,
        severity: AuditSeverity.WARNING,
        result: 'failure',
        user_id: request.userId,
        user_email: request.userEmail,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        request_path: request.url,
        request_method: request.method,
        resource_type: 'legal_entity_endpoint',
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
    const endpointData = await request.json() as any;

    // Insert new endpoint
    const result = await pool.query(`
      INSERT INTO legal_entity_endpoint (
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING legal_entity_endpoint_id
    `, [
      legal_entity_id,
      endpointData.endpoint_name,
      endpointData.endpoint_url,
      endpointData.endpoint_description,
      endpointData.data_category,
      endpointData.endpoint_type || 'REST_API',
      endpointData.authentication_method || 'BEARER_TOKEN',
      endpointData.is_active !== false,
      userEmail
    ]);

    // Log audit event
    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.INFO,
      result: 'success',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: result.rows[0].legal_entity_endpoint_id,
      action: 'create',
      details: { created_by: userEmail, endpoint_name: endpointData.endpoint_name, org_id }
    }, context);

    return {
      status: 201,
      jsonBody: {
        message: 'Endpoint created successfully',
        endpointId: result.rows[0].legal_entity_endpoint_id
      }
    };
  } catch (error) {
    context.error('Error creating endpoint:', error);

    await logAuditEvent({
      event_type: AuditEventType.ENDPOINT_CREATED,
      severity: AuditSeverity.ERROR,
      result: 'failure',
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      request_path: request.url,
      request_method: request.method,
      resource_type: 'legal_entity_endpoint',
      resource_id: request.userEmail || 'unknown',
      action: 'create',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, context);

    return {
      status: 500,
      jsonBody: { error: 'Failed to create endpoint' }
    };
  }
}

app.http('CreateMemberEndpoint', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/member/endpoints',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.UPDATE_OWN_ENTITY],
    requireAllPermissions: true
  })
});
