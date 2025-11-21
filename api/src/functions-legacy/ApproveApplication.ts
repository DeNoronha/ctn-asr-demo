/**
 * Approve Application Function
 * POST /api/v1/applications/{id}/approve
 * Approves a membership application and creates the member
 */

import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../utils/database';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { addVersionHeaders } from '../middleware/versioning';
import { handleError } from '../utils/errors';

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

      // Convert country name to ISO 2-letter code
      const countryCodeMap: Record<string, string> = {
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'Germany': 'DE',
        'France': 'FR',
        'United Kingdom': 'GB',
        'Luxembourg': 'LU',
        'Austria': 'AT',
        'Switzerland': 'CH',
        'Italy': 'IT',
        'Spain': 'ES',
        'Portugal': 'PT',
        'Poland': 'PL',
        'Czech Republic': 'CZ',
        'Denmark': 'DK',
        'Sweden': 'SE',
        'Norway': 'NO',
        'Finland': 'FI'
      };

      const countryCode = application.country && application.country.length === 2
        ? application.country // Already an ISO code
        : countryCodeMap[application.country] || 'NL'; // Convert from name or default to NL

      // 1. Create party_reference first
      const partyResult = await client.query(
        `INSERT INTO party_reference (
          party_class,
          party_type
        ) VALUES ($1, $2)
        RETURNING party_id`,
        ['LEGAL_ENTITY', 'ORGANIZATION']
      );

      const partyId = partyResult.rows[0].party_id;

      // 2. Create legal entity with KvK verification data
      const legalEntityResult = await client.query(
        `INSERT INTO legal_entity (
          party_id,
          primary_legal_name,
          status,
          country_code,
          city,
          postal_code,
          address_line1,
          kvk_document_url,
          kvk_verification_status,
          kvk_verification_notes,
          kvk_api_response,
          document_uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING legal_entity_id`,
        [
          partyId,
          application.legal_name,
          'ACTIVE',
          countryCode,
          application.city,
          application.postal_code,
          application.company_address,
          application.kvk_document_url,
          application.kvk_verification_status || 'pending',
          application.kvk_verification_notes,
          application.kvk_extracted_data, // JSONB - store as kvk_api_response
          application.dt_created // Use application creation time as document upload time
        ]
      );

      const legalEntityId = legalEntityResult.rows[0].legal_entity_id;

      // 3. Add KvK number as identifier
      if (application.kvk_number) {
        await client.query(
          `INSERT INTO legal_entity_number (
            legal_entity_id,
            identifier_type,
            identifier_value
          ) VALUES ($1, $2, $3)`,
          [legalEntityId, 'KVK', application.kvk_number]
        );
      }

      // 4. Create member record (using legal_entity_id as org_id and extracting domain from email)
      const domain = application.applicant_email.split('@')[1] || 'unknown.com';
      await client.query(
        `INSERT INTO members (
          org_id,
          legal_entity_id,
          legal_name,
          status,
          membership_level,
          domain,
          kvk,
          email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          legalEntityId.toString(),
          legalEntityId,
          application.legal_name,
          'ACTIVE',
          application.membership_type || 'BASIC',
          domain,
          application.kvk_number || null,
          application.applicant_email
        ]
      );

      // 5. Create contact
      await client.query(
        `INSERT INTO legal_entity_contact (
          legal_entity_id,
          contact_type,
          full_name,
          email,
          phone,
          job_title,
          is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          legalEntityId,
          'PRIMARY',
          application.applicant_name,
          application.applicant_email,
          application.applicant_phone || null,
          application.applicant_job_title || null,
          true
        ]
      );

      // 6. Update application status
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
