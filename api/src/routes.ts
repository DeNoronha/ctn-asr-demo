/**
 * Express Routes - Minimal Implementation
 * Imports existing function handlers and exposes them as Express routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';

// Create router
export const router = Router();

// Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Import utilities
import { getPool } from './utils/database';
import { withTransaction } from './utils/transaction';

// Simple auth middleware for Express (will be enhanced later)
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }
  // For now, just pass through - full JWT validation to be added
  // Store token for downstream use
  (req as any).token = authHeader.substring(7);
  next();
}

// ============================================================================
// VERSION ENDPOINT
// ============================================================================
router.get('/v1/version', (req, res) => {
  res.json({
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'production',
    runtime: 'container-apps',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MEMBERS
// ============================================================================
router.get('/v1/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { page = '1', limit = '50', search, status } = req.query;

    // Use the members_view which properly joins legal_entity with legal_entity_number
    let query = `
      SELECT org_id, legal_name, kvk, lei, domain, status, membership_level,
             created_at, metadata
      FROM members_view
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (legal_name ILIKE $${paramIndex} OR kvk ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY legal_name ASC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM members_view WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (search) {
      countQuery += ` AND (legal_name ILIKE $${countParamIndex} OR kvk ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }
    const { rows: countRows } = await pool.query(countQuery, countParams);

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countRows[0].count),
        totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.get('/v1/members/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Use legal_entity_full view for complete member details
    const { rows } = await pool.query(`
      SELECT legal_entity_id as org_id, primary_legal_name as legal_name,
             domain, status, membership_level, party_id,
             address_line1, address_line2, postal_code, city, province, country_code,
             entity_legal_form, registered_at, dt_created, dt_modified,
             identifiers, contacts, endpoints, metadata
      FROM legal_entity_full
      WHERE legal_entity_id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// ============================================================================
// APPLICATIONS
// ============================================================================
router.get('/v1/applications', requireAuth, async (req: Request, res: Response) => {
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
});

// ============================================================================
// AUDIT LOGS
// ============================================================================
router.get('/v1/audit-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { page = '1', limit = '100' } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { rows } = await pool.query(`
      SELECT * FROM audit_log
      ORDER BY dt_created DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit as string), offset]);

    // Get total count
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM audit_log');

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countRows[0].count),
        totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================================================
// TASKS
// ============================================================================
router.get('/v1/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { status, page = '1', limit = '50' } = req.query;

    let query = `SELECT * FROM admin_tasks WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM admin_tasks WHERE 1=1`;
    const countParams: any[] = [];
    if (status) {
      countQuery += ` AND status = $1`;
      countParams.push(status);
    }
    const { rows: countRows } = await pool.query(countQuery, countParams);

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countRows[0].count),
        totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ============================================================================
// MEMBER REGISTRATION (PUBLIC - NO AUTH)
// ============================================================================
router.post('/v1/register-member', upload.single('kvkDocument'), async (req, res) => {
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
      return res.status(400).json({ error: 'Missing required fields', missingFields });
    }

    // Validate file
    if (!file) {
      return res.status(400).json({ error: 'KvK document is required' });
    }

    // Check for duplicates
    const { rows: existingEmail } = await pool.query(
      `SELECT application_id FROM applications WHERE applicant_email = $1 AND status IN ('pending', 'under_review')`,
      [body.contactEmail]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Application already exists for this email' });
    }

    const { rows: existingKvK } = await pool.query(
      `SELECT org_id FROM members WHERE kvk = $1`,
      [body.kvkNumber]
    );
    if (existingKvK.length > 0) {
      return res.status(409).json({ error: 'KvK number already registered' });
    }

    // Upload document to blob storage
    const { BlobStorageService } = await import('./services/blobStorageService');
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
          membership_type, terms_accepted, gdpr_consent, status, submitted_at,
          kvk_document_url, kvk_verification_status, kvk_verification_notes, kvk_extracted_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17, $18, $19, $20)
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
});

// ============================================================================
// MEMBER PORTAL - GET AUTHENTICATED MEMBER
// ============================================================================
router.get('/v1/member', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // For now, return placeholder - full JWT decoding will be added
    // TODO: Decode JWT to get user's oid and fetch their member record

    res.status(501).json({
      error: 'Not Implemented',
      message: 'Member portal endpoint requires JWT decoding - coming soon'
    });
  } catch (error: any) {
    console.error('Error fetching authenticated member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});
