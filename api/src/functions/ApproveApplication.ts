/**
 * Approve Application Function
 * POST /api/v1/applications/{id}/approve
 * Approves a membership application and creates the member
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
    const reviewNotes = body.reviewNotes || '';
    const reviewedBy = request.userId || request.userEmail || 'unknown';

    context.log(`Approving application ${applicationId} by ${reviewedBy}`);

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get application details
      const appResult = await client.query(
        'SELECT * FROM applications WHERE application_id = $1 AND status = $2',
        [applicationId, 'pending']
      );

      if (appResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return addVersionHeaders({
          status: 404,
          jsonBody: {
            error: 'Application not found or already processed'
          }
        }, 'v1');
      }

      const application = appResult.rows[0];

      // Create legal entity
      const legalEntityResult = await client.query(
        `INSERT INTO legal_entity (
          primary_legal_name,
          status,
          country_code,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING legal_entity_id`,
        [application.legal_name, 'active', application.country || 'NL']
      );

      const legalEntityId = legalEntityResult.rows[0].legal_entity_id;

      // Add KvK number as identifier
      if (application.kvk_number) {
        await client.query(
          `INSERT INTO legal_entity_number (
            legal_entity_id,
            identifier_type,
            identifier_value,
            is_primary,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [legalEntityId, 'KVK', application.kvk_number, true]
        );
      }

      // Create member record
      await client.query(
        `INSERT INTO members (
          org_id,
          legal_name,
          status,
          membership_tier,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [
          legalEntityId,
          application.legal_name,
          'active',
          application.membership_type || 'standard'
        ]
      );

      // Create contact
      await client.query(
        `INSERT INTO contacts (
          legal_entity_id,
          name,
          email,
          phone,
          job_title,
          is_primary,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          legalEntityId,
          application.applicant_name,
          application.applicant_email,
          application.applicant_phone,
          application.job_title,
          true
        ]
      );

      // Update application status
      await client.query(
        `UPDATE applications 
         SET status = $1, 
             reviewed_at = NOW(), 
             reviewed_by = $2,
             review_notes = $3
         WHERE application_id = $4`,
        ['approved', reviewedBy, reviewNotes, applicationId]
      );

      await client.query('COMMIT');

      context.log(`✓ Application ${applicationId} approved successfully, created member ${legalEntityId}`);

      return addVersionHeaders({
        status: 200,
        jsonBody: {
          message: 'Application approved successfully',
          legalEntityId: legalEntityId,
          applicationId: applicationId
        }
      }, 'v1');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    context.error('Error approving application:', error);
    return addVersionHeaders({
      status: 500,
      jsonBody: {
        error: 'Failed to approve application',
        message: error.message
      }
    }, 'v1');
  }
}

app.http('ApproveApplication', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/applications/{id}/approve',
  authLevel: 'anonymous',
  handler: adminEndpoint(handler)
});
