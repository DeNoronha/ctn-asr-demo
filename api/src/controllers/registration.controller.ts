/**
 * Registration Controller
 *
 * Handles public member registration with KvK document upload.
 * This is a PUBLIC endpoint (no authentication required).
 *
 * @module controllers/registration
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { withTransaction } from '../utils/transaction';

// ============================================================================
// PUBLIC REGISTRATION
// ============================================================================

/**
 * POST /v1/register-member
 * Public endpoint for member registration with KvK document upload
 * No authentication required
 */
export async function registerMember(req: Request, res: Response): Promise<void> {
  const requestId = randomUUID();
  const pool = getPool();

  try {
    console.log(`[${requestId}] Processing registration request`);

    // Get form data
    const body = req.body;
    const file = req.file;

    // Validate required fields
    const requiredFields = [
      'legalName', 'kvkNumber', 'companyAddress', 'postalCode', 'city', 'country',
      'contactName', 'contactEmail', 'contactPhone', 'jobTitle',
      'membershipType', 'termsAccepted', 'gdprConsent'
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ error: 'Missing required fields', missingFields });
      return;
    }

    // Validate file
    if (!file) {
      res.status(400).json({ error: 'KvK document is required' });
      return;
    }

    // Check for duplicates
    const { rows: existingEmail } = await pool.query(
      `SELECT application_id FROM applications WHERE applicant_email = $1 AND status IN ('pending', 'under_review')`,
      [body.contactEmail]
    );
    if (existingEmail.length > 0) {
      res.status(409).json({ error: 'Application already exists for this email' });
      return;
    }

    const { rows: existingKvK } = await pool.query(
      `SELECT legal_entity_id FROM vw_legal_entities WHERE kvk = $1`,
      [body.kvkNumber]
    );
    if (existingKvK.length > 0) {
      res.status(409).json({ error: 'KvK number already registered' });
      return;
    }

    // Upload document to blob storage
    const { BlobStorageService } = await import('../services/blobStorageService');
    const blobService = new BlobStorageService();
    const applicationId = randomUUID();
    const blobUrl = await blobService.uploadDocument(
      `applications/${applicationId}`,
      file.originalname || 'kvk-document.pdf',
      file.buffer,
      file.mimetype
    );

    // Create application record
    const result = await withTransaction(pool, console as any, async (tx) => {
      const { rows } = await tx.query(`
        INSERT INTO applications (
          application_id, applicant_email, applicant_name, applicant_job_title, applicant_phone,
          legal_name, kvk_number, lei, company_address, postal_code, city, country,
          membership_type, terms_accepted, gdpr_consent, status,
          kvk_document_url, kvk_verification_status, kvk_verification_notes, kvk_extracted_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING application_id, applicant_email, legal_name, kvk_number, membership_type, status, submitted_at, kvk_verification_status
      `, [
        applicationId,
        body.contactEmail,
        body.contactName,
        body.jobTitle,
        body.contactPhone,
        body.legalName,
        body.kvkNumber,
        body.lei || null,
        body.companyAddress,
        body.postalCode,
        body.city,
        body.country,
        body.membershipType.toLowerCase(),
        body.termsAccepted === 'true',
        body.gdprConsent === 'true',
        'pending',
        blobUrl,
        'pending',
        JSON.stringify({ flags: [], message: 'Pending verification' }),
        JSON.stringify({})
      ]);

      return rows[0];
    });

    console.log(`[${requestId}] Application created:`, result.application_id);

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.application_id,
      status: result.status,
      submittedAt: result.submitted_at,
      verificationStatus: result.kvk_verification_status,
      verificationMessage: 'Your KvK document has been uploaded. Our team will review it.',
      nextSteps: [
        'You will receive a confirmation email shortly',
        'Our admin team will review your application within 2-3 business days',
        'You will be notified by email once your application is approved'
      ]
    });

  } catch (error: any) {
    console.error(`[${requestId}] Registration failed:`, error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred while processing your registration. Please try again later.',
      errorId: requestId
    });
  }
}
