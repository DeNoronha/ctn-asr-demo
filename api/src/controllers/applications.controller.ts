/**
 * Applications Controller
 *
 * Handles membership application operations.
 * Applications track the membership request workflow from submission to approval/rejection.
 *
 * @module controllers/applications
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert country names to ISO 3166-1 alpha-2 codes
 */
function getCountryCode(countryNameOrCode: string | null | undefined): string {
  if (!countryNameOrCode) return 'NL';

  const normalized = countryNameOrCode.trim().toUpperCase();

  // If it's already a 2-character code, return it
  if (normalized.length === 2) return normalized;

  // Country name to ISO code mapping
  const countryMap: Record<string, string> = {
    'NETHERLANDS': 'NL',
    'NEDERLAND': 'NL',
    'GERMANY': 'DE',
    'BELGIUM': 'BE',
    'BELGIE': 'BE',
    'BELGIQUE': 'BE',
    'FRANCE': 'FR',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    'SPAIN': 'ES',
    'ITALY': 'IT',
    'PORTUGAL': 'PT',
    'POLAND': 'PL',
    'SWEDEN': 'SE',
    'DENMARK': 'DK',
    'NORWAY': 'NO',
    'FINLAND': 'FI',
    'AUSTRIA': 'AT',
    'SWITZERLAND': 'CH',
    'LUXEMBOURG': 'LU',
  };

  return countryMap[normalized] || 'NL'; // Default to NL if not found
}

// ============================================================================
// APPLICATION OPERATIONS
// ============================================================================

/**
 * GET /v1/applications
 * Get applications with pagination and filtering
 */
export async function getApplications(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { status, page = '1', limit = '50' } = req.query;

    let query = `SELECT * FROM applications WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY submitted_at DESC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

/**
 * POST /v1/applications/:id/approve
 * Approve an application and create member entities
 * Uses transaction to ensure atomicity
 */
export async function approveApplication(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  const { id } = req.params;

  try {
    await client.query('BEGIN');

    // 1. Get application details
    const appResult = await client.query(`
      SELECT * FROM applications WHERE application_id = $1
    `, [id]);

    if (appResult.rows.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const application = appResult.rows[0];

    // 2. Create party_reference
    const partyId = randomUUID();
    await client.query(`
      INSERT INTO party_reference (party_id, party_type, dt_created)
      VALUES ($1, 'LEGAL_ENTITY', NOW())
    `, [partyId]);

    // 3. Create legal_entity
    const legalEntityId = randomUUID();
    await client.query(`
      INSERT INTO legal_entity (
        legal_entity_id, party_id, primary_legal_name,
        address_line1, postal_code, city, country_code,
        kvk_document_url, kvk_verification_status,
        status, membership_level, dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10, NOW(), NOW())
    `, [
      legalEntityId, partyId, application.legal_name,
      application.company_address, application.postal_code,
      application.city, getCountryCode(application.country),
      application.kvk_document_url, application.kvk_verification_status || 'pending',
      application.membership_type || 'BASIC'
    ]);

    // 4. Create primary contact
    const contactId = randomUUID();
    await client.query(`
      INSERT INTO legal_entity_contact (
        legal_entity_contact_id, legal_entity_id, contact_type,
        full_name, job_title, email, phone, is_primary,
        dt_created, dt_modified
      )
      VALUES ($1, $2, 'PRIMARY', $3, $4, $5, $6, true, NOW(), NOW())
    `, [
      contactId, legalEntityId, application.applicant_name,
      application.applicant_job_title, application.applicant_email,
      application.applicant_phone
    ]);

    // 5. Create KvK identifier
    const identifierId = randomUUID();
    await client.query(`
      INSERT INTO legal_entity_number (
        legal_entity_reference_id, legal_entity_id,
        identifier_type, identifier_value, country_code,
        validation_status, dt_created, dt_modified
      )
      VALUES ($1, $2, 'KVK', $3, 'NL', 'PENDING', NOW(), NOW())
    `, [identifierId, legalEntityId, application.kvk_number]);

    // 5a. Create verification history record if KvK document was uploaded
    if (application.kvk_document_url) {
      const verificationId = randomUUID();
      await client.query(`
        INSERT INTO identifier_verification_history (
          verification_id, legal_entity_id, identifier_id,
          identifier_type, identifier_value, verification_method,
          verification_status, document_blob_url, document_filename,
          document_mime_type, verified_by, verified_at,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, 'KVK', $4, 'APPLICATION_UPLOAD', $5, $6, $7, 'application/pdf', 'system', NOW(), NOW(), NOW())
      `, [
        verificationId,
        legalEntityId,
        identifierId,
        application.kvk_number,
        application.kvk_verification_status || 'PENDING',
        application.kvk_document_url,
        application.kvk_document_filename || 'kvk-document.pdf'
      ]);
    }

    // 6. Create LEI identifier if provided
    if (application.lei) {
      const leiId = randomUUID();
      await client.query(`
        INSERT INTO legal_entity_number (
          legal_entity_reference_id, legal_entity_id,
          identifier_type, identifier_value,
          validation_status, dt_created, dt_modified
        )
        VALUES ($1, $2, 'LEI', $3, 'PENDING', NOW(), NOW())
      `, [leiId, legalEntityId, application.lei]);
    }

    // 6a. Members table dropped (Dec 12, 2025) - legal_entity IS the member now

    // 7. Update application status and link to created legal_entity
    await client.query(`
      UPDATE applications
      SET status = 'approved',
          reviewed_at = NOW(),
          dt_updated = NOW(),
          created_member_id = $2
      WHERE application_id = $1
    `, [id, legalEntityId]);

    // Return the created member details
    const memberResult = await client.query(`
      SELECT le.*, pr.party_type
      FROM legal_entity le
      JOIN party_reference pr ON le.party_id = pr.party_id
      WHERE le.legal_entity_id = $1
    `, [legalEntityId]);

    await client.query('COMMIT');

    console.log('Application approved successfully:', {
      applicationId: id,
      legalEntityId: legalEntityId,
      email: application.applicant_email
    });

    res.json({
      message: 'Application approved and member created successfully',
      member: memberResult.rows[0],
      legalEntityId: legalEntityId
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error approving application:', {
      applicationId: id,
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      error: 'Failed to approve application',
      detail: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
}

/**
 * POST /v1/applications/:id/reject
 * Reject an application with a reason
 */
export async function rejectApplication(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { reason } = req.body;

    const { rows } = await pool.query(`
      UPDATE applications SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), dt_updated = NOW()
      WHERE application_id = $2
      RETURNING *
    `, [reason, id]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
}
