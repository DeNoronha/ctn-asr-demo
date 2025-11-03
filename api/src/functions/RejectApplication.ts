/**
 * Reject Application Function
 * POST /api/v1/applications/{id}/reject
 * Rejects a membership application
 */

import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../utils/database';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders } from '../middleware/versioning';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const pool = getPool();
  const applicationId = request.params.id;
  
  try {
    // Get request body
    const body = await request.json() as any;
    const reviewNotes = body.reviewNotes || body.reason || '';
    const reviewedBy = request.userId || request.userEmail || 'unknown';

    if (!reviewNotes) {
      return addVersionHeaders({
        status: 400,
        jsonBody: {
          error: 'Review notes/reason required for rejection'
        }
      }, 'v1');
    }

    context.log(`Rejecting application ${applicationId} by ${reviewedBy}`);

    // Update application status
    const result = await pool.query(
      `UPDATE applications 
       SET status = $1, 
           reviewed_at = NOW(), 
           reviewed_by = $2,
           review_notes = $3
       WHERE application_id = $4 AND status = $5
       RETURNING legal_name, applicant_email`,
      ['rejected', reviewedBy, reviewNotes, applicationId, 'pending']
    );

    if (result.rows.length === 0) {
      return addVersionHeaders({
        status: 404,
        jsonBody: {
          error: 'Application not found or already processed'
        }
      }, 'v1');
    }

    context.log(`✓ Application ${applicationId} rejected`);

    return addVersionHeaders({
      status: 200,
      jsonBody: {
        message: 'Application rejected',
        applicationId: applicationId
      }
    }, 'v1');

  } catch (error: any) {
    context.error('Error rejecting application:', error);
    return addVersionHeaders({
      status: 500,
      jsonBody: {
        error: 'Failed to reject application',
        message: error.message
      }
    }, 'v1');
  }
}

app.http('RejectApplication', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/applications/{id}/reject',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
