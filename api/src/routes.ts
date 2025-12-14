/**
 * Express Routes - Minimal Implementation
 * Imports existing function handlers and exposes them as Express routes
 *
 * Last Updated: 2025-11-20 - Added GET routes for contacts and identifiers
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
import { validateJwtToken, JwtPayload } from './middleware/auth';
import { dnsVerificationService } from './services/dnsVerificationService';
import { cacheMiddleware, invalidateCacheForUser } from './middleware/cache';
import { CacheTTL } from './utils/cache';

// Express auth middleware using full JWT validation
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }

  try {
    const token = authHeader.substring(7);

    // Create a minimal InvocationContext-like object for the validator
    const context = {
      invocationId: randomUUID(),
      log: console.log,
      warn: console.warn,
      error: console.error,
      trace: console.trace,
      debug: console.debug,
    } as any;

    // Validate JWT token with signature verification
    const payload: JwtPayload = await validateJwtToken(token, context);

    // Attach user info to request
    (req as any).user = payload;
    (req as any).userId = payload.oid || payload.sub;
    (req as any).userEmail = payload.email || payload.preferred_username || payload.upn;
    (req as any).userRoles = payload.roles || [];
    (req as any).isM2M = !payload.oid && (!!payload.azp || !!payload.appid);
    (req as any).clientId = payload.azp || payload.appid;

    next();
  } catch (error: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid token'
    });
  }
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

    // Use vw_legal_entities view for member listing
    let query = `
      SELECT legal_entity_id, primary_legal_name as legal_name, kvk, lei, euid, eori, duns, domain, status, membership_level,
             dt_created as created_at, metadata, contact_count, endpoint_count
      FROM vw_legal_entities
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (primary_legal_name ILIKE $${paramIndex} OR kvk ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY primary_legal_name ASC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM vw_legal_entities WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (search) {
      countQuery += ` AND (primary_legal_name ILIKE $${countParamIndex} OR kvk ILIKE $${countParamIndex})`;
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

// Alias for /v1/members - used by admin portal
router.get('/v1/all-members', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { page = '1', page_size = '50', search, status } = req.query;
    const limit = page_size; // all-members uses page_size param

    // Use vw_legal_entities view for member listing
    let query = `
      SELECT legal_entity_id, primary_legal_name as legal_name, kvk, lei, euid, eori, duns, domain, status, membership_level,
             dt_created as created_at, metadata, contact_count, endpoint_count
      FROM vw_legal_entities
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (primary_legal_name ILIKE $${paramIndex} OR kvk ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY primary_legal_name ASC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM vw_legal_entities WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (search) {
      countQuery += ` AND (primary_legal_name ILIKE $${countParamIndex} OR kvk ILIKE $${countParamIndex})`;
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

// GET /v1/members/:id endpoint removed (Dec 12, 2025)
// - Used vw_legal_entity_full view which was dropped
// - getMember() function was never called from UI
// - Admin portal fetches contacts, endpoints, identifiers separately

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
      `SELECT legal_entity_id FROM vw_legal_entities WHERE kvk = $1`,
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
});

// ============================================================================
// MEMBER PORTAL - GET AUTHENTICATED MEMBER
// ============================================================================
router.get('/v1/member', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const userId = (req as any).userId;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User email not found in token' });
    }

    // Query member data with identifiers in a single query (optimized N+1 → 1)
    // Now uses legal_entity directly (members table dropped Dec 12, 2025)
    let result = await pool.query(
      `
      SELECT
        le.legal_entity_id as "organizationId",
        le.primary_legal_name as "legalName",
        v.lei,
        v.kvk,
        le.domain,
        le.status,
        le.membership_level as "membershipLevel",
        le.dt_created as "createdAt",
        le.primary_legal_name as "entityName",
        le.entity_legal_form as "entityType",
        le.legal_entity_id as "legalEntityId",
        c.full_name as "contactName",
        c.email,
        c.job_title as "jobTitle",
        COALESCE(
          json_agg(
            json_build_object(
              'identifierType', len.identifier_type,
              'identifierValue', len.identifier_value,
              'countryCode', len.country_code,
              'registryName', len.registry_name,
              'registryUrl', len.registry_url,
              'validationStatus', len.validation_status
            )
            ORDER BY
              CASE len.identifier_type
                WHEN 'LEI' THEN 1
                WHEN 'EUID' THEN 2
                WHEN 'KVK' THEN 3
                ELSE 4
              END,
              len.identifier_type
          ) FILTER (WHERE len.identifier_type IS NOT NULL),
          '[]'::json
        ) as "registryIdentifiers"
      FROM legal_entity le
      LEFT JOIN vw_legal_entities v ON le.legal_entity_id = v.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
        AND (len.is_deleted = false OR len.is_deleted IS NULL)
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      GROUP BY le.legal_entity_id, le.primary_legal_name, v.lei, v.kvk, le.domain, le.status,
               le.membership_level, le.dt_created, le.entity_legal_form, c.full_name, c.email, c.job_title
      LIMIT 1
    `,
      [userEmail]
    );

    // If no result, try matching by domain from email
    if (result.rows.length === 0 && userEmail) {
      const emailDomain = userEmail.split('@')[1];
      result = await pool.query(
        `
        SELECT
          le.legal_entity_id as "organizationId",
          le.primary_legal_name as "legalName",
          v.lei,
          v.kvk,
          le.domain,
          le.status,
          le.membership_level as "membershipLevel",
          le.dt_created as "createdAt",
          le.primary_legal_name as "entityName",
          le.entity_legal_form as "entityType",
          le.legal_entity_id as "legalEntityId",
          COALESCE(
            json_agg(
              json_build_object(
                'identifierType', len.identifier_type,
                'identifierValue', len.identifier_value,
                'countryCode', len.country_code,
                'registryName', len.registry_name,
                'registryUrl', len.registry_url,
                'validationStatus', len.validation_status
              )
              ORDER BY
                CASE len.identifier_type
                  WHEN 'LEI' THEN 1
                  WHEN 'EUID' THEN 2
                  WHEN 'KVK' THEN 3
                  ELSE 4
                END,
                len.identifier_type
            ) FILTER (WHERE len.identifier_type IS NOT NULL),
            '[]'::json
          ) as "registryIdentifiers"
        FROM legal_entity le
        LEFT JOIN vw_legal_entities v ON le.legal_entity_id = v.legal_entity_id
        LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
          AND (len.is_deleted = false OR len.is_deleted IS NULL)
        WHERE le.domain = $1 AND le.is_deleted = false
        GROUP BY le.legal_entity_id, le.primary_legal_name, v.lei, v.kvk, le.domain, le.status,
                 le.membership_level, le.dt_created, le.entity_legal_form
        LIMIT 1
      `,
        [emailDomain]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'No member data found for this user',
        email: userEmail,
        userId: userId,
      });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching authenticated member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// ============================================================================
// MEMBER API TOKENS
// ============================================================================
router.get('/v1/member/tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal_entity_id from user's email (members table dropped Dec 12, 2025)
    const entityResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `, [userEmail]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id: legalEntityId } = entityResult.rows[0];

    // Get all API tokens for this legal entity
    const tokensResult = await pool.query(`
      SELECT
        jti,
        token_type,
        issued_at,
        expires_at,
        revoked,
        metadata
      FROM issued_tokens
      WHERE legal_entity_id = $1
      ORDER BY issued_at DESC
      LIMIT 50
    `, [legalEntityId]);

    res.json({ tokens: tokensResult.rows });
  } catch (error: any) {
    console.error('Error fetching member tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

router.post('/v1/member/tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { description, expiresInDays = 365 } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal_entity_id from user's email (members table dropped Dec 12, 2025)
    const entityResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `, [userEmail]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id: legalEntityId } = entityResult.rows[0];

    // Generate new JWT token (simplified - in production use proper JWT library)
    const crypto = require('crypto');
    const jti = `api-${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    // Store token in database
    await pool.query(`
      INSERT INTO issued_tokens (
        jti,
        token_type,
        legal_entity_id,
        issued_at,
        expires_at,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [jti, 'API', legalEntityId, now, expiresAt, JSON.stringify({ description })]);

    res.status(201).json({
      jti,
      token_type: 'API',
      issued_at: now,
      expires_at: expiresAt,
      description
    });
  } catch (error: any) {
    console.error('Error creating member token:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

router.delete('/v1/member/tokens/:tokenId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { tokenId } = req.params;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal_entity_id from user's email (members table dropped Dec 12, 2025)
    const entityResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `, [userEmail]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id: legalEntityId } = entityResult.rows[0];

    // Revoke the token (only if it belongs to this legal entity)
    const result = await pool.query(`
      UPDATE issued_tokens
      SET revoked = true
      WHERE jti = $1 AND legal_entity_id = $2
      RETURNING jti
    `, [tokenId, legalEntityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found or does not belong to you' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error revoking member token:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// ============================================================================
// MEMBER CONTACTS
// ============================================================================
router.get('/v1/member/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal entity ID from user's email
    const legalEntityResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (legalEntityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    const { legal_entity_id } = legalEntityResult.rows[0];

    // Get all contacts for this legal entity
    const { rows } = await pool.query(`
      SELECT legal_entity_contact_id, legal_entity_id, contact_type, full_name, email,
             phone, mobile, job_title, department, preferred_language, preferred_contact_method,
             is_primary, is_active, first_name, last_name, dt_created, dt_modified
      FROM legal_entity_contact
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY is_primary DESC, full_name ASC
    `, [legal_entity_id]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching member contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.put('/v1/member/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { contactId } = req.params;
    const { contact_type, full_name, email, phone, mobile, job_title, department, is_primary, preferred_contact_method } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal entity ID from user's email
    const legalEntityResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (legalEntityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    const { legal_entity_id } = legalEntityResult.rows[0];

    // Verify the contact belongs to this legal entity
    const contactCheck = await pool.query(`
      SELECT legal_entity_contact_id FROM legal_entity_contact
      WHERE legal_entity_contact_id = $1 AND legal_entity_id = $2 AND is_deleted = false
    `, [contactId, legal_entity_id]);

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found or does not belong to your organization' });
    }

    // Update the contact
    const { rowCount } = await pool.query(`
      UPDATE legal_entity_contact
      SET
        contact_type = COALESCE($1, contact_type),
        full_name = COALESCE($2, full_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        mobile = COALESCE($5, mobile),
        job_title = COALESCE($6, job_title),
        department = COALESCE($7, department),
        is_primary = COALESCE($8, is_primary),
        preferred_contact_method = COALESCE($9, preferred_contact_method),
        dt_modified = NOW()
      WHERE legal_entity_contact_id = $10 AND legal_entity_id = $11 AND is_deleted = false
    `, [contact_type, full_name, email, phone, mobile, job_title, department, is_primary, preferred_contact_method, contactId, legal_entity_id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact updated successfully' });
  } catch (error: any) {
    console.error('Error updating member contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// ============================================================================
// LEGAL ENTITIES
// ============================================================================
router.get('/v1/legal-entities', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { page = '1', limit = '50', search, status } = req.query;

    let query = `
      SELECT legal_entity_id, party_id, primary_legal_name, domain, status,
             membership_level, address_line1, address_line2, postal_code, city,
             province, country_code, entity_legal_form, registered_at,
             dt_created, dt_modified
      FROM legal_entity
      WHERE is_deleted = false
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (primary_legal_name ILIKE $${paramIndex} OR domain ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY primary_legal_name ASC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM legal_entity WHERE is_deleted = false`;
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (search) {
      countQuery += ` AND (primary_legal_name ILIKE $${countParamIndex} OR domain ILIKE $${countParamIndex})`;
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
    console.error('Error fetching legal entities:', error);
    res.status(500).json({ error: 'Failed to fetch legal entities' });
  }
});

router.get('/v1/legal-entities/:legalentityid', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT legal_entity_id, party_id, primary_legal_name, domain, status,
             membership_level, authentication_tier, authentication_method,
             address_line1, address_line2, postal_code, city,
             province, country_code, entity_legal_form, registered_at,
             dt_created, dt_modified
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching legal entity:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch legal entity', detail: error.message });
  }
});

router.post('/v1/legal-entities', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const legalEntityId = randomUUID();
    const partyId = randomUUID();

    const {
      primary_legal_name, domain, status = 'PENDING', membership_level = 'BASIC',
      address_line1, address_line2, postal_code, city, province, country_code,
      entity_legal_form, registered_at
    } = req.body;

    if (!primary_legal_name) {
      return res.status(400).json({ error: 'primary_legal_name is required' });
    }

    // Create party_reference first
    await pool.query(`
      INSERT INTO party_reference (party_id, party_type, dt_created)
      VALUES ($1, 'LEGAL_ENTITY', NOW())
    `, [partyId]);

    // Create legal entity
    const { rows } = await pool.query(`
      INSERT INTO legal_entity (
        legal_entity_id, party_id, primary_legal_name, domain, status, membership_level,
        address_line1, address_line2, postal_code, city, province, country_code,
        entity_legal_form, registered_at, dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `, [
      legalEntityId, partyId, primary_legal_name, domain, status, membership_level,
      address_line1, address_line2, postal_code, city, province, country_code,
      entity_legal_form, registered_at
    ]);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating legal entity:', error);
    res.status(500).json({ error: 'Failed to create legal entity' });
  }
});

router.put('/v1/legal-entities/:legalentityid', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const {
      primary_legal_name, domain, status, membership_level,
      address_line1, address_line2, postal_code, city, province, country_code,
      entity_legal_form, registered_at
    } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity SET
        primary_legal_name = COALESCE($1, primary_legal_name),
        domain = COALESCE($2, domain),
        status = COALESCE($3, status),
        membership_level = COALESCE($4, membership_level),
        address_line1 = COALESCE($5, address_line1),
        address_line2 = COALESCE($6, address_line2),
        postal_code = COALESCE($7, postal_code),
        city = COALESCE($8, city),
        province = COALESCE($9, province),
        country_code = COALESCE($10, country_code),
        entity_legal_form = COALESCE($11, entity_legal_form),
        registered_at = COALESCE($12, registered_at),
        dt_modified = NOW()
      WHERE legal_entity_id = $13 AND is_deleted = false
      RETURNING *
    `, [
      primary_legal_name, domain, status, membership_level,
      address_line1, address_line2, postal_code, city, province, country_code,
      entity_legal_form, registered_at, legalentityid
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating legal entity:', error);
    res.status(500).json({ error: 'Failed to update legal entity' });
  }
});

router.delete('/v1/legal-entities/:legalentityid', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();
  const client = await pool.connect();
  const { legalentityid } = req.params;

  try {
    await client.query('BEGIN');

    // 1. Check if legal entity exists
    const { rows: existing } = await client.query(`
      SELECT legal_entity_id FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (existing.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    // 2. Cascade soft-delete all related records
    // Note: Tables without is_deleted column are skipped (they use hard delete constraints)

    // Soft-delete contacts
    await client.query(`
      UPDATE legal_entity_contact SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    // Soft-delete identifiers
    await client.query(`
      UPDATE legal_entity_number SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    // Soft-delete endpoints
    await client.query(`
      UPDATE legal_entity_endpoint SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    // Soft-delete KvK registry data
    await client.query(`
      UPDATE kvk_registry_data SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    // Note: identifier_verification_history does not have is_deleted column
    // These records are preserved for audit purposes (FK has ON DELETE CASCADE if hard delete needed)

    // Members table dropped (Dec 12, 2025) - legal_entity IS the member now

    // 3. Soft-delete the legal entity itself
    await client.query(`
      UPDATE legal_entity SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1
    `, [legalentityid]);

    await client.query('COMMIT');

    console.log(`Cascade soft-deleted legal entity and related records: ${legalentityid}`);
    res.status(204).send();
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting legal entity:', error);
    res.status(500).json({ error: 'Failed to delete legal entity' });
  } finally {
    client.release();
  }
});

// ============================================================================
// CONTACTS
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT legal_entity_contact_id, legal_entity_id, contact_type, full_name, email,
             phone, mobile, job_title, department, preferred_language, preferred_contact_method,
             is_primary, is_active, first_name, last_name, dt_created, dt_modified
      FROM legal_entity_contact
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY is_primary DESC, full_name ASC
    `, [legalentityid]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching contacts:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch contacts', detail: error.message });
  }
});

router.post('/v1/legal-entities/:legalentityid/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const contactId = randomUUID();

    const { contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_contact (
        legal_entity_contact_id, legal_entity_id, contact_type, full_name, email,
        phone, job_title, is_primary, dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [contactId, legalentityid, contact_type || 'PRIMARY', full_name, email, phone, job_title, is_primary || false]);

    // Invalidate contacts cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legalentityid}/contacts`);
    invalidateCacheForUser(req, `/v1/member-contacts`);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/v1/legal-entities/:legalentityid/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_contact SET
        contact_type = COALESCE($1, contact_type),
        full_name = COALESCE($2, full_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        job_title = COALESCE($5, job_title),
        is_primary = COALESCE($6, is_primary),
        dt_modified = NOW()
      WHERE legal_entity_contact_id = $7 AND is_deleted = false
      RETURNING *
    `, [contact_type, full_name, email, phone, job_title, is_primary, contactId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Invalidate contacts cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/contacts`);
    invalidateCacheForUser(req, `/v1/member-contacts`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/v1/legal-entities/:legalentityid/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_contact SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_contact_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [contactId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Invalidate contacts cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/contacts`);
    invalidateCacheForUser(req, `/v1/member-contacts`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Legacy contact endpoints (used by admin portal and tests)
router.get('/v1/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { rows } = await pool.query(`
      SELECT legal_entity_contact_id, legal_entity_id, contact_type, full_name, email,
             phone, job_title, is_primary, dt_created, dt_modified
      FROM legal_entity_contact
      WHERE legal_entity_contact_id = $1 AND is_deleted = false
    `, [contactId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

router.post('/v1/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const contactId = randomUUID();

    const { legal_entity_id, contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    if (!legal_entity_id || !full_name || !email) {
      return res.status(400).json({ error: 'legal_entity_id, full_name and email are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_contact (
        legal_entity_contact_id, legal_entity_id, contact_type, full_name, email,
        phone, job_title, is_primary, dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [contactId, legal_entity_id, contact_type || 'PRIMARY', full_name, email, phone, job_title, is_primary || false]);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/v1/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_contact SET
        contact_type = COALESCE($1, contact_type),
        full_name = COALESCE($2, full_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        job_title = COALESCE($5, job_title),
        is_primary = COALESCE($6, is_primary),
        dt_modified = NOW()
      WHERE legal_entity_contact_id = $7 AND is_deleted = false
      RETURNING *
    `, [contact_type, full_name, email, phone, job_title, is_primary, contactId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/v1/contacts/:contactId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { rowCount } = await pool.query(`
      UPDATE legal_entity_contact SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_contact_id = $1 AND is_deleted = false
    `, [contactId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ============================================================================
// IDENTIFIERS
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/identifiers', requireAuth, cacheMiddleware(CacheTTL.IDENTIFIERS), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Join with legal_entity_number_type - lookup table is authoritative source for country
    const { rows } = await pool.query(`
      SELECT len.legal_entity_reference_id, len.legal_entity_id, len.identifier_type, len.identifier_value,
             lent.country_scope AS country_code,
             len.issued_by, len.validated_by, len.validation_status, len.validation_date,
             lent.type_name AS registry_name,
             lent.registry_url AS registry_url,
             len.issuing_authority, len.issued_at, len.expires_at,
             len.verification_status, len.verification_document_url, len.verification_notes,
             len.dt_created, len.dt_modified
      FROM legal_entity_number len
      LEFT JOIN legal_entity_number_type lent ON len.identifier_type = lent.type_code
      WHERE len.legal_entity_id = $1 AND len.is_deleted = false
      ORDER BY lent.display_order ASC, len.identifier_type ASC
    `, [legalentityid]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching identifiers:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch identifiers', detail: error.message });
  }
});

// Alias for /entities/{id}/identifiers (used by admin portal)
router.get('/v1/entities/:legalentityid/identifiers', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Join with legal_entity_number_type - lookup table is authoritative source for country
    const { rows } = await pool.query(`
      SELECT len.legal_entity_reference_id, len.legal_entity_id, len.identifier_type, len.identifier_value,
             lent.country_scope AS country_code,
             len.issued_by, len.validated_by, len.validation_status, len.validation_date,
             lent.type_name AS registry_name,
             lent.registry_url AS registry_url,
             len.issuing_authority, len.issued_at, len.expires_at,
             len.verification_status, len.verification_document_url, len.verification_notes,
             len.dt_created, len.dt_modified
      FROM legal_entity_number len
      LEFT JOIN legal_entity_number_type lent ON len.identifier_type = lent.type_code
      WHERE len.legal_entity_id = $1 AND len.is_deleted = false
      ORDER BY lent.display_order ASC, len.identifier_type ASC
    `, [legalentityid]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching identifiers (alias route):', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch identifiers', detail: error.message });
  }
});

router.post('/v1/legal-entities/:legalentityid/identifiers', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const identifierId = randomUUID();

    const { identifier_type, identifier_value, country_code, issuing_authority, issued_at, expires_at, verification_status } = req.body;

    if (!identifier_type || !identifier_value) {
      return res.status(400).json({ error: 'identifier_type and identifier_value are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_number (
        legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
        country_code, issuing_authority, issued_at, expires_at, verification_status,
        dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [identifierId, legalentityid, identifier_type, identifier_value, country_code, issuing_authority, issued_at, expires_at, verification_status || 'PENDING']);

    // Invalidate identifiers cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legalentityid}/identifiers`);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating identifier:', error);
    res.status(500).json({ error: 'Failed to create identifier' });
  }
});

// Alias for POST /entities/{id}/identifiers
router.post('/v1/entities/:legalentityid/identifiers', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const identifierId = randomUUID();

    const { identifier_type, identifier_value, issuing_authority, issued_at, expires_at, verification_status } = req.body;

    if (!identifier_type || !identifier_value) {
      return res.status(400).json({ error: 'identifier_type and identifier_value are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_number (
        legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
        issuing_authority, issued_at, expires_at, verification_status,
        dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [identifierId, legalentityid, identifier_type, identifier_value, issuing_authority, issued_at, expires_at, verification_status || 'PENDING']);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating identifier:', error);
    res.status(500).json({ error: 'Failed to create identifier' });
  }
});

router.get('/v1/identifiers/:identifierId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { identifierId } = req.params;

    const { rows } = await pool.query(`
      SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
             issuing_authority, issued_at, expires_at, verification_status,
             dt_created, dt_modified
      FROM legal_entity_number
      WHERE legal_entity_reference_id = $1 AND is_deleted = false
    `, [identifierId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Identifier not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching identifier:', error);
    res.status(500).json({ error: 'Failed to fetch identifier' });
  }
});

router.put('/v1/identifiers/:identifierId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { identifierId } = req.params;

    const {
      identifier_type,
      identifier_value,
      issuing_authority,
      issued_at,
      expires_at,
      verification_status,
      validation_status,
      registry_name,
      registry_url,
      country_code,
      verification_notes,
      validation_date,
    } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_number SET
        identifier_type = COALESCE($1, identifier_type),
        identifier_value = COALESCE($2, identifier_value),
        issuing_authority = COALESCE($3, issuing_authority),
        issued_at = COALESCE($4, issued_at),
        expires_at = COALESCE($5, expires_at),
        verification_status = COALESCE($6, verification_status),
        validation_status = COALESCE($7, validation_status),
        registry_name = COALESCE($8, registry_name),
        registry_url = COALESCE($9, registry_url),
        country_code = COALESCE($10, country_code),
        verification_notes = COALESCE($11, verification_notes),
        validation_date = COALESCE($12, validation_date),
        dt_modified = NOW()
      WHERE legal_entity_reference_id = $13 AND is_deleted = false
      RETURNING *
    `, [
      identifier_type,
      identifier_value,
      issuing_authority,
      issued_at,
      expires_at,
      verification_status,
      validation_status,
      registry_name,
      registry_url,
      country_code,
      verification_notes,
      validation_date,
      identifierId
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Identifier not found' });
    }

    // Invalidate identifiers cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/identifiers`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating identifier:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'uq_identifier') {
      return res.status(409).json({
        error: 'Duplicate identifier',
        message: 'An identifier with this type and value already exists for this legal entity'
      });
    }

    res.status(500).json({ error: 'Failed to update identifier' });
  }
});

router.delete('/v1/identifiers/:identifierId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { identifierId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_number SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_reference_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [identifierId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Identifier not found' });
    }

    // Invalidate identifiers cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/identifiers`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting identifier:', error);
    res.status(500).json({ error: 'Failed to delete identifier' });
  }
});

// Validate identifier against registry
router.post('/v1/identifiers/:identifierId/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { identifierId } = req.params;

    // Get the identifier
    const { rows, rowCount } = await pool.query(`
      SELECT len.legal_entity_reference_id, len.legal_entity_id, len.identifier_type, len.identifier_value,
             len.country_code, lent.registry_url
      FROM legal_entity_number len
      LEFT JOIN legal_entity_number_type lent ON len.identifier_type = lent.type_code
      WHERE len.legal_entity_reference_id = $1 AND len.is_deleted = false
    `, [identifierId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Identifier not found' });
    }

    const identifier = rows[0];
    let valid = false;
    const validationDetails: Record<string, any> = {
      validated_at: new Date().toISOString(),
      identifier_type: identifier.identifier_type,
      identifier_value: identifier.identifier_value,
    };

    // For now, do basic format validation based on type
    // TODO: Implement actual registry lookups (KVK API, GLEIF API, VIES API, etc.)
    switch (identifier.identifier_type) {
      case 'KVK':
        // KVK is 8 digits
        valid = /^\d{8}$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = '8 digits';
        break;
      case 'LEI':
        // LEI is 20 alphanumeric characters
        valid = /^[A-Z0-9]{20}$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = '20 alphanumeric characters';
        break;
      case 'EORI':
        // EORI is country code + up to 15 alphanumeric
        valid = /^[A-Z]{2}[A-Z0-9]{1,15}$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = 'Country code + up to 15 alphanumeric';
        break;
      case 'VAT':
        // VAT is country code + alphanumeric
        valid = /^[A-Z]{2}[A-Z0-9]+$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = 'Country code + alphanumeric';
        break;
      case 'DUNS':
        // DUNS is 9 digits
        valid = /^\d{9}$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = '9 digits';
        break;
      case 'RSIN':
        // RSIN is 9 digits
        valid = /^\d{9}$/.test(identifier.identifier_value);
        validationDetails.validation_method = 'format_check';
        validationDetails.expected_format = '9 digits';
        break;
      default:
        // For other types, assume valid if non-empty
        valid = identifier.identifier_value && identifier.identifier_value.length > 0;
        validationDetails.validation_method = 'presence_check';
    }

    // Update the identifier with validation result
    await pool.query(`
      UPDATE legal_entity_number
      SET validation_status = $2,
          validation_date = NOW(),
          dt_modified = NOW()
      WHERE legal_entity_reference_id = $1
    `, [identifierId, valid ? 'VALIDATED' : 'FAILED']);

    // Invalidate cache
    invalidateCacheForUser(req, `/v1/legal-entities/${identifier.legal_entity_id}/identifiers`);

    res.json({
      valid,
      details: validationDetails,
    });
  } catch (error: any) {
    console.error('Error validating identifier:', error);
    res.status(500).json({ error: 'Failed to validate identifier' });
  }
});

// ============================================================================
// IDENTIFIER VERIFICATION HISTORY
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/verifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        verification_id,
        legal_entity_id,
        identifier_id,
        identifier_type,
        identifier_value,
        verification_method,
        verification_status,
        document_blob_url,
        document_filename,
        document_mime_type,
        extracted_data,
        verified_by,
        verified_at,
        verification_notes,
        created_at as uploaded_at,
        updated_at
      FROM identifier_verification_history
      WHERE legal_entity_id = $1
      ORDER BY created_at DESC
    `, [legalentityid]);

    // Generate SAS URLs for blob documents
    const { BlobStorageService } = await import('./services/blobStorageService');
    const blobService = new BlobStorageService();

    const verificationsWithSas = await Promise.all(
      rows.map(async (row) => {
        let documentUrl = null;
        if (row.document_blob_url) {
          try {
            documentUrl = await blobService.getDocumentSasUrl(row.document_blob_url, 60);
          } catch (error) {
            console.error('Failed to generate SAS URL for document:', row.document_blob_url, error);
          }
        }
        return {
          ...row,
          document_url: documentUrl,
          document_blob_url: undefined // Remove internal blob URL from response
        };
      })
    );

    res.json({ verifications: verificationsWithSas });
  } catch (error: any) {
    console.error('Error fetching verification history:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch verification history', detail: error.message });
  }
});

// ============================================================================
// LEI REGISTRY DATA (GLEIF)
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/lei-registry', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get the LEI identifier for this legal entity
    const { rows: identifiers } = await pool.query(`
      SELECT legal_entity_reference_id, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'LEI' AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (identifiers.length === 0) {
      return res.status(404).json({ error: 'No LEI identifier found for this legal entity' });
    }

    const leiCode = identifiers[0].identifier_value;

    // Get the GLEIF registry data if available
    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        lei,
        legal_name,
        legal_address,
        headquarters_address,
        registration_authority_id,
        registered_as,
        registration_status,
        entity_status,
        initial_registration_date,
        last_update_date,
        next_renewal_date,
        managing_lou,
        raw_api_response,
        fetched_at,
        dt_created,
        dt_modified
      FROM gleif_registry_data
      WHERE legal_entity_id = $1
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      // Return basic info even if no stored GLEIF data
      return res.json({
        lei: leiCode,
        hasData: false,
        message: 'No GLEIF registry data stored. LEI identifier exists but detailed registry data has not been fetched yet.'
      });
    }

    const data = rows[0];
    res.json({
      lei: leiCode,
      hasData: true,
      data: {
        legalName: data.legal_name,
        legalAddress: data.legal_address,
        headquartersAddress: data.headquarters_address,
        registrationAuthority: data.registration_authority_id,
        registrationNumber: data.registered_as,
        registrationStatus: data.registration_status,
        entityStatus: data.entity_status,
        initialRegistrationDate: data.initial_registration_date,
        lastUpdateDate: data.last_update_date,
        nextRenewalDate: data.next_renewal_date,
        managingLou: data.managing_lou,
        rawResponse: data.raw_api_response
      },
      fetchedAt: data.fetched_at
    });
  } catch (error: any) {
    console.error('Error fetching LEI registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch LEI registry data', detail: error.message });
  }
});

// ============================================================================
// KVK REGISTRY DATA
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/kvk-registry', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // First check kvk_registry_data table (primary source - from KvK API)
    const { rows: kvkData } = await pool.query(`
      SELECT
        registry_data_id,
        kvk_number,
        company_name,
        legal_form,
        trade_names,
        formal_registration_date,
        material_registration_date,
        material_end_date,
        company_status,
        addresses,
        sbi_activities,
        total_employees,
        fulltime_employees,
        parttime_employees,
        kvk_profile_url,
        establishment_profile_url,
        fetched_at,
        last_verified_at,
        data_source,
        statutory_name,
        rsin,
        vestigingsnummer,
        ind_hoofdvestiging,
        ind_commerciele_vestiging,
        ind_non_mailing,
        primary_trade_name,
        rechtsvorm,
        total_branches,
        commercial_branches,
        non_commercial_branches,
        websites,
        geo_data
      FROM kvk_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (kvkData.length > 0) {
      // Return data from kvk_registry_data table
      return res.json(kvkData[0]);
    }

    // Fallback: Check identifier_verification_history for extracted data
    const { rows: identifiers } = await pool.query(`
      SELECT legal_entity_reference_id, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'KVK' AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (identifiers.length === 0) {
      return res.status(404).json({ error: 'No KvK identifier found for this legal entity' });
    }

    const kvkNumber = identifiers[0].identifier_value;
    const identifierId = identifiers[0].legal_entity_reference_id;

    // Get the most recent verification with extracted KvK API data
    const { rows } = await pool.query(`
      SELECT
        verification_id,
        extracted_data,
        verification_status,
        verification_method,
        verified_at,
        created_at
      FROM identifier_verification_history
      WHERE legal_entity_id = $1
        AND identifier_id = $2
        AND identifier_type = 'KVK'
        AND extracted_data IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, [legalentityid, identifierId]);

    if (rows.length === 0) {
      return res.json({
        kvkNumber,
        hasData: false,
        message: 'No KvK registry data available. Upload a KvK document or trigger verification.'
      });
    }

    res.json({
      kvkNumber,
      hasData: true,
      data: rows[0].extracted_data,
      verificationStatus: rows[0].verification_status,
      verificationMethod: rows[0].verification_method,
      verifiedAt: rows[0].verified_at,
      fetchedAt: rows[0].created_at
    });
  } catch (error: any) {
    console.error('Error fetching KvK registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch KvK registry data', detail: error.message });
  }
});

// Refresh address from existing KVK registry data (bezoekadres)
router.post('/v1/legal-entities/:legalentityid/refresh-address-from-kvk', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get KVK registry data with addresses
    const { rows: kvkData } = await pool.query(`
      SELECT addresses FROM kvk_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (kvkData.length === 0 || !kvkData[0].addresses) {
      return res.status(404).json({ error: 'No KVK registry data with addresses found' });
    }

    const addresses = typeof kvkData[0].addresses === 'string'
      ? JSON.parse(kvkData[0].addresses)
      : kvkData[0].addresses;

    // Find bezoekadres (visiting address)
    const bezoekadres = addresses.find(
      (addr: any) => addr.type === 'bezoekadres' || addr.type === 'Bezoekadres'
    ) || addresses[0];

    if (!bezoekadres) {
      return res.status(404).json({ error: 'No address found in KVK data' });
    }

    // Format address line based on country (NL, DE, BE formats)
    const formatAddressLine = (addr: any): string => {
      const country = addr.country || 'Nederland';
      const countryCode = country === 'Nederland' ? 'NL' :
                         country === 'Deutschland' || country === 'Germany' ? 'DE' :
                         country === 'België' || country === 'Belgium' || country === 'Belgique' ? 'BE' : 'NL';

      const houseNum = addr.houseNumber || '';
      const houseLetter = addr.houseLetter || '';
      const houseAddition = addr.houseNumberAddition || '';
      const street = addr.street || '';

      if (countryCode === 'DE') {
        return `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
      } else if (countryCode === 'BE') {
        return `${street} ${houseNum}${houseLetter}${houseAddition ? ' bus ' + houseAddition : ''}`.trim();
      } else {
        return `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
      }
    };

    const addressLine1 = formatAddressLine(bezoekadres);
    const postalCode = bezoekadres.postalCode || '';
    const city = bezoekadres.city || '';
    const country = bezoekadres.country || 'Nederland';
    const countryCode = country === 'Nederland' ? 'NL' :
                       country === 'Deutschland' || country === 'Germany' ? 'DE' :
                       country === 'België' || country === 'Belgium' || country === 'Belgique' ? 'BE' :
                       country.substring(0, 2).toUpperCase();

    // Update legal_entity address (force update, not just when empty)
    const { rowCount } = await pool.query(`
      UPDATE legal_entity
      SET
        address_line1 = $2,
        postal_code = $3,
        city = $4,
        country_code = $5,
        dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid, addressLine1, postalCode, city, countryCode]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json({
      message: 'Address updated from KVK bezoekadres',
      address: {
        address_line1: addressLine1,
        postal_code: postalCode,
        city,
        country_code: countryCode
      }
    });
  } catch (error: any) {
    console.error('Error refreshing address from KVK:', error);
    res.status(500).json({ error: 'Failed to refresh address', detail: error.message });
  }
});

// Bulk refresh addresses from KVK data for all entities with empty addresses
router.post('/v1/admin/refresh-all-addresses-from-kvk', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Find all legal entities with KVK data but empty addresses
    const { rows: entities } = await pool.query(`
      SELECT le.legal_entity_id, le.primary_legal_name, k.addresses
      FROM legal_entity le
      INNER JOIN kvk_registry_data k ON le.legal_entity_id = k.legal_entity_id AND k.is_deleted = false
      WHERE le.is_deleted = false
        AND (le.address_line1 IS NULL OR le.address_line1 = '')
        AND k.addresses IS NOT NULL
    `);

    const results: { updated: string[]; failed: string[] } = { updated: [], failed: [] };

    for (const entity of entities) {
      try {
        const addresses = typeof entity.addresses === 'string'
          ? JSON.parse(entity.addresses)
          : entity.addresses;

        const bezoekadres = addresses.find(
          (addr: any) => addr.type === 'bezoekadres' || addr.type === 'Bezoekadres'
        ) || addresses[0];

        if (!bezoekadres) continue;

        // Format address line
        const country = bezoekadres.country || 'Nederland';
        const countryCode = country === 'Nederland' ? 'NL' :
                           country === 'Deutschland' || country === 'Germany' ? 'DE' :
                           country === 'België' || country === 'Belgium' || country === 'Belgique' ? 'BE' :
                           country.substring(0, 2).toUpperCase();

        const houseNum = bezoekadres.houseNumber || '';
        const houseLetter = bezoekadres.houseLetter || '';
        const houseAddition = bezoekadres.houseNumberAddition || '';
        const street = bezoekadres.street || '';

        let addressLine1: string;
        if (countryCode === 'DE') {
          addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
        } else if (countryCode === 'BE') {
          addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? ' bus ' + houseAddition : ''}`.trim();
        } else {
          addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
        }

        await pool.query(`
          UPDATE legal_entity
          SET address_line1 = $2, postal_code = $3, city = $4, country_code = $5, dt_modified = NOW()
          WHERE legal_entity_id = $1
        `, [entity.legal_entity_id, addressLine1, bezoekadres.postalCode || '', bezoekadres.city || '', countryCode]);

        results.updated.push(entity.primary_legal_name);
      } catch (err) {
        results.failed.push(entity.primary_legal_name);
      }
    }

    res.json({
      message: `Updated ${results.updated.length} entities, ${results.failed.length} failed`,
      updated: results.updated,
      failed: results.failed
    });
  } catch (error: any) {
    console.error('Error bulk refreshing addresses:', error);
    res.status(500).json({ error: 'Failed to bulk refresh addresses', detail: error.message });
  }
});

// Async function to process KvK document verification
async function processKvKVerification(legalEntityId: string, blobUrl: string, verificationId: string): Promise<void> {
  const pool = getPool();

  try {
    console.log('Starting KvK document verification:', { legalEntityId, verificationId });

    // Download document buffer for Document Intelligence
    const { BlobStorageService } = await import('./services/blobStorageService');
    const blobService = new BlobStorageService();
    const documentBuffer = await blobService.downloadDocumentBuffer(blobUrl);

    // Extract data from document using Document Intelligence (using buffer, more reliable than SAS URL)
    const { DocumentIntelligenceService } = await import('./services/documentIntelligenceService');
    const docIntelService = new DocumentIntelligenceService();
    const extractedData = await docIntelService.extractKvKData(documentBuffer);

    console.log('Extracted KvK data:', extractedData);

    // Update legal_entity with extracted data
    await pool.query(`
      UPDATE legal_entity
      SET kvk_extracted_company_name = $1,
          kvk_extracted_number = $2,
          entered_company_name = primary_legal_name,
          dt_modified = NOW()
      WHERE legal_entity_id = $3
    `, [extractedData.companyName, extractedData.kvkNumber, legalEntityId]);

    // Get entity and identifier data for comparison
    const { rows: entityRows } = await pool.query(`
      SELECT primary_legal_name FROM legal_entity WHERE legal_entity_id = $1
    `, [legalEntityId]);

    const { rows: identifierRows } = await pool.query(`
      SELECT identifier_value FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'KVK' AND is_deleted = false
      LIMIT 1
    `, [legalEntityId]);

    const enteredCompanyName = entityRows[0]?.primary_legal_name;
    const enteredKvkNumber = identifierRows[0]?.identifier_value;

    // Compare extracted vs entered data
    const comparisonFlags: string[] = [];

    // Compare KvK numbers
    if (enteredKvkNumber && extractedData.kvkNumber) {
      const normalizedEntered = enteredKvkNumber.replace(/[\s-]/g, '');
      const normalizedExtracted = extractedData.kvkNumber.replace(/[\s-]/g, '');
      if (normalizedEntered !== normalizedExtracted) {
        comparisonFlags.push('entered_kvk_mismatch');
        console.warn(`KvK mismatch: entered=${enteredKvkNumber}, extracted=${extractedData.kvkNumber}`);
      }
    }

    // Compare company names (fuzzy match)
    if (enteredCompanyName && extractedData.companyName) {
      const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,\-]/g, '');
      const normalizedEntered = normalize(enteredCompanyName);
      const normalizedExtracted = normalize(extractedData.companyName);
      const namesMatch = normalizedEntered === normalizedExtracted ||
                        normalizedEntered.includes(normalizedExtracted) ||
                        normalizedExtracted.includes(normalizedEntered);
      if (!namesMatch) {
        comparisonFlags.push('entered_name_mismatch');
        console.warn(`Company name mismatch: entered="${enteredCompanyName}", extracted="${extractedData.companyName}"`);
      }
    }

    // Validate against KvK API if we have a number
    if (extractedData.kvkNumber) {
      const { KvKService } = await import('./services/kvkService');
      const kvkService = new KvKService();
      const validation = await kvkService.validateCompany(
        extractedData.kvkNumber,
        extractedData.companyName || ''
      );

      console.log('KvK API validation result:', validation);

      // Combine all flags
      const allFlags = [...comparisonFlags, ...validation.flags];

      // Determine verification status
      let newStatus: string;
      if (comparisonFlags.length > 0) {
        newStatus = 'flagged'; // Entered data mismatches
      } else if (validation.isValid) {
        newStatus = 'verified';
      } else if (validation.flags.length > 0) {
        newStatus = 'flagged';
      } else {
        newStatus = 'failed';
      }

      // Update legal_entity with verification results
      await pool.query(`
        UPDATE legal_entity
        SET kvk_verification_status = $1,
            kvk_api_response = $2,
            kvk_mismatch_flags = $3,
            kvk_verified_at = NOW(),
            dt_modified = NOW()
        WHERE legal_entity_id = $4
      `, [newStatus, JSON.stringify(validation.companyData), allFlags, legalEntityId]);

      // Update verification history record
      await pool.query(`
        UPDATE identifier_verification_history
        SET verification_status = $1,
            extracted_data = $2,
            verified_at = NOW(),
            updated_at = NOW()
        WHERE verification_id = $3
      `, [newStatus, JSON.stringify({ companyName: extractedData.companyName, kvkNumber: extractedData.kvkNumber }), verificationId]);

      // Store KvK registry data
      if (validation.companyData) {
        const kvkData = validation.companyData;
        await pool.query(`
          INSERT INTO kvk_registry_data (
            legal_entity_id, kvk_number, company_name, legal_form,
            trade_names, formal_registration_date, material_registration_date,
            company_status, addresses, sbi_activities,
            total_employees, raw_api_response, fetched_at,
            last_verified_at, data_source, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), 'kvk_api', 'system')
        `, [
          legalEntityId,
          kvkData.kvkNumber,
          kvkData.statutoryName,
          kvkData.legalForm,
          JSON.stringify(kvkData.tradeNames),
          kvkData.formalRegistrationDate,
          kvkData.materialStartDate,
          kvkData.materialEndDate ? 'Inactive' : 'Active',
          JSON.stringify(kvkData.addresses),
          JSON.stringify(kvkData.sbiActivities),
          kvkData.totalEmployees,
          JSON.stringify(validation.companyData)
        ]);

        // Update legal_entity address from KVK bezoekadres (if address is empty)
        // Find the bezoekadres (visiting address) from KVK data
        const bezoekadres = kvkData.addresses?.find(
          (addr: any) => addr.type === 'bezoekadres' || addr.type === 'Bezoekadres'
        ) || kvkData.addresses?.[0]; // Fallback to first address

        if (bezoekadres) {
          // Format address line based on country (NL, DE, BE formats)
          const formatAddressLine = (addr: any): string => {
            const countryCode = addr.country === 'Nederland' ? 'NL' :
                               addr.country === 'Deutschland' || addr.country === 'Germany' ? 'DE' :
                               addr.country === 'België' || addr.country === 'Belgium' || addr.country === 'Belgique' ? 'BE' : 'NL';

            const houseNum = addr.houseNumber || '';
            const houseLetter = addr.houseLetter || '';
            const houseAddition = addr.houseNumberAddition || '';
            const street = addr.street || '';

            if (countryCode === 'DE') {
              // German format: Straße Hausnummer[Buchstabe][-Zusatz]
              return `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
            } else if (countryCode === 'BE') {
              // Belgian format: Straat huisnummer [bus toevoeging]
              return `${street} ${houseNum}${houseLetter}${houseAddition ? ' bus ' + houseAddition : ''}`.trim();
            } else {
              // Dutch format: Straat huisnummer[letter][-toevoeging]
              return `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
            }
          };

          const addressLine1 = formatAddressLine(bezoekadres);
          const postalCode = bezoekadres.postalCode || '';
          const city = bezoekadres.city || '';
          const countryCode = bezoekadres.country === 'Nederland' ? 'NL' :
                             bezoekadres.country === 'Deutschland' || bezoekadres.country === 'Germany' ? 'DE' :
                             bezoekadres.country === 'België' || bezoekadres.country === 'Belgium' || bezoekadres.country === 'Belgique' ? 'BE' :
                             bezoekadres.country?.substring(0, 2).toUpperCase() || 'NL';

          // Only update if address fields are currently empty
          await pool.query(`
            UPDATE legal_entity
            SET
              address_line1 = COALESCE(NULLIF(address_line1, ''), $2),
              postal_code = COALESCE(NULLIF(postal_code, ''), $3),
              city = COALESCE(NULLIF(city, ''), $4),
              country_code = COALESCE(NULLIF(country_code, ''), $5),
              dt_modified = NOW()
            WHERE legal_entity_id = $1
          `, [legalEntityId, addressLine1, postalCode, city, countryCode]);

          console.log('Updated legal_entity address from KVK bezoekadres:', {
            addressLine1, postalCode, city, countryCode
          });
        }

        // Create EUID from KvK number (NL.KVK.{kvk_number})
        const euid = `NL.KVK.${kvkData.kvkNumber}`;

        // Check if EUID identifier already exists
        const { rows: euidRows } = await pool.query(`
          SELECT legal_entity_reference_id FROM legal_entity_number
          WHERE legal_entity_id = $1 AND identifier_type = 'EUID' AND is_deleted = false
        `, [legalEntityId]);

        if (euidRows.length === 0) {
          // Create EUID identifier
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, dt_created, dt_modified
            )
            VALUES ($1, $2, 'EUID', $3, 'NL', 'VERIFIED', NOW(), NOW())
          `, [randomUUID(), legalEntityId, euid]);

          console.log('Created EUID identifier:', euid);
        }

        // Fetch LEI from GLEIF API using KvK number
        try {
          console.log('Attempting to fetch LEI from GLEIF for KvK:', kvkData.kvkNumber);

          const { fetchLeiForOrganization } = await import('./services/leiService');

          // Create mock context for legacy service (uses Azure Functions context)
          const mockContext = {
            log: (...args: any[]) => console.log('[LEI Service]', ...args),
            warn: (...args: any[]) => console.warn('[LEI Service]', ...args),
            error: (...args: any[]) => console.error('[LEI Service]', ...args),
          } as any;

          const leiResult = await fetchLeiForOrganization(
            kvkData.kvkNumber,
            'NL',
            'KVK',
            mockContext
          );

          if (leiResult.status === 'found' && leiResult.lei) {
            console.log('LEI found from GLEIF:', {
              lei: leiResult.lei,
              legalName: leiResult.legal_name,
              registrationAuthority: leiResult.registration_authority
            });

            // Check if LEI identifier already exists
            const { rows: leiRows } = await pool.query(`
              SELECT legal_entity_reference_id FROM legal_entity_number
              WHERE legal_entity_id = $1 AND identifier_type = 'LEI' AND is_deleted = false
            `, [legalEntityId]);

            if (leiRows.length === 0) {
              // Create LEI identifier
              await pool.query(`
                INSERT INTO legal_entity_number (
                  legal_entity_reference_id, legal_entity_id,
                  identifier_type, identifier_value,
                  validation_status, dt_created, dt_modified
                )
                VALUES ($1, $2, 'LEI', $3, 'VERIFIED', NOW(), NOW())
              `, [randomUUID(), legalEntityId, leiResult.lei]);

              console.log('Created LEI identifier:', leiResult.lei);
            } else {
              console.log('LEI identifier already exists, skipping creation');
            }
          } else {
            console.log('No LEI found for KvK number:', kvkData.kvkNumber, 'Status:', leiResult.status);
          }
        } catch (leiError: any) {
          console.warn('Failed to fetch LEI from GLEIF (non-fatal):', {
            error: leiError.message,
            kvkNumber: kvkData.kvkNumber
          });
          // Don't fail verification if LEI fetch fails - it's enrichment only
        }

        // Fetch Peppol participant from Peppol Directory using KvK number
        try {
          console.log('Attempting to fetch Peppol participant for KvK:', kvkData.kvkNumber);

          const { fetchPeppolByKvk } = await import('./services/peppolService');
          const peppolResult = await fetchPeppolByKvk(kvkData.kvkNumber);

          if (peppolResult.status === 'found' && peppolResult.participant_id) {
            console.log('Peppol participant found:', {
              participantId: peppolResult.participant_id,
              entityName: peppolResult.entity_name,
              country: peppolResult.country
            });

            // Check if PEPPOL identifier already exists
            const { rows: peppolRows } = await pool.query(`
              SELECT legal_entity_reference_id FROM legal_entity_number
              WHERE legal_entity_id = $1 AND identifier_type = 'PEPPOL' AND is_deleted = false
            `, [legalEntityId]);

            if (peppolRows.length === 0) {
              // Create PEPPOL identifier
              await pool.query(`
                INSERT INTO legal_entity_number (
                  legal_entity_reference_id, legal_entity_id,
                  identifier_type, identifier_value,
                  validation_status, registry_name, registry_url,
                  dt_created, dt_modified
                )
                VALUES ($1, $2, 'PEPPOL', $3, 'VERIFIED', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
              `, [randomUUID(), legalEntityId, peppolResult.participant_id]);

              console.log('Created PEPPOL identifier:', peppolResult.participant_id);
            }

            // Store full Peppol registry data
            await pool.query(`
              INSERT INTO peppol_registry_data (
                legal_entity_id, participant_id, participant_scheme, participant_value,
                entity_name, country_code, registration_date,
                additional_identifiers, document_types, websites, contacts,
                geo_info, additional_info, raw_api_response,
                fetched_at, last_verified_at, data_source, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), 'peppol_directory', 'system')
              ON CONFLICT ON CONSTRAINT idx_peppol_registry_unique_active
              DO UPDATE SET
                participant_id = EXCLUDED.participant_id,
                participant_scheme = EXCLUDED.participant_scheme,
                participant_value = EXCLUDED.participant_value,
                entity_name = EXCLUDED.entity_name,
                country_code = EXCLUDED.country_code,
                registration_date = EXCLUDED.registration_date,
                additional_identifiers = EXCLUDED.additional_identifiers,
                document_types = EXCLUDED.document_types,
                websites = EXCLUDED.websites,
                contacts = EXCLUDED.contacts,
                geo_info = EXCLUDED.geo_info,
                additional_info = EXCLUDED.additional_info,
                raw_api_response = EXCLUDED.raw_api_response,
                fetched_at = NOW(),
                last_verified_at = NOW(),
                dt_modified = NOW()
            `, [
              legalEntityId,
              peppolResult.participant_id,
              peppolResult.participant_scheme,
              peppolResult.participant_value,
              peppolResult.entity_name,
              peppolResult.country,
              peppolResult.registration_date,
              JSON.stringify(peppolResult.additional_identifiers),
              JSON.stringify(peppolResult.document_types),
              JSON.stringify(peppolResult.websites),
              JSON.stringify(peppolResult.contacts),
              peppolResult.geo_info,
              peppolResult.additional_info,
              JSON.stringify(peppolResult.peppol_response)
            ]);

            console.log('Stored Peppol registry data for legal entity:', legalEntityId);
          } else {
            console.log('No Peppol participant found for KvK number:', kvkData.kvkNumber, 'Status:', peppolResult.status);
          }
        } catch (peppolError: any) {
          console.warn('Failed to fetch Peppol participant (non-fatal):', {
            error: peppolError.message,
            kvkNumber: kvkData.kvkNumber
          });
          // Don't fail verification if Peppol fetch fails - it's enrichment only
        }
      }

      console.log('KvK verification completed:', {
        legalEntityId,
        verificationId,
        status: newStatus,
        flags: allFlags
      });
    }
  } catch (error: any) {
    console.error('KvK verification processing error:', {
      legalEntityId,
      verificationId,
      error: error.message,
      stack: error.stack
    });

    // Update status to failed
    await pool.query(`
      UPDATE legal_entity
      SET kvk_verification_status = 'failed',
          kvk_mismatch_flags = ARRAY['processing_error'],
          dt_modified = NOW()
      WHERE legal_entity_id = $1
    `, [legalEntityId]);
  }
}

// POST /v1/legal-entities/:legalentityid/kvk-document - Upload KvK document (Member Portal)
router.post('/v1/legal-entities/:legalentityid/kvk-document', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Verify user has access to this legal entity
    const { rows: entityRows } = await pool.query(`
      SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (entityRows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    // Upload document to blob storage
    const { BlobStorageService } = await import('./services/blobStorageService');
    const blobService = new BlobStorageService();
    const blobUrl = await blobService.uploadDocument(
      legalentityid,
      file.originalname || 'kvk-document.pdf',
      file.buffer,
      file.mimetype
    );

    // Get KvK identifier for this legal entity
    const { rows: kvkRows } = await pool.query(`
      SELECT legal_entity_reference_id FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'KVK' AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    const identifierId = kvkRows.length > 0 ? kvkRows[0].legal_entity_reference_id : null;

    // Create verification history record
    const verificationId = randomUUID();
    const { rows: verificationRows } = await pool.query(`
      INSERT INTO identifier_verification_history (
        verification_id, legal_entity_id, identifier_id,
        identifier_type, identifier_value, verification_method,
        verification_status, document_blob_url, document_filename,
        document_mime_type, verified_by, verified_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, 'KVK', '', 'MANUAL_UPLOAD', 'PENDING', $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING verification_id, verification_status, created_at
    `, [
      verificationId,
      legalentityid,
      identifierId,
      blobUrl,
      file.originalname,
      file.mimetype,
      (req as any).user?.name || (req as any).user?.preferred_username || 'system'
    ]);

    console.log('KvK document uploaded:', {
      legalEntityId: legalentityid,
      verificationId,
      filename: file.originalname,
      size: file.size,
      uploadedBy: (req as any).user?.name || (req as any).user?.preferred_username
    });

    // Start async verification process (don't await - process in background)
    processKvKVerification(legalentityid, blobUrl, verificationId).catch(error => {
      console.error('Background KvK verification failed:', error);
    });

    res.status(201).json({
      message: 'Document uploaded successfully. Verification in progress...',
      verificationId: verificationRows[0].verification_id,
      status: verificationRows[0].verification_status,
      uploadedAt: verificationRows[0].created_at
    });
  } catch (error: any) {
    console.error('Error uploading KvK document:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to upload document', detail: error.message });
  }
});

// POST /v1/legal-entities/:legalentityid/kvk-document/verify - Manually trigger verification for existing document
router.post('/v1/legal-entities/:legalentityid/kvk-document/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get the document URL for this legal entity
    const { rows: entityRows } = await pool.query(`
      SELECT kvk_document_url, kvk_verification_status
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (entityRows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    const kvkDocumentUrl = entityRows[0].kvk_document_url;
    const currentStatus = entityRows[0].kvk_verification_status;

    if (!kvkDocumentUrl) {
      return res.status(400).json({ error: 'No KvK document found for this entity' });
    }

    // Get or create verification history record
    const { rows: verificationRows } = await pool.query(`
      SELECT verification_id FROM identifier_verification_history
      WHERE legal_entity_id = $1 AND identifier_type = 'KVK'
      ORDER BY created_at DESC
      LIMIT 1
    `, [legalentityid]);

    let verificationId: string;
    if (verificationRows.length > 0) {
      verificationId = verificationRows[0].verification_id;
    } else {
      // Create verification history record
      verificationId = randomUUID();
      await pool.query(`
        INSERT INTO identifier_verification_history (
          verification_id, legal_entity_id, identifier_id,
          identifier_type, identifier_value, verification_method,
          verification_status, document_blob_url,
          created_at, updated_at
        )
        VALUES ($1, $2, NULL, 'KVK', '', 'MANUAL_TRIGGER', 'PENDING', $3, NOW(), NOW())
      `, [verificationId, legalentityid, kvkDocumentUrl]);
    }

    // Reset status to pending
    await pool.query(`
      UPDATE legal_entity
      SET kvk_verification_status = 'pending',
          kvk_mismatch_flags = NULL,
          dt_modified = NOW()
      WHERE legal_entity_id = $1
    `, [legalentityid]);

    // Trigger verification process
    processKvKVerification(legalentityid, kvkDocumentUrl, verificationId).catch(error => {
      console.error('Manual KvK verification failed:', error);
    });

    console.log('Manual KvK verification triggered:', {
      legalEntityId: legalentityid,
      verificationId,
      previousStatus: currentStatus
    });

    res.json({
      message: 'KvK verification started',
      verificationId,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Error triggering KvK verification:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to trigger verification', detail: error.message });
  }
});

// ============================================================================
// PEPPOL REGISTRY DATA
// ============================================================================

// GET /v1/legal-entities/:legalentityid/peppol-registry - Get stored Peppol registry data
router.get('/v1/legal-entities/:legalentityid/peppol-registry', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get Peppol registry data for this legal entity
    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        participant_id,
        participant_scheme,
        participant_value,
        entity_name,
        country_code,
        registration_date,
        additional_identifiers,
        document_types,
        websites,
        contacts,
        geo_info,
        additional_info,
        fetched_at,
        last_verified_at,
        data_source
      FROM peppol_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      return res.json({
        hasData: false,
        message: 'No Peppol registry data available. Use the fetch endpoint to retrieve data from Peppol Directory.'
      });
    }

    res.json({
      hasData: true,
      data: rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching Peppol registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Peppol registry data', detail: error.message });
  }
});

// POST /v1/legal-entities/:legalentityid/peppol/fetch - Fetch Peppol data from directory
router.post('/v1/legal-entities/:legalentityid/peppol/fetch', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { identifier_type, identifier_value, company_name, country_code, save_to_database = true } = req.body;

    if (!identifier_type && !company_name) {
      return res.status(400).json({
        error: 'Either identifier_type and identifier_value, or company_name and country_code must be provided'
      });
    }

    const { fetchPeppolForOrganization, fetchPeppolByName } = await import('./services/peppolService');

    let peppolResult;

    if (identifier_type && identifier_value) {
      // Search by identifier
      peppolResult = await fetchPeppolForOrganization(
        identifier_type,
        identifier_value,
        company_name,
        country_code
      );
    } else if (company_name && country_code) {
      // Search by name only
      peppolResult = await fetchPeppolByName(company_name, country_code);
    } else {
      return res.status(400).json({
        error: 'Invalid search parameters. Provide identifier_type+identifier_value or company_name+country_code'
      });
    }

    if (peppolResult.status === 'found' && save_to_database) {
      // Check if PEPPOL identifier already exists
      const { rows: existingRows } = await pool.query(`
        SELECT legal_entity_reference_id FROM legal_entity_number
        WHERE legal_entity_id = $1 AND identifier_type = 'PEPPOL' AND is_deleted = false
      `, [legalentityid]);

      let identifierId: string | null = null;

      if (existingRows.length === 0) {
        // Create PEPPOL identifier
        identifierId = randomUUID();
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id,
            identifier_type, identifier_value,
            validation_status, registry_name, registry_url,
            dt_created, dt_modified
          )
          VALUES ($1, $2, 'PEPPOL', $3, 'VERIFIED', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
        `, [identifierId, legalentityid, peppolResult.participant_id]);
      } else {
        identifierId = existingRows[0].legal_entity_reference_id;
        // Update existing identifier
        await pool.query(`
          UPDATE legal_entity_number
          SET identifier_value = $1, validation_status = 'VERIFIED', dt_modified = NOW()
          WHERE legal_entity_reference_id = $2
        `, [peppolResult.participant_id, identifierId]);
      }

      // Upsert Peppol registry data
      await pool.query(`
        INSERT INTO peppol_registry_data (
          legal_entity_id, participant_id, participant_scheme, participant_value,
          entity_name, country_code, registration_date,
          additional_identifiers, document_types, websites, contacts,
          geo_info, additional_info, raw_api_response,
          fetched_at, last_verified_at, data_source, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), 'peppol_directory', 'api')
        ON CONFLICT ON CONSTRAINT idx_peppol_registry_unique_active
        DO UPDATE SET
          participant_id = EXCLUDED.participant_id,
          participant_scheme = EXCLUDED.participant_scheme,
          participant_value = EXCLUDED.participant_value,
          entity_name = EXCLUDED.entity_name,
          country_code = EXCLUDED.country_code,
          registration_date = EXCLUDED.registration_date,
          additional_identifiers = EXCLUDED.additional_identifiers,
          document_types = EXCLUDED.document_types,
          websites = EXCLUDED.websites,
          contacts = EXCLUDED.contacts,
          geo_info = EXCLUDED.geo_info,
          additional_info = EXCLUDED.additional_info,
          raw_api_response = EXCLUDED.raw_api_response,
          fetched_at = NOW(),
          last_verified_at = NOW(),
          dt_modified = NOW()
      `, [
        legalentityid,
        peppolResult.participant_id,
        peppolResult.participant_scheme,
        peppolResult.participant_value,
        peppolResult.entity_name,
        peppolResult.country,
        peppolResult.registration_date,
        JSON.stringify(peppolResult.additional_identifiers),
        JSON.stringify(peppolResult.document_types),
        JSON.stringify(peppolResult.websites),
        JSON.stringify(peppolResult.contacts),
        peppolResult.geo_info,
        peppolResult.additional_info,
        JSON.stringify(peppolResult.peppol_response)
      ]);

      res.json({
        status: 'found',
        participant_id: peppolResult.participant_id,
        entity_name: peppolResult.entity_name,
        country: peppolResult.country,
        registration_date: peppolResult.registration_date,
        document_types_count: peppolResult.document_types.length,
        was_saved: true,
        identifier_id: identifierId,
        message: peppolResult.message
      });
    } else if (peppolResult.status === 'found') {
      // Return data without saving
      res.json({
        status: 'found',
        participant_id: peppolResult.participant_id,
        entity_name: peppolResult.entity_name,
        country: peppolResult.country,
        registration_date: peppolResult.registration_date,
        document_types_count: peppolResult.document_types.length,
        additional_identifiers: peppolResult.additional_identifiers,
        was_saved: false,
        message: peppolResult.message
      });
    } else {
      res.status(404).json({
        status: peppolResult.status,
        participant_id: null,
        was_saved: false,
        message: peppolResult.message
      });
    }
  } catch (error: any) {
    console.error('Error fetching Peppol data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Peppol data', detail: error.message });
  }
});

// GET /v1/peppol/search - Search Peppol directory without saving (for lookups)
router.get('/v1/peppol/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { scheme, value, name, country } = req.query;

    const { fetchPeppolByIdentifier, fetchPeppolByName, PEPPOL_IDENTIFIER_SCHEMES } = await import('./services/peppolService');

    let peppolResult;

    if (scheme && value) {
      // Search by identifier scheme and value
      const schemeCode = PEPPOL_IDENTIFIER_SCHEMES[scheme as string] || scheme;
      peppolResult = await fetchPeppolByIdentifier(schemeCode as string, value as string);
    } else if (name && country) {
      // Search by name and country
      peppolResult = await fetchPeppolByName(name as string, country as string);
    } else {
      return res.status(400).json({
        error: 'Provide either scheme+value or name+country query parameters'
      });
    }

    res.json(peppolResult);
  } catch (error: any) {
    console.error('Error searching Peppol directory:', {
      query: req.query,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to search Peppol directory', detail: error.message });
  }
});

// ============================================================================
// VIES REGISTRY DATA (EU VAT Information Exchange System)
// ============================================================================

// GET /v1/legal-entities/:legalentityid/vies-registry - Get stored VIES registry data
router.get('/v1/legal-entities/:legalentityid/vies-registry', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get VIES registry data for this legal entity
    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        legal_entity_id,
        country_code,
        vat_number,
        full_vat_number,
        is_valid,
        user_error,
        request_date,
        request_identifier,
        trader_name,
        trader_address,
        approx_name,
        approx_street,
        approx_postal_code,
        approx_city,
        approx_company_type,
        match_name,
        match_street,
        match_postal_code,
        match_city,
        match_company_type,
        fetched_at,
        last_verified_at,
        data_source,
        dt_created,
        dt_modified
      FROM vies_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      return res.json({
        hasData: false,
        message: 'No VIES registry data available. Use the fetch endpoint to validate a VAT number.'
      });
    }

    res.json({
      hasData: true,
      data: rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching VIES registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch VIES registry data', detail: error.message });
  }
});

// POST /v1/legal-entities/:legalentityid/vies/fetch - Fetch and validate VAT from VIES
router.post('/v1/legal-entities/:legalentityid/vies/fetch', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { country_code, vat_number, save_to_database = true } = req.body;

    if (!country_code || !vat_number) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'country_code and vat_number are required'
      });
    }

    // Import VIES service
    const { ViesService } = await import('./services/viesService');
    const viesService = new ViesService();

    // Check if country is EU member
    if (!viesService.isEuCountry(country_code)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Country code ${country_code} is not an EU member state. VIES only supports EU VAT numbers.`
      });
    }

    // Fetch and validate from VIES
    const viesResult = await viesService.fetchAndValidate(country_code, vat_number);

    if (!viesResult.companyData) {
      return res.json({
        status: 'error',
        is_valid: false,
        flags: viesResult.flags,
        message: viesResult.message
      });
    }

    const viesData = viesResult.companyData;

    if (save_to_database) {
      // Check if VIES identifier already exists
      const { rows: existingRows } = await pool.query(`
        SELECT legal_entity_reference_id FROM legal_entity_number
        WHERE legal_entity_id = $1 AND identifier_type = 'VIES' AND is_deleted = false
      `, [legalentityid]);

      const identifierId = existingRows.length > 0
        ? existingRows[0].legal_entity_reference_id
        : randomUUID();

      if (existingRows.length === 0) {
        // Create VIES identifier
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
            validation_status, registry_name, registry_url, dt_created, dt_modified, country_code
          )
          VALUES ($1, $2, 'VIES', $3, $4, 'EU VIES System', 'https://ec.europa.eu/taxation_customs/vies', NOW(), NOW(), $5)
        `, [identifierId, legalentityid, viesData.fullVatNumber, viesData.isValid ? 'VERIFIED' : 'FAILED', viesData.countryCode]);
      } else {
        // Update existing identifier
        await pool.query(`
          UPDATE legal_entity_number SET
            identifier_value = $1,
            validation_status = $2,
            dt_modified = NOW()
          WHERE legal_entity_reference_id = $3
        `, [viesData.fullVatNumber, viesData.isValid ? 'VERIFIED' : 'FAILED', identifierId]);
      }

      // Upsert VIES registry data
      await pool.query(`
        INSERT INTO vies_registry_data (
          registry_data_id, legal_entity_id, country_code, vat_number, full_vat_number,
          is_valid, user_error, request_date, request_identifier,
          trader_name, trader_address,
          approx_name, approx_street, approx_postal_code, approx_city, approx_company_type,
          match_name, match_street, match_postal_code, match_city, match_company_type,
          raw_api_response, fetched_at, last_verified_at, data_source, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), 'vies_ec_europa', 'api'
        )
        ON CONFLICT ON CONSTRAINT idx_vies_registry_unique_active
        DO UPDATE SET
          country_code = EXCLUDED.country_code,
          vat_number = EXCLUDED.vat_number,
          full_vat_number = EXCLUDED.full_vat_number,
          is_valid = EXCLUDED.is_valid,
          user_error = EXCLUDED.user_error,
          request_date = EXCLUDED.request_date,
          request_identifier = EXCLUDED.request_identifier,
          trader_name = EXCLUDED.trader_name,
          trader_address = EXCLUDED.trader_address,
          approx_name = EXCLUDED.approx_name,
          approx_street = EXCLUDED.approx_street,
          approx_postal_code = EXCLUDED.approx_postal_code,
          approx_city = EXCLUDED.approx_city,
          approx_company_type = EXCLUDED.approx_company_type,
          match_name = EXCLUDED.match_name,
          match_street = EXCLUDED.match_street,
          match_postal_code = EXCLUDED.match_postal_code,
          match_city = EXCLUDED.match_city,
          match_company_type = EXCLUDED.match_company_type,
          raw_api_response = EXCLUDED.raw_api_response,
          last_verified_at = NOW(),
          dt_modified = NOW(),
          modified_by = 'api'
      `, [
        randomUUID(),
        legalentityid,
        viesData.countryCode,
        viesData.vatNumber,
        viesData.fullVatNumber,
        viesData.isValid,
        viesData.userError,
        viesData.requestDate,
        viesData.requestIdentifier,
        viesData.traderName,
        viesData.traderAddress,
        viesData.approximate?.name || null,
        viesData.approximate?.street || null,
        viesData.approximate?.postalCode || null,
        viesData.approximate?.city || null,
        viesData.approximate?.companyType || null,
        viesData.approximate?.matchName || null,
        viesData.approximate?.matchStreet || null,
        viesData.approximate?.matchPostalCode || null,
        viesData.approximate?.matchCity || null,
        viesData.approximate?.matchCompanyType || null,
        JSON.stringify(viesData.rawApiResponse)
      ]);

      return res.json({
        status: 'validated',
        is_valid: viesData.isValid,
        was_saved: true,
        full_vat_number: viesData.fullVatNumber,
        trader_name: viesData.traderName,
        trader_address: viesData.traderAddress,
        request_date: viesData.requestDate,
        request_identifier: viesData.requestIdentifier,
        flags: viesResult.flags,
        message: viesResult.message
      });
    } else {
      // Just return the validation result without saving
      return res.json({
        status: 'validated',
        is_valid: viesData.isValid,
        was_saved: false,
        full_vat_number: viesData.fullVatNumber,
        trader_name: viesData.traderName,
        trader_address: viesData.traderAddress,
        request_date: viesData.requestDate,
        request_identifier: viesData.requestIdentifier,
        flags: viesResult.flags,
        message: viesResult.message
      });
    }
  } catch (error: any) {
    console.error('Error fetching VIES data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch VIES data', detail: error.message });
  }
});

// GET /v1/vies/validate - Validate VAT number without saving (for lookups)
router.get('/v1/vies/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { country_code, vat_number } = req.query;

    if (!country_code || !vat_number) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'country_code and vat_number query parameters are required'
      });
    }

    // Import VIES service
    const { ViesService } = await import('./services/viesService');
    const viesService = new ViesService();

    // Check if country is EU member
    if (!viesService.isEuCountry(country_code as string)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Country code ${country_code} is not an EU member state. VIES only supports EU VAT numbers.`
      });
    }

    // Validate through VIES
    const viesResult = await viesService.fetchAndValidate(country_code as string, vat_number as string);

    if (!viesResult.companyData) {
      return res.json({
        status: 'error',
        is_valid: false,
        country_code,
        vat_number,
        flags: viesResult.flags,
        message: viesResult.message
      });
    }

    res.json({
      status: 'validated',
      is_valid: viesResult.companyData.isValid,
      full_vat_number: viesResult.companyData.fullVatNumber,
      trader_name: viesResult.companyData.traderName,
      trader_address: viesResult.companyData.traderAddress,
      request_date: viesResult.companyData.requestDate,
      flags: viesResult.flags,
      message: viesResult.message
    });
  } catch (error: any) {
    console.error('Error validating VAT number:', {
      query: req.query,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to validate VAT number', detail: error.message });
  }
});

// ============================================================================
// UNIFIED ENRICHMENT ENDPOINT
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/enrich
 *
 * Comprehensive enrichment that fetches all possible identifiers:
 * 1. From stored KVK data: RSIN, derive VAT
 * 2. Fresh KVK API call if no stored data: get RSIN
 * 3. VIES validation using derived VAT
 * 4. LEI from GLEIF (if KVK available)
 * 5. Peppol from directory (if suitable identifier available)
 */
router.post('/v1/legal-entities/:legalentityid/enrich', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();
  const { legalentityid } = req.params;

  const results: { identifier: string; status: 'added' | 'exists' | 'error' | 'not_available'; value?: string; message?: string }[] = [];

  try {
    console.log('Starting enrichment for legal entity:', legalentityid);

    // Get the legal entity's company name for LEI name search fallback
    const { rows: legalEntityRows } = await pool.query(`
      SELECT primary_legal_name, country_code
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    const companyName = legalEntityRows[0]?.primary_legal_name || null;
    const countryCode = legalEntityRows[0]?.country_code || 'NL';
    console.log('Company name for LEI fallback search:', companyName);

    // Get existing identifiers to avoid duplicates
    const { rows: existingIdentifiers } = await pool.query(`
      SELECT identifier_type, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    const existingTypes = new Set(existingIdentifiers.map(r => r.identifier_type));
    const getExistingValue = (type: string) => existingIdentifiers.find(r => r.identifier_type === type)?.identifier_value;

    // Get KVK number from existing identifiers
    const kvkNumber = getExistingValue('KVK');

    // =========================================================================
    // 1. RSIN - Get from stored KVK registry data or fetch fresh from KVK API
    // =========================================================================
    let rsin: string | null = null;

    if (!existingTypes.has('RSIN')) {
      // First check kvk_registry_data table
      const { rows: kvkRegistry } = await pool.query(`
        SELECT rsin, raw_api_response
        FROM kvk_registry_data
        WHERE legal_entity_id = $1 AND is_deleted = false
        ORDER BY fetched_at DESC
        LIMIT 1
      `, [legalentityid]);

      if (kvkRegistry.length > 0 && kvkRegistry[0].rsin) {
        rsin = kvkRegistry[0].rsin;
        console.log('Found RSIN in kvk_registry_data:', rsin);
      } else if (kvkRegistry.length > 0 && kvkRegistry[0].raw_api_response) {
        // Try to extract from raw API response
        const rawResponse = kvkRegistry[0].raw_api_response;
        rsin = rawResponse?._embedded?.eigenaar?.rsin || rawResponse?._embedded?.hoofdvestiging?.rsin || null;
        console.log('Extracted RSIN from raw_api_response:', rsin);

        // Update the kvk_registry_data with the extracted RSIN
        if (rsin) {
          await pool.query(`
            UPDATE kvk_registry_data
            SET rsin = $1, dt_modified = NOW()
            WHERE legal_entity_id = $2 AND is_deleted = false
          `, [rsin, legalentityid]);
        }
      }

      // If still no RSIN and we have KVK number, fetch fresh from KVK API
      if (!rsin && kvkNumber) {
        try {
          console.log('Fetching fresh KVK data to get RSIN for:', kvkNumber);
          const { KvKService } = await import('./services/kvkService');
          const kvkService = new KvKService();
          const kvkData = await kvkService.fetchCompanyProfile(kvkNumber, false);

          if (kvkData?.rsin) {
            rsin = kvkData.rsin;
            console.log('Fetched RSIN from KVK API:', rsin);
          }

          // Store the full KVK registry data (INSERT or UPDATE)
          if (kvkData) {
            // Check if kvk_registry_data already exists for this legal entity
            const { rows: existingKvk } = await pool.query(`
              SELECT registry_data_id FROM kvk_registry_data
              WHERE legal_entity_id = $1 AND is_deleted = false
              LIMIT 1
            `, [legalentityid]);

            if (existingKvk.length > 0) {
              // Update existing record
              await pool.query(`
                UPDATE kvk_registry_data SET
                  company_name = $2,
                  legal_form = $3,
                  statutory_name = $4,
                  trade_names = $5,
                  formal_registration_date = $6,
                  material_registration_date = $7,
                  company_status = $8,
                  addresses = $9,
                  sbi_activities = $10,
                  total_employees = $11,
                  rsin = $12,
                  raw_api_response = $13,
                  last_verified_at = NOW(),
                  dt_modified = NOW()
                WHERE legal_entity_id = $1 AND is_deleted = false
              `, [
                legalentityid,
                kvkData.companyName || null,
                kvkData.legalForm || null,
                kvkData.statutoryName || null,
                kvkData.tradeNames ? JSON.stringify(kvkData.tradeNames) : null,
                kvkData.formalRegistrationDate || null,
                kvkData.materialStartDate || null,
                null, // company_status - not provided by KvKCompanyData
                kvkData.addresses ? JSON.stringify(kvkData.addresses) : null,
                kvkData.sbiActivities ? JSON.stringify(kvkData.sbiActivities) : null,
                kvkData.totalEmployees || null,
                rsin,
                JSON.stringify(kvkData.rawApiResponse || kvkData)
              ]);
            } else {
              // Insert new record
              await pool.query(`
                INSERT INTO kvk_registry_data (
                  legal_entity_id, kvk_number, company_name, legal_form, statutory_name,
                  trade_names, formal_registration_date, material_registration_date,
                  company_status, addresses, sbi_activities, total_employees,
                  rsin, raw_api_response, fetched_at, last_verified_at,
                  data_source, created_by, dt_created, dt_modified, is_deleted
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(),
                        'kvk_api', 'enrichment', NOW(), NOW(), false)
              `, [
                legalentityid,
                kvkNumber,
                kvkData.companyName || null,
                kvkData.legalForm || null,
                kvkData.statutoryName || null,
                kvkData.tradeNames ? JSON.stringify(kvkData.tradeNames) : null,
                kvkData.formalRegistrationDate || null,
                kvkData.materialStartDate || null,
                null, // company_status - not provided by KvKCompanyData
                kvkData.addresses ? JSON.stringify(kvkData.addresses) : null,
                kvkData.sbiActivities ? JSON.stringify(kvkData.sbiActivities) : null,
                kvkData.totalEmployees || null,
                rsin,
                JSON.stringify(kvkData.rawApiResponse || kvkData)
              ]);
            }
            console.log('Stored KVK registry data for:', kvkNumber);

            // Sync company name from KVK to legal_entity.primary_legal_name
            // Use statutory name (official company name) if available, otherwise company name
            const officialName = kvkData.statutoryName || kvkData.companyName;
            if (officialName) {
              await pool.query(`
                UPDATE legal_entity
                SET primary_legal_name = $1, dt_modified = NOW()
                WHERE legal_entity_id = $2 AND is_deleted = false
              `, [officialName, legalentityid]);
              console.log('Updated legal_entity.primary_legal_name from KVK:', officialName);
            }
          }
        } catch (kvkError: any) {
          console.warn('Failed to fetch KVK data for RSIN:', kvkError.message);
        }
      }

      // Create RSIN identifier if found
      if (rsin) {
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id,
            identifier_type, identifier_value, country_code,
            validation_status, registry_name, registry_url,
            dt_created, dt_modified
          )
          VALUES ($1, $2, 'RSIN', $3, 'NL', 'VERIFIED', 'KVK', 'https://www.kvk.nl/', NOW(), NOW())
        `, [randomUUID(), legalentityid, rsin]);

        results.push({ identifier: 'RSIN', status: 'added', value: rsin });
      } else if (kvkNumber) {
        results.push({ identifier: 'RSIN', status: 'not_available', message: 'RSIN not found in KVK data' });
      }
    } else {
      rsin = getExistingValue('RSIN') || null;
      results.push({ identifier: 'RSIN', status: 'exists', value: rsin || undefined });
    }

    // =========================================================================
    // 2. VAT - Derive from RSIN (Dutch VAT = NL + RSIN + B01)
    // =========================================================================
    if (!existingTypes.has('VAT') && rsin) {
      // Dutch VAT format: NL + 9-digit RSIN + B01 (or B02, B03 for fiscal units)
      const derivedVat = `NL${rsin}B01`;

      // Validate via VIES before adding
      try {
        const { ViesService } = await import('./services/viesService');
        const viesService = new ViesService();
        const viesResult = await viesService.fetchAndValidate('NL', `${rsin}B01`);

        if (viesResult.isValid && viesResult.companyData) {
          // Add VAT identifier
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'VAT', $3, 'NL', 'VERIFIED', 'VIES', 'https://ec.europa.eu/taxation_customs/vies/', NOW(), NOW())
          `, [randomUUID(), legalentityid, derivedVat]);

          // Also store VIES registry data
          // Use (legal_entity_id) WHERE is_deleted = false for partial unique index conflict
          await pool.query(`
            INSERT INTO vies_registry_data (
              registry_data_id, legal_entity_id, country_code, vat_number, full_vat_number,
              is_valid, user_error, request_date, request_identifier,
              trader_name, trader_address, raw_api_response,
              fetched_at, last_verified_at, data_source, created_by, dt_created, dt_modified, is_deleted
            )
            VALUES ($1, $2, 'NL', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), 'vies_api', 'enrichment', NOW(), NOW(), false)
            ON CONFLICT (legal_entity_id) WHERE is_deleted = false
            DO UPDATE SET
              is_valid = EXCLUDED.is_valid,
              user_error = EXCLUDED.user_error,
              request_date = EXCLUDED.request_date,
              request_identifier = EXCLUDED.request_identifier,
              trader_name = EXCLUDED.trader_name,
              trader_address = EXCLUDED.trader_address,
              raw_api_response = EXCLUDED.raw_api_response,
              last_verified_at = NOW(),
              dt_modified = NOW()
          `, [
            randomUUID(),
            legalentityid,
            `${rsin}B01`,
            derivedVat,
            viesResult.companyData.isValid,
            viesResult.companyData.userError,
            viesResult.companyData.requestDate,
            viesResult.companyData.requestIdentifier,
            viesResult.companyData.traderName,
            viesResult.companyData.traderAddress,
            JSON.stringify(viesResult.companyData.rawApiResponse)
          ]);

          results.push({ identifier: 'VAT', status: 'added', value: derivedVat, message: 'Validated via VIES' });
        } else {
          // Try B02 suffix (for companies in fiscal unity)
          const viesResultB02 = await viesService.fetchAndValidate('NL', `${rsin}B02`);
          if (viesResultB02.isValid && viesResultB02.companyData) {
            const vatB02 = `NL${rsin}B02`;
            await pool.query(`
              INSERT INTO legal_entity_number (
                legal_entity_reference_id, legal_entity_id,
                identifier_type, identifier_value, country_code,
                validation_status, registry_name, registry_url,
                dt_created, dt_modified
              )
              VALUES ($1, $2, 'VAT', $3, 'NL', 'VERIFIED', 'VIES', 'https://ec.europa.eu/taxation_customs/vies/', NOW(), NOW())
            `, [randomUUID(), legalentityid, vatB02]);

            results.push({ identifier: 'VAT', status: 'added', value: vatB02, message: 'Validated via VIES (B02 fiscal unit)' });
          } else {
            results.push({ identifier: 'VAT', status: 'not_available', message: `VAT ${derivedVat} not valid in VIES` });
          }
        }
      } catch (viesError: any) {
        console.warn('VIES validation failed:', viesError.message);
        results.push({ identifier: 'VAT', status: 'error', message: viesError.message });
      }
    } else if (existingTypes.has('VAT')) {
      results.push({ identifier: 'VAT', status: 'exists', value: getExistingValue('VAT') });
    } else if (!rsin) {
      results.push({ identifier: 'VAT', status: 'not_available', message: 'Cannot derive VAT without RSIN' });
    }

    // =========================================================================
    // 3. LEI - Fetch from GLEIF using KVK number, fallback to company name search
    // =========================================================================
    if (!existingTypes.has('LEI')) {
      // Can search by KVK (if Dutch) or by company name
      if (kvkNumber || companyName) {
        try {
          const { fetchLeiForOrganizationWithNameFallback, fetchLeiForOrganization } = await import('./services/leiService');

          // Create mock context for legacy service (uses Azure Functions context)
          const mockContext = {
            log: (...args: any[]) => console.log('[LEI Service]', ...args),
            warn: (...args: any[]) => console.warn('[LEI Service]', ...args),
            error: (...args: any[]) => console.error('[LEI Service]', ...args),
          } as any;

          let leiResult;

          if (kvkNumber) {
            // Use KVK number with company name fallback
            leiResult = await fetchLeiForOrganizationWithNameFallback(
              kvkNumber,
              countryCode,
              'KVK',
              companyName,
              mockContext
            );
          } else if (companyName) {
            // Only have company name - search by name directly
            const { searchLeiByCompanyName } = await import('./services/leiService');
            const nameResults = await searchLeiByCompanyName(companyName, countryCode, mockContext);

            if (nameResults.length === 1) {
              // Single match - use it
              const record = nameResults[0];
              leiResult = {
                lei: record.attributes.lei,
                legal_name: record.attributes.entity.legalName.name,
                status: 'found' as const,
                attempts: 1,
                message: 'LEI found via company name search (single match)',
              };
            } else if (nameResults.length > 1) {
              // Multiple matches - try exact match
              const normalizedSearchName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
              const exactMatch = nameResults.find(record => {
                const recordName = record.attributes.entity.legalName.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return recordName === normalizedSearchName;
              });

              if (exactMatch) {
                leiResult = {
                  lei: exactMatch.attributes.lei,
                  legal_name: exactMatch.attributes.entity.legalName.name,
                  status: 'found' as const,
                  attempts: 1,
                  message: 'LEI found via company name search (exact match)',
                };
              } else {
                leiResult = {
                  lei: null,
                  status: 'not_found' as const,
                  attempts: 1,
                  message: `Name search found ${nameResults.length} results but no exact match for "${companyName}"`,
                };
              }
            } else {
              leiResult = {
                lei: null,
                status: 'not_found' as const,
                attempts: 1,
                message: `No LEI found for company name "${companyName}"`,
              };
            }
          }

          if (leiResult?.status === 'found' && leiResult.lei) {
            await pool.query(`
              INSERT INTO legal_entity_number (
                legal_entity_reference_id, legal_entity_id,
                identifier_type, identifier_value,
                validation_status, registry_name, registry_url,
                dt_created, dt_modified
              )
              VALUES ($1, $2, 'LEI', $3, 'VERIFIED', 'GLEIF', 'https://www.gleif.org/', NOW(), NOW())
            `, [randomUUID(), legalentityid, leiResult.lei]);

            results.push({ identifier: 'LEI', status: 'added', value: leiResult.lei, message: leiResult.message });
          } else {
            results.push({ identifier: 'LEI', status: 'not_available', message: leiResult?.message || 'No LEI found in GLEIF' });
          }
        } catch (leiError: any) {
          console.warn('LEI fetch failed:', leiError.message);
          results.push({ identifier: 'LEI', status: 'error', message: leiError.message });
        }
      } else {
        results.push({ identifier: 'LEI', status: 'not_available', message: 'No KVK number or company name available for LEI search' });
      }
    } else {
      results.push({ identifier: 'LEI', status: 'exists', value: getExistingValue('LEI') });
    }

    // =========================================================================
    // 4. Peppol - Fetch from Peppol Directory
    // =========================================================================
    if (!existingTypes.has('PEPPOL') && kvkNumber) {
      try {
        const { fetchPeppolByKvk } = await import('./services/peppolService');
        const peppolResult = await fetchPeppolByKvk(kvkNumber);

        if (peppolResult.status === 'found' && peppolResult.participant_id) {
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'PEPPOL', $3, 'VERIFIED', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
          `, [randomUUID(), legalentityid, peppolResult.participant_id]);

          results.push({ identifier: 'PEPPOL', status: 'added', value: peppolResult.participant_id });
        } else {
          results.push({ identifier: 'PEPPOL', status: 'not_available', message: 'No Peppol participant found' });
        }
      } catch (peppolError: any) {
        console.warn('Peppol fetch failed:', peppolError.message);
        results.push({ identifier: 'PEPPOL', status: 'error', message: peppolError.message });
      }
    } else if (existingTypes.has('PEPPOL')) {
      results.push({ identifier: 'PEPPOL', status: 'exists', value: getExistingValue('PEPPOL') });
    }

    // =========================================================================
    // 5. Ensure KVK registry data exists (even if RSIN was already present)
    // =========================================================================
    if (kvkNumber) {
      // Check if kvk_registry_data exists
      const { rows: kvkExists } = await pool.query(`
        SELECT registry_data_id FROM kvk_registry_data
        WHERE legal_entity_id = $1 AND is_deleted = false
        LIMIT 1
      `, [legalentityid]);

      if (kvkExists.length === 0) {
        // KVK registry data doesn't exist - fetch from KVK API
        try {
          console.log('Fetching KVK registry data for CoC tab:', kvkNumber);
          const { KvKService } = await import('./services/kvkService');
          const kvkService = new KvKService();
          const kvkData = await kvkService.fetchCompanyProfile(kvkNumber, false);

          if (kvkData) {
            await pool.query(`
              INSERT INTO kvk_registry_data (
                legal_entity_id, kvk_number, company_name, legal_form, statutory_name,
                trade_names, formal_registration_date, material_registration_date,
                company_status, addresses, sbi_activities, total_employees,
                rsin, raw_api_response, fetched_at, last_verified_at,
                data_source, created_by, dt_created, dt_modified, is_deleted
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(),
                      'kvk_api', 'enrichment', NOW(), NOW(), false)
            `, [
              legalentityid,
              kvkNumber,
              kvkData.companyName || null,
              kvkData.legalForm || null,
              kvkData.statutoryName || null,
              kvkData.tradeNames ? JSON.stringify(kvkData.tradeNames) : null,
              kvkData.formalRegistrationDate || null,
              kvkData.materialStartDate || null,
              null, // company_status - not provided by KvKCompanyData
              kvkData.addresses ? JSON.stringify(kvkData.addresses) : null,
              kvkData.sbiActivities ? JSON.stringify(kvkData.sbiActivities) : null,
              kvkData.totalEmployees || null,
              kvkData.rsin || getExistingValue('RSIN') || null,
              JSON.stringify(kvkData.rawApiResponse || kvkData)
            ]);
            console.log('Stored KVK registry data for CoC tab:', kvkNumber);
          }
        } catch (kvkFetchError: any) {
          console.warn('Failed to fetch KVK registry data:', kvkFetchError.message);
        }
      }
    }

    // =========================================================================
    // 6. Update legal_entity with KVK registry data (address, legal form, etc.)
    // =========================================================================
    let companyDetailsUpdated = false;
    const updatedFields: string[] = [];
    try {
      // Get KVK registry data to enrich legal_entity
      const { rows: kvkData } = await pool.query(`
        SELECT company_name, statutory_name, legal_form, addresses,
               formal_registration_date, company_status
        FROM kvk_registry_data
        WHERE legal_entity_id = $1 AND is_deleted = false
        ORDER BY fetched_at DESC
        LIMIT 1
      `, [legalentityid]);

      if (kvkData.length > 0) {
        const kvk = kvkData[0];
        const addresses = kvk.addresses || [];

        // Find bezoekadres (visit address) - preferred for business address
        const bezoekadres = addresses.find((a: any) => a.type === 'bezoekadres') || addresses[0];

        // Build update fields
        const updateFieldsSql: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        // Update primary_legal_name from KVK company_name (official name)
        if (kvk.company_name) {
          updateFieldsSql.push(`primary_legal_name = $${paramIndex++}`);
          updateValues.push(kvk.company_name);
          updatedFields.push('primary_legal_name');
        }

        // Update entity_legal_form from KVK
        if (kvk.legal_form) {
          updateFieldsSql.push(`entity_legal_form = $${paramIndex++}`);
          updateValues.push(kvk.legal_form);
          updatedFields.push('entity_legal_form');
        }

        // Update address from bezoekadres
        if (bezoekadres) {
          // Build address_line1: street + house number + letter + addition
          let addressLine1 = '';
          if (bezoekadres.street) {
            addressLine1 = bezoekadres.street;
            if (bezoekadres.houseNumber) {
              addressLine1 += ` ${bezoekadres.houseNumber}`;
            }
            if (bezoekadres.houseLetter) {
              addressLine1 += bezoekadres.houseLetter;
            }
            if (bezoekadres.houseNumberAddition) {
              addressLine1 += `-${bezoekadres.houseNumberAddition}`;
            }
          } else if (bezoekadres.fullAddress) {
            // Fallback to full address if structured data not available
            addressLine1 = bezoekadres.fullAddress.split('\n')[0];
          }

          if (addressLine1) {
            updateFieldsSql.push(`address_line1 = $${paramIndex++}`);
            updateValues.push(addressLine1);
            updatedFields.push('address_line1');
          }

          if (bezoekadres.postalCode) {
            updateFieldsSql.push(`postal_code = $${paramIndex++}`);
            updateValues.push(bezoekadres.postalCode);
            updatedFields.push('postal_code');
          }

          if (bezoekadres.city) {
            updateFieldsSql.push(`city = $${paramIndex++}`);
            updateValues.push(bezoekadres.city);
            updatedFields.push('city');
          }

          if (bezoekadres.country) {
            updateFieldsSql.push(`country_code = $${paramIndex++}`);
            updateValues.push(bezoekadres.country === 'Nederland' ? 'NL' : bezoekadres.country);
            updatedFields.push('country_code');
          }
        }

        // Update registered_at from formal_registration_date
        if (kvk.formal_registration_date) {
          updateFieldsSql.push(`registered_at = $${paramIndex++}`);
          updateValues.push(kvk.formal_registration_date);
          updatedFields.push('registered_at');
        }

        // Execute update if we have fields to update
        if (updateFieldsSql.length > 0) {
          updateFieldsSql.push('dt_modified = NOW()');
          updateValues.push(legalentityid);

          await pool.query(`
            UPDATE legal_entity
            SET ${updateFieldsSql.join(', ')}
            WHERE legal_entity_id = $${paramIndex} AND is_deleted = false
          `, updateValues);

          companyDetailsUpdated = true;
          console.log('Updated legal_entity with KVK data:', updatedFields);
        }
      }
    } catch (kvkUpdateError: any) {
      console.warn('Failed to update legal_entity with KVK data:', kvkUpdateError.message);
    }

    // =========================================================================
    // 7. Fetch company logo from domain (for member portal theming)
    // =========================================================================
    let logoFetched = false;
    let logoUrl: string | null = null;
    try {
      // Get the domain from legal_entity
      const { rows: entityData } = await pool.query(`
        SELECT domain FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false
      `, [legalentityid]);

      const domain = entityData[0]?.domain;

      if (domain) {
        // Check if branding already exists
        const { rows: existingBranding } = await pool.query(`
          SELECT branding_id, logo_url FROM legal_entity_branding
          WHERE legal_entity_id = $1 AND is_deleted = false
        `, [legalentityid]);

        if (existingBranding.length === 0) {
          // Try to fetch logo from domain using Logo.dev-style URL or favicon
          // Using direct favicon URL as fallback (no API key required)
          const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

          // Try Google's favicon service first (free, no API key)
          const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
          // Alternative: DuckDuckGo favicon service
          const ddgFaviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;

          // Store the branding data with favicon URL
          await pool.query(`
            INSERT INTO legal_entity_branding (
              legal_entity_id, logo_url, logo_source, logo_format,
              favicon_url, extracted_from_domain, extracted_at,
              dt_created, dt_modified, created_by
            )
            VALUES ($1, $2, 'google_favicon', 'png', $3, $4, NOW(), NOW(), NOW(), 'enrichment')
          `, [legalentityid, googleFaviconUrl, ddgFaviconUrl, cleanDomain]);

          logoFetched = true;
          logoUrl = googleFaviconUrl;
          console.log('Stored company branding for domain:', cleanDomain);
        } else {
          logoUrl = existingBranding[0].logo_url;
          console.log('Branding already exists for legal entity');
        }
      }
    } catch (brandingError: any) {
      console.warn('Failed to fetch company branding:', brandingError.message);
    }

    // =========================================================================
    // Summary
    // =========================================================================
    const added = results.filter(r => r.status === 'added');
    const exists = results.filter(r => r.status === 'exists');
    const notAvailable = results.filter(r => r.status === 'not_available');
    const errors = results.filter(r => r.status === 'error');

    console.log('Enrichment completed:', {
      legalEntityId: legalentityid,
      added: added.map(r => r.identifier),
      exists: exists.map(r => r.identifier),
      notAvailable: notAvailable.map(r => r.identifier),
      errors: errors.map(r => r.identifier),
      companyDetailsUpdated,
      updatedFields,
      logoFetched
    });

    res.json({
      success: true,
      added_count: added.length,
      company_details_updated: companyDetailsUpdated,
      updated_fields: updatedFields,
      logo_fetched: logoFetched,
      logo_url: logoUrl,
      results,
      summary: {
        added: added.map(r => `${r.identifier}: ${r.value}`),
        already_exists: exists.map(r => r.identifier),
        not_available: notAvailable.map(r => `${r.identifier} (${r.message})`),
        errors: errors.map(r => `${r.identifier}: ${r.message}`),
        company_fields_updated: companyDetailsUpdated ? updatedFields : [],
        branding: logoFetched ? 'Logo fetched from domain' : (logoUrl ? 'Logo already exists' : 'No domain available')
      }
    });
  } catch (error: any) {
    console.error('Enrichment error:', {
      legalEntityId: legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Enrichment failed',
      detail: error.message,
      partial_results: results
    });
  }
});

// ============================================================================
// BRANDING
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/branding', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        branding_id,
        legal_entity_id,
        logo_url,
        logo_source,
        logo_format,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        text_color,
        preferred_theme,
        extracted_from_domain,
        extracted_at,
        dt_created,
        dt_modified
      FROM legal_entity_branding
      WHERE legal_entity_id = $1 AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No branding data found for this legal entity' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching branding:', {
      legalEntityId: req.params.legalentityid,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to fetch branding', detail: error.message });
  }
});

// Update branding (for manual color/logo updates)
router.put('/v1/legal-entities/:legalentityid/branding', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const {
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      preferred_theme
    } = req.body;

    // Check if branding exists
    const { rows: existing } = await pool.query(`
      SELECT branding_id FROM legal_entity_branding
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (existing.length === 0) {
      // Insert new record
      const { rows } = await pool.query(`
        INSERT INTO legal_entity_branding (
          legal_entity_id, logo_url, logo_source,
          primary_color, secondary_color, accent_color,
          background_color, text_color, preferred_theme,
          dt_created, dt_modified, created_by
        )
        VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, NOW(), NOW(), 'admin')
        RETURNING *
      `, [legalentityid, logo_url, primary_color, secondary_color, accent_color, background_color, text_color, preferred_theme || 'light']);

      return res.status(201).json(rows[0]);
    }

    // Update existing record
    const { rows } = await pool.query(`
      UPDATE legal_entity_branding SET
        logo_url = COALESCE($2, logo_url),
        logo_source = CASE WHEN $2 IS NOT NULL THEN 'manual' ELSE logo_source END,
        primary_color = COALESCE($3, primary_color),
        secondary_color = COALESCE($4, secondary_color),
        accent_color = COALESCE($5, accent_color),
        background_color = COALESCE($6, background_color),
        text_color = COALESCE($7, text_color),
        preferred_theme = COALESCE($8, preferred_theme),
        dt_modified = NOW(),
        modified_by = 'admin'
      WHERE legal_entity_id = $1 AND is_deleted = false
      RETURNING *
    `, [legalentityid, logo_url, primary_color, secondary_color, accent_color, background_color, text_color, preferred_theme]);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating branding:', {
      legalEntityId: req.params.legalentityid,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to update branding', detail: error.message });
  }
});

// ============================================================================
// ENDPOINTS
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/endpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY endpoint_name ASC
    `, [legalentityid]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching endpoints:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch endpoints', detail: error.message });
  }
});

router.post('/v1/legal-entities/:legalentityid/endpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const endpointId = randomUUID();

    const { endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method } = req.body;

    if (!endpoint_url || !endpoint_name) {
      return res.status(400).json({ error: 'endpoint_url and endpoint_name are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_endpoint (
        legal_entity_endpoint_id, legal_entity_id, endpoint_type, endpoint_url,
        endpoint_name, is_active, authentication_method,
        dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [endpointId, legalentityid, endpoint_type || 'REST_API', endpoint_url, endpoint_name, is_active !== false, authentication_method]);

    // Invalidate endpoints cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legalentityid}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

router.put('/v1/endpoints/:endpointId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    const { endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_endpoint SET
        endpoint_type = COALESCE($1, endpoint_type),
        endpoint_url = COALESCE($2, endpoint_url),
        endpoint_name = COALESCE($3, endpoint_name),
        is_active = COALESCE($4, is_active),
        authentication_method = COALESCE($5, authentication_method),
        dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $6 AND is_deleted = false
      RETURNING *
    `, [endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method, endpointId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Invalidate endpoints cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

router.delete('/v1/endpoints/:endpointId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_endpoint SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [endpointId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Invalidate endpoints cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

// SSRF protection: Validate URL is safe to fetch (SEC-005)
function isUrlSafeForFetch(urlString: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { safe: false, reason: 'Localhost addresses are not allowed' };
    }

    // Block cloud metadata endpoints (AWS, Azure, GCP)
    const metadataEndpoints = [
      '169.254.169.254',  // AWS/Azure/GCP metadata
      'metadata.google.internal',
      'metadata.goog',
      '169.254.170.2',    // AWS ECS task metadata
    ];
    if (metadataEndpoints.includes(hostname)) {
      return { safe: false, reason: 'Cloud metadata endpoints are not allowed' };
    }

    // Block private IP ranges (RFC 1918)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(Number);

      // 10.0.0.0/8 - Private network
      if (a === 10) {
        return { safe: false, reason: 'Private IP ranges (10.x.x.x) are not allowed' };
      }

      // 172.16.0.0/12 - Private network
      if (a === 172 && b >= 16 && b <= 31) {
        return { safe: false, reason: 'Private IP ranges (172.16-31.x.x) are not allowed' };
      }

      // 192.168.0.0/16 - Private network
      if (a === 192 && b === 168) {
        return { safe: false, reason: 'Private IP ranges (192.168.x.x) are not allowed' };
      }

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) {
        return { safe: false, reason: 'Link-local addresses (169.254.x.x) are not allowed' };
      }

      // 0.0.0.0/8 - Current network
      if (a === 0) {
        return { safe: false, reason: 'Invalid IP address' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

// Test endpoint connection
router.post('/v1/endpoints/:endpointId/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    // Get the endpoint
    const { rows, rowCount } = await pool.query(`
      SELECT legal_entity_endpoint_id, endpoint_url, endpoint_name, authentication_method, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `, [endpointId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const endpoint = rows[0];

    // IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;
    const userRoles = (req as any).userRoles || [];

    // SystemAdmin and AssociationAdmin can test any endpoint
    const isAdmin = userRoles.includes('SystemAdmin') || userRoles.includes('AssociationAdmin');

    if (!isAdmin) {
      // Check if user's party owns this endpoint
      const { rows: partyRows } = await pool.query(`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `, [endpoint.legal_entity_id, userEmail]);

      if (partyRows.length === 0) {
        // Return 404 to prevent information disclosure (don't reveal endpoint exists)
        return res.status(404).json({ error: 'Endpoint not found' });
      }
    }

    const testStartTime = Date.now();
    let success = false;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    // Attempt to test connection if URL exists
    if (endpoint.endpoint_url) {
      // SSRF protection: Validate URL before fetching (SEC-005)
      const urlValidation = isUrlSafeForFetch(endpoint.endpoint_url);
      if (!urlValidation.safe) {
        errorMessage = `URL blocked: ${urlValidation.reason}`;
      } else {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(endpoint.endpoint_url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'manual', // Don't follow redirects automatically (SSRF protection)
          });
          clearTimeout(timeout);

          statusCode = response.status;
          // Consider redirect as partial success - URL is reachable but redirects
          if (response.status >= 300 && response.status < 400) {
            success = true;
            errorMessage = `Endpoint redirects to: ${response.headers.get('location') || 'unknown'}`;
          } else {
            success = response.ok;
          }
        } catch (fetchError: any) {
          errorMessage = fetchError.name === 'AbortError'
            ? 'Connection timeout (10s)'
            : fetchError.message || 'Connection failed';
        }
      }
    } else {
      errorMessage = 'No endpoint URL configured';
    }

    const responseTime = Date.now() - testStartTime;

    // Update the endpoint with test results
    await pool.query(`
      UPDATE legal_entity_endpoint
      SET last_connection_test = NOW(),
          last_connection_status = $2,
          connection_test_details = $3,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
    `, [
      endpointId,
      success ? 'SUCCESS' : 'FAILED',
      JSON.stringify({
        status_code: statusCode,
        response_time_ms: responseTime,
        error_message: errorMessage,
        tested_at: new Date().toISOString(),
      }),
    ]);

    res.json({
      success,
      message: success ? 'Connection successful' : (errorMessage || 'Connection failed'),
      details: {
        status_code: statusCode,
        response_time_ms: responseTime,
        error_message: errorMessage,
        tested_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error testing endpoint:', error);
    res.status(500).json({ error: 'Failed to test endpoint connection' });
  }
});

// Toggle endpoint active status
router.patch('/v1/endpoints/:endpointId/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { endpointId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    // First, get the endpoint to check authorization (SEC-006)
    const { rows: endpointRows, rowCount: endpointCount } = await pool.query(`
      SELECT legal_entity_endpoint_id, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `, [endpointId]);

    if (endpointCount === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const endpoint = endpointRows[0];

    // IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
    const userEmail = (req as any).userEmail;
    const userRoles = (req as any).userRoles || [];

    // SystemAdmin and AssociationAdmin can toggle any endpoint
    const isAdmin = userRoles.includes('SystemAdmin') || userRoles.includes('AssociationAdmin');

    if (!isAdmin) {
      // Check if user's party owns this endpoint
      const { rows: partyRows } = await pool.query(`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `, [endpoint.legal_entity_id, userEmail]);

      if (partyRows.length === 0) {
        // Return 404 to prevent information disclosure (don't reveal endpoint exists)
        return res.status(404).json({ error: 'Endpoint not found' });
      }
    }

    // Now perform the update
    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_endpoint
      SET is_active = $2,
          activation_date = CASE WHEN $2 = true THEN NOW() ELSE activation_date END,
          deactivation_date = CASE WHEN $2 = false THEN NOW() ELSE NULL END,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING *
    `, [endpointId, is_active]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Invalidate cache
    invalidateCacheForUser(req, `/v1/legal-entities/${rows[0].legal_entity_id}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error toggling endpoint:', error);
    res.status(500).json({ error: 'Failed to toggle endpoint status' });
  }
});

// ============================================================================
// APPLICATIONS - APPROVE/REJECT
// ============================================================================

// Helper function to convert country names to ISO 3166-1 alpha-2 codes
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

router.post('/v1/applications/:id/approve', requireAuth, async (req: Request, res: Response) => {
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
        return res.status(404).json({ error: 'Application not found' });
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
});

router.post('/v1/applications/:id/reject', requireAuth, async (req: Request, res: Response) => {
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
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// ============================================================================
// MEMBER PORTAL - SELF SERVICE
// ============================================================================
router.get('/v1/member-contacts', requireAuth, cacheMiddleware(CacheTTL.CONTACTS), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get legal_entity_id using email (members table dropped Dec 12, 2025)
    let entityResult = await pool.query(`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `, [userEmail]);

    // If not found, try by domain
    if (entityResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      entityResult = await pool.query(`
        SELECT legal_entity_id
        FROM vw_legal_entities
        WHERE domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id } = entityResult.rows[0];

    // Get all contacts for this legal entity
    const result = await pool.query(`
      SELECT
        legal_entity_contact_id,
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
        dt_created,
        dt_modified
      FROM legal_entity_contact
      WHERE legal_entity_id = $1
      ORDER BY is_primary DESC, full_name ASC
    `, [legal_entity_id]);

    res.json({ contacts: result.rows });
  } catch (error: any) {
    console.error('Error fetching member contacts:', error);
    res.status(500).json({ error: 'Failed to fetch member contacts' });
  }
});

router.get('/v1/member-endpoints', requireAuth, cacheMiddleware(CacheTTL.ENDPOINTS), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get member's legal_entity_id using email
    let memberResult = await pool.query(`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    // If not found, try by domain (members table dropped Dec 12, 2025)
    if (memberResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      memberResult = await pool.query(`
        SELECT legal_entity_id
        FROM vw_legal_entities
        WHERE domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id } = memberResult.rows[0];

    // Get all endpoints for this member's legal entity
    const result = await pool.query(`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1
        AND is_deleted = false
      ORDER BY dt_created DESC
    `, [legal_entity_id]);

    res.json({ endpoints: result.rows });
  } catch (error: any) {
    console.error('Error fetching member endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch member endpoints' });
  }
});

// ============================================================================
// TIER MANAGEMENT
// ============================================================================
router.get('/v1/entities/:legalentityid/tier', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        authentication_tier as tier,
        authentication_method as method,
        dns_verified_at as "verifiedAt",
        dns_reverification_due as "reverificationDue",
        eherkenning_level as "eherkenningLevel"
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching tier info:', error);
    res.status(500).json({ error: 'Failed to fetch tier information' });
  }
});

router.put('/v1/entities/:legalentityid/tier', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { tier, method, dnsVerifiedDomain, eherkenningIdentifier, eherkenningLevel } = req.body;

    if (!tier || !method) {
      return res.status(400).json({ error: 'tier and method are required' });
    }

    const { rowCount } = await pool.query(`
      UPDATE legal_entity
      SET
        authentication_tier = $1,
        authentication_method = $2,
        dns_verified_domain = $3,
        dns_verified_at = $4,
        eherkenning_identifier = $5,
        eherkenning_level = $6,
        dt_modified = NOW()
      WHERE legal_entity_id = $7 AND is_deleted = false
    `, [tier, method, dnsVerifiedDomain, dnsVerifiedDomain ? new Date() : null, eherkenningIdentifier, eherkenningLevel, legalentityid]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json({ message: 'Tier updated successfully' });
  } catch (error: any) {
    console.error('Error updating tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// ============================================================================
// DNS VERIFICATION
// ============================================================================
router.post('/v1/entities/:legalentityid/dns/token', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'domain is required' });
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if there's an existing pending token for this entity+domain
    const existingToken = await pool.query(`
      SELECT token_id, domain, token, record_name, expires_at, status
      FROM dns_verification_tokens
      WHERE legal_entity_id = $1 AND domain = $2 AND status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [legalentityid, domain]);

    // If valid token exists, return it instead of creating a new one
    if (existingToken.rows.length > 0) {
      const existing = existingToken.rows[0];
      return res.json({
        tokenId: existing.token_id,
        domain: existing.domain,
        token: existing.token,
        recordName: existing.record_name,
        expiresAt: existing.expires_at,
        status: existing.status,
        instructions: {
          recordType: 'TXT',
          recordName: existing.record_name,
          recordValue: existing.token,
          ttl: 3600
        }
      });
    }

    // Expire any old pending tokens for this entity+domain (handles edge cases)
    await pool.query(`
      UPDATE dns_verification_tokens
      SET status = 'expired'
      WHERE legal_entity_id = $1 AND domain = $2 AND status = 'pending'
    `, [legalentityid, domain]);

    // Generate new token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenId = crypto.randomUUID();
    const recordName = `_ctn-verify.${domain}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store in database
    await pool.query(`
      INSERT INTO dns_verification_tokens (token_id, legal_entity_id, domain, token, record_name, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [tokenId, legalentityid, domain, token, recordName, expiresAt]);

    res.json({
      tokenId,
      domain,
      token,
      recordName,
      expiresAt,
      status: 'pending',
      instructions: {
        recordType: 'TXT',
        recordName,
        recordValue: token,
        ttl: 3600
      }
    });
  } catch (error: any) {
    console.error('Error generating DNS token:', error);
    res.status(500).json({ error: 'Failed to generate DNS token' });
  }
});

router.post('/v1/dns/verify/:tokenid', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tokenid } = req.params;
    console.log(`[DNS Verification] Starting verification for token: ${tokenid}`);

    // Use the DNS verification service to perform actual DNS lookup
    const result = await dnsVerificationService.verifyToken(tokenid);

    console.log('[DNS Verification] Result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error: any) {
    console.error('[DNS Verification] Error verifying DNS token:', error);
    res.status(500).json({
      error: 'Failed to verify DNS token',
      details: error.message
    });
  }
});

router.get('/v1/entities/:legalentityid/dns/tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT token_id as "tokenId", domain, token, record_name as "recordName", expires_at as "expiresAt", status
      FROM dns_verification_tokens
      WHERE legal_entity_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
    `, [legalentityid]);

    res.json({ tokens: rows });
  } catch (error: any) {
    console.error('Error fetching pending DNS tokens:', error);
    res.status(500).json({ error: 'Failed to fetch pending DNS tokens' });
  }
});

router.get('/v1/tiers/requirements', async (req: Request, res: Response) => {
  try {
    // Return tier requirements (public endpoint)
    res.json({
      requirements: {
        tier1: {
          name: 'Basic',
          methods: ['email'],
          description: 'Email verification only'
        },
        tier2: {
          name: 'Standard',
          methods: ['dns', 'kvk'],
          description: 'DNS or KvK verification'
        },
        tier3: {
          name: 'Enhanced',
          methods: ['eherkenning'],
          description: 'eHerkenning EH3 or higher'
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching tier requirements:', error);
    res.status(500).json({ error: 'Failed to fetch tier requirements' });
  }
});

// ============================================================================
// AUTHORIZATION LOG
// ============================================================================
router.get('/v1/authorization-log', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const legalEntityId = req.query.legalEntityId as string;
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');

    let sql = `
      SELECT
        log_id,
        legal_entity_id,
        user_identifier,
        requested_resource,
        requested_action,
        required_tier,
        user_tier,
        authorization_result,
        denial_reason,
        request_ip_address,
        created_at
      FROM authorization_log
    `;

    const params: (string | number)[] = [];
    if (legalEntityId) {
      sql += ' WHERE legal_entity_id = $1';
      params.push(legalEntityId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);

    res.json({
      data: result.rows,
      pagination: { limit, offset, total: result.rowCount }
    });
  } catch (error: any) {
    console.error('Error fetching authorization log:', error);
    res.status(500).json({ error: 'Failed to fetch authorization log' });
  }
});

// ============================================================================
// M2M CLIENTS
// ============================================================================
router.get('/v1/legal-entities/:legal_entity_id/m2m-clients', requireAuth, cacheMiddleware(CacheTTL.M2M_CLIENTS), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legal_entity_id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        m.m2m_client_id,
        m.legal_entity_id,
        m.client_name,
        m.azure_client_id,
        m.assigned_scopes,
        m.is_active,
        m.dt_created,
        m.dt_modified,
        m.legal_entity_endpoint_id,
        e.endpoint_url as "endpointUrl",
        e.endpoint_name as "endpointName"
      FROM m2m_clients m
      LEFT JOIN legal_entity_endpoint e ON m.legal_entity_endpoint_id = e.legal_entity_endpoint_id
      WHERE m.legal_entity_id = $1 AND m.is_deleted = false
      ORDER BY m.dt_created DESC
    `, [legal_entity_id]);

    res.json({ clients: rows });
  } catch (error: any) {
    console.error('Error listing M2M clients:', error);
    res.status(500).json({ error: 'Failed to list M2M clients' });
  }
});

router.post('/v1/legal-entities/:legal_entity_id/m2m-clients', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legal_entity_id } = req.params;
    const { client_name, description, assigned_scopes, legal_entity_endpoint_id } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'client_name is required' });
    }

    // Validate that endpoint belongs to the legal entity (if provided)
    if (legal_entity_endpoint_id) {
      const endpointCheck = await pool.query(`
        SELECT legal_entity_id FROM legal_entity_endpoint
        WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      `, [legal_entity_endpoint_id]);

      if (endpointCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      if (endpointCheck.rows[0].legal_entity_id !== legal_entity_id) {
        return res.status(403).json({ error: 'Endpoint does not belong to this legal entity' });
      }
    }

    const crypto = require('crypto');
    const azureClientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('base64');

    // Insert client (secrets are stored separately in m2m_client_secrets_audit or Key Vault)
    const { rows } = await pool.query(`
      INSERT INTO m2m_clients (legal_entity_id, client_name, azure_client_id, description, assigned_scopes, legal_entity_endpoint_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING m2m_client_id, legal_entity_id, client_name, azure_client_id, description, assigned_scopes, legal_entity_endpoint_id, is_active, dt_created
    `, [legal_entity_id, client_name, azureClientId, description || null, assigned_scopes || [], legal_entity_endpoint_id || null]);

    const newClient = rows[0];

    // Record secret generation in audit table
    await pool.query(`
      INSERT INTO m2m_client_secrets_audit (m2m_client_id, secret_generated_at)
      VALUES ($1, NOW())
    `, [newClient.m2m_client_id]);

    // Invalidate M2M clients cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legal_entity_id}/m2m-clients`);

    // Return client data with secret (only shown once - secret not stored in DB)
    res.status(201).json({
      client: newClient,
      client_secret: clientSecret
    });
  } catch (error: any) {
    console.error('Error creating M2M client:', error);
    res.status(500).json({ error: 'Failed to create M2M client' });
  }
});

router.post('/v1/m2m-clients/:m2m_client_id/generate-secret', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;

    // Generate a new secret
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32).toString('base64');
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

    const { rowCount } = await pool.query(`
      UPDATE m2m_clients SET client_secret_hash = $1, dt_modified = NOW()
      WHERE m2m_client_id = $2 AND is_deleted = false
    `, [secretHash, m2m_client_id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'M2M client not found' });
    }

    // Return the secret (only time it's visible)
    res.json({ clientSecret: secret, message: 'Store this secret securely - it cannot be retrieved again' });
  } catch (error: any) {
    console.error('Error generating M2M secret:', error);
    res.status(500).json({ error: 'Failed to generate M2M secret' });
  }
});

router.patch('/v1/m2m-clients/:m2m_client_id/scopes', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;
    const { scopes } = req.body;

    if (!Array.isArray(scopes)) {
      return res.status(400).json({ error: 'scopes must be an array' });
    }

    const { rows, rowCount } = await pool.query(`
      UPDATE m2m_clients SET assigned_scopes = $1, dt_modified = NOW()
      WHERE m2m_client_id = $2 AND is_deleted = false
      RETURNING m2m_client_id as "clientId", assigned_scopes as "scopes", client_name as "clientName", legal_entity_id
    `, [scopes, m2m_client_id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'M2M client not found' });
    }

    // Invalidate M2M clients cache
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/m2m-clients`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating M2M scopes:', error);
    res.status(500).json({ error: 'Failed to update M2M scopes' });
  }
});

router.delete('/v1/m2m-clients/:m2m_client_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE m2m_clients SET is_deleted = true, dt_modified = NOW()
      WHERE m2m_client_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [m2m_client_id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'M2M client not found' });
    }

    // Invalidate M2M clients cache
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/m2m-clients`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deactivating M2M client:', error);
    res.status(500).json({ error: 'Failed to deactivate M2M client' });
  }
});

// ============================================================================
// ADMIN TASKS
// ============================================================================
router.get('/v1/admin/tasks/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const taskType = req.query.task_type as string;
    const assignedTo = req.query.assigned_to as string;
    const includeOverdue = req.query.include_overdue === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    let sql = `
      SELECT *
      FROM admin_tasks
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND priority = $${params.length}`;
    }
    if (taskType) {
      params.push(taskType);
      sql += ` AND task_type = $${params.length}`;
    }
    if (assignedTo) {
      params.push(assignedTo);
      sql += ` AND assigned_to = $${params.length}`;
    }
    if (includeOverdue) {
      sql += ` AND due_date < NOW() AND status != 'completed'`;
    }

    params.push(limit);
    sql += ` ORDER BY priority DESC, due_date ASC LIMIT $${params.length}`;

    const { rows } = await pool.query(sql, params);

    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching admin tasks:', error);
    res.status(500).json({ error: 'Failed to fetch admin tasks' });
  }
});

router.put('/v1/admin/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { taskId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.status !== undefined) {
      paramCount++;
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      paramCount++;
      fields.push(`priority = $${paramCount}`);
      values.push(updates.priority);
    }
    if (updates.assigned_to !== undefined) {
      paramCount++;
      fields.push(`assigned_to = $${paramCount}`);
      values.push(updates.assigned_to);
    }
    if (updates.due_date !== undefined) {
      paramCount++;
      fields.push(`due_date = $${paramCount}`);
      values.push(updates.due_date);
    }
    if (updates.notes !== undefined) {
      paramCount++;
      fields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    fields.push(`dt_modified = NOW()`);
    values.push(taskId);

    const sql = `UPDATE admin_tasks SET ${fields.join(', ')} WHERE task_id = $${paramCount} RETURNING *`;

    const { rows, rowCount } = await pool.query(sql, values);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating admin task:', error);
    res.status(500).json({ error: 'Failed to update admin task' });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================
router.get('/v1/audit-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');
    const entityId = req.query.entityId as string;
    const action = req.query.action as string;

    let sql = `
      SELECT *
      FROM audit_log
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (entityId) {
      params.push(entityId);
      sql += ` AND entity_id = $${params.length}`;
    }
    if (action) {
      params.push(action);
      sql += ` AND action = $${params.length}`;
    }

    sql += ` ORDER BY dt_created DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);

    res.json({ data: rows, pagination: { limit, offset } });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.post('/v1/audit-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { entityId, entityType, action, details, userId } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO audit_log (
        event_type, severity, result, user_id, resource_type, resource_id,
        action, details, request_path, request_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'USER_ACTION',           // event_type (required NOT NULL)
      'INFO',                  // severity (required NOT NULL)
      'SUCCESS',               // result (required NOT NULL)
      userId,
      entityType,              // resource_type (was entity_type)
      entityId,                // resource_id (was entity_id)
      action,
      JSON.stringify(details),
      req.path,                // request_path
      req.method               // request_method
    ]);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// ============================================================================
// KVK VERIFICATION
// ============================================================================

// Get KvK verification status and document for a specific legal entity
router.get('/v1/legal-entities/:legalEntityId/kvk-verification', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalEntityId } = req.params;

    // Query legal_entity table for KvK document and verification data
    const { rows } = await pool.query(`
      SELECT
        le.kvk_document_url,
        le.kvk_verification_status,
        le.kvk_verified_at,
        le.kvk_verified_by,
        le.kvk_verification_notes,
        le.kvk_mismatch_flags,
        len.identifier_value as kvk_number
      FROM legal_entity le
      LEFT JOIN legal_entity_number len
        ON le.legal_entity_id = len.legal_entity_id
        AND len.identifier_type = 'KVK'
        AND len.is_deleted = false
      WHERE le.legal_entity_id = $1
        AND le.is_deleted = false
    `, [legalEntityId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Legal entity not found',
        legal_entity_id: legalEntityId
      });
    }

    const data = rows[0];

    // Generate SAS URL for document if it exists
    if (data.kvk_document_url) {
      try {
        const { BlobStorageService } = await import('./services/blobStorageService');
        const blobService = new BlobStorageService();
        data.kvk_document_url = await blobService.getDocumentSasUrl(data.kvk_document_url, 60);
      } catch (error) {
        console.error('Failed to generate SAS URL for KvK document:', error);
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching KvK verification status:', error);
    res.status(500).json({ error: 'Failed to fetch KvK verification status' });
  }
});

router.get('/v1/kvk-verification/flagged', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT
        le.legal_entity_id,
        le.primary_legal_name AS legal_name,
        MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value ELSE NULL END) AS kvk_number,
        le.kvk_verification_status,
        le.kvk_verified_at AS kvk_last_checked,
        le.dt_created
      FROM legal_entity le
      LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
      WHERE le.kvk_verification_status = 'flagged'
        AND le.is_deleted = false
      GROUP BY le.legal_entity_id, le.primary_legal_name, le.kvk_verification_status, le.kvk_verified_at, le.dt_created
      ORDER BY le.dt_created DESC
    `);

    res.json({ entities: rows });
  } catch (error: any) {
    console.error('Error fetching flagged entities:', error);
    res.status(500).json({ error: 'Failed to fetch flagged entities' });
  }
});

router.post('/v1/kvk-verification/:legalentityid/review', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { status, notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const { rowCount } = await pool.query(`
      UPDATE legal_entity
      SET
        kvk_verification_status = $1,
        kvk_review_notes = $2,
        kvk_reviewed_at = NOW(),
        dt_modified = NOW()
      WHERE legal_entity_id = $3 AND is_deleted = false
    `, [status, notes, legalentityid]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.json({ message: `KvK verification ${status}` });
  } catch (error: any) {
    console.error('Error reviewing KvK verification:', error);
    res.status(500).json({ error: 'Failed to review KvK verification' });
  }
});

// ============================================================================
// MEMBER STATUS (Updated Dec 12, 2025 - uses legal_entity, members table dropped)
// ============================================================================
// Support both PUT and PATCH for backward compatibility
router.put('/v1/members/:legalEntityId/status', requireAuth, updateMemberStatusHandler);
router.patch('/v1/members/:legalEntityId/status', requireAuth, updateMemberStatusHandler);

async function updateMemberStatusHandler(req: Request, res: Response) {
  try {
    const pool = getPool();
    const { legalEntityId } = req.params;
    const { status, reason, notes } = req.body;

    // Accept 'reason' or 'notes' for backward compatibility
    const statusNotes = notes || reason;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    // Get old status for response
    const { rows: oldRows } = await pool.query(
      `SELECT status FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false`,
      [legalEntityId]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const oldStatus = oldRows[0].status;

    // Update legal_entity status
    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity
      SET status = $1, dt_modified = NOW()
      WHERE legal_entity_id = $2 AND is_deleted = false
      RETURNING legal_entity_id, primary_legal_name, status, dt_modified
    `, [status, legalEntityId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Log status change to audit_log
    await pool.query(`
      INSERT INTO audit_log (event_type, severity, result, resource_type, resource_id, action, details)
      VALUES ('member_status_change', 'INFO', 'SUCCESS', 'legal_entity', $1, 'UPDATE_STATUS',
        jsonb_build_object('old_status', $2, 'new_status', $3, 'notes', $4))
    `, [legalEntityId, oldStatus, status, statusNotes || '']);

    res.json({
      message: 'Member status updated successfully',
      oldStatus,
      newStatus: status,
      legal_entity_id: rows[0].legal_entity_id,
      primary_legal_name: rows[0].primary_legal_name
    });
  } catch (error: any) {
    console.error('Error updating member status:', error);
    res.status(500).json({ error: 'Failed to update member status' });
  }
}

// Endpoint removed (Dec 12, 2025): /v1/admin/fix-missing-members
// Members table dropped - legal_entity IS the member now

// ============================================================================
// BDI (Business Data Interchange) ENDPOINTS
// ============================================================================

// JWKS Discovery Endpoint (Public - No Auth Required)
// Exposes CTN's public keys for BVAD signature verification
router.get('/.well-known/jwks', async (req: Request, res: Response) => {
  try {
    const { importSPKI, exportJWK } = await import('jose');

    const publicKeyPem = process.env.BDI_PUBLIC_KEY;
    const keyId = process.env.BDI_KEY_ID || 'ctn-bdi-2025-001';

    if (!publicKeyPem) {
      console.warn('BDI_PUBLIC_KEY not configured');
      return res.status(500).json({
        error: 'jwks_not_configured',
        error_description: 'Public key not configured on server',
      });
    }

    // Convert PEM public key to JWK format
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const jwk = await exportJWK(publicKey);

    // Build JWKS response
    const jwks = {
      keys: [
        {
          ...jwk,
          use: 'sig',
          alg: 'RS256',
          kid: keyId,
        },
      ],
    };

    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Public endpoint
    });

    res.json(jwks);
  } catch (error: any) {
    console.error('Error generating JWKS:', error);
    res.status(500).json({
      error: 'internal_server_error',
      error_description: 'Failed to generate JWKS',
    });
  }
});

// BDI Token endpoints removed (Dec 12, 2025)
// Tables bvad_issued_tokens, bvod_validation_log, bdi_orchestrations were dropped
// Feature was never fully implemented
