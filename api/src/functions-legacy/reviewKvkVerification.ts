import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const legalEntityId = request.params.legalentityid;
    const body = await request.json() as any;

    const { status, notes, reviewedBy } = body;

    if (!status || !['verified', 'failed'].includes(status)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid status. Must be "verified" or "failed"' },
      };
    }

    // Update verification status
    await pool.query(
      `UPDATE legal_entity 
       SET kvk_verification_status = $1,
           kvk_verified_at = NOW(),
           kvk_verified_by = $2,
           kvk_verification_notes = $3
       WHERE legal_entity_id = $4`,
      [status, reviewedBy || 'ADMIN', notes || '', legalEntityId]
    );

    // Log audit event using standardized middleware
    await logAuditEvent({
      event_type: status === 'verified' ? AuditEventType.DOCUMENT_APPROVED : AuditEventType.DOCUMENT_REJECTED,
      severity: AuditSeverity.INFO,
      user_id: request.userId,
      user_email: request.userEmail || reviewedBy || 'ADMIN',
      resource_type: 'legal_entity',
      resource_id: legalEntityId,
      action: 'manual_review',
      result: status === 'verified' ? 'success' : 'failure',
      details: {
        verification_type: 'kvk',
        verification_status: status,
        notes: notes || '',
        reviewed_by: reviewedBy || request.userEmail || 'ADMIN'
      }
    }, context);

    return {
      status: 200,
      jsonBody: { message: 'Verification reviewed successfully', status },
    };

  } catch (error: any) {
    context.error('Error:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to review verification' },
    };
  }
}

app.http('reviewKvkVerification', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/kvk-verification/review',
  handler: adminEndpoint(handler),
});
