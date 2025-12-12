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

    // Use the v_members_full view which includes all identifier types (euid, eori, duns, etc.)
    let query = `
      SELECT legal_entity_id, legal_name, kvk, lei, euid, eori, duns, domain, status, membership_level,
             created_at, member_metadata, legal_entity_metadata, contact_count, endpoint_count
      FROM v_members_full
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
    let countQuery = `SELECT COUNT(*) FROM v_members_full WHERE 1=1`;
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

// Alias for /v1/members - used by admin portal
router.get('/v1/all-members', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { page = '1', page_size = '50', search, status } = req.query;
    const limit = page_size; // all-members uses page_size param

    // Use the v_members_full view which includes all identifier types (euid, eori, duns, etc.)
    let query = `
      SELECT legal_entity_id, legal_name, kvk, lei, euid, eori, duns, domain, status, membership_level,
             created_at, member_metadata, legal_entity_metadata, contact_count, endpoint_count
      FROM v_members_full
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
    let countQuery = `SELECT COUNT(*) FROM v_members_full WHERE 1=1`;
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
      `SELECT legal_entity_id FROM members_view WHERE kvk = $1`,
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
    let result = await pool.query(
      `
      SELECT
        m.org_id as "organizationId",
        m.legal_name as "legalName",
        m.lei,
        m.kvk,
        m.domain,
        m.status,
        m.membership_level as "membershipLevel",
        m.created_at as "createdAt",
        le.primary_legal_name as "entityName",
        le.entity_legal_form as "entityType",
        m.legal_entity_id as "legalEntityId",
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
      FROM v_members_full m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
        AND (len.is_deleted = false OR len.is_deleted IS NULL)
      WHERE c.email = $1 AND c.is_active = true
      GROUP BY m.org_id, m.legal_name, m.lei, m.kvk, m.domain, m.status,
               m.membership_level, m.created_at, le.primary_legal_name,
               le.entity_legal_form, m.legal_entity_id, c.full_name, c.email, c.job_title
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
          m.org_id as "organizationId",
          m.legal_name as "legalName",
          m.lei,
          m.kvk,
          m.domain,
          m.status,
          m.membership_level as "membershipLevel",
          m.created_at as "createdAt",
          le.primary_legal_name as "entityName",
          le.entity_legal_form as "entityType",
          m.legal_entity_id as "legalEntityId",
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
        FROM v_members_full m
        LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
        LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
          AND (len.is_deleted = false OR len.is_deleted IS NULL)
        WHERE m.domain = $1
        GROUP BY m.org_id, m.legal_name, m.lei, m.kvk, m.domain, m.status,
                 m.membership_level, m.created_at, le.primary_legal_name,
                 le.entity_legal_form, m.legal_entity_id
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

    // Get member ID from their email
    const memberResult = await pool.query(`
      SELECT m.id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { id: memberId } = memberResult.rows[0];

    // Get all API tokens for this member
    const tokensResult = await pool.query(`
      SELECT
        jti,
        token_type,
        issued_at,
        expires_at,
        revoked,
        metadata
      FROM issued_tokens
      WHERE member_id = $1
      ORDER BY issued_at DESC
      LIMIT 50
    `, [memberId]);

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

    // Get member ID
    const memberResult = await pool.query(`
      SELECT m.id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { id: memberId } = memberResult.rows[0];

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
        member_id,
        issued_at,
        expires_at,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [jti, 'API', memberId, now, expiresAt, JSON.stringify({ description })]);

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

    // Get member ID
    const memberResult = await pool.query(`
      SELECT m.id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { id: memberId } = memberResult.rows[0];

    // Revoke the token (only if it belongs to this member)
    const result = await pool.query(`
      UPDATE issued_tokens
      SET revoked = true
      WHERE jti = $1 AND member_id = $2
      RETURNING jti
    `, [tokenId, memberId]);

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
      SELECT legal_entity_contact_id, contact_type, full_name, email, phone, mobile,
             job_title, department, is_primary, is_active, preferred_contact_method,
             dt_created, dt_modified
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
             membership_level, address_line1, address_line2, postal_code, city,
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
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Soft delete
    const { rowCount } = await pool.query(`
      UPDATE legal_entity SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting legal entity:', error);
    res.status(500).json({ error: 'Failed to delete legal entity' });
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

    const { rows } = await pool.query(`
      SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
             country_code, issued_by, validated_by, validation_status, validation_date,
             registry_name, registry_url, issuing_authority, issued_at, expires_at,
             verification_status, verification_document_url, verification_notes,
             dt_created, dt_modified
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY identifier_type ASC
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

    const { rows } = await pool.query(`
      SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
             country_code, issued_by, validated_by, validation_status, validation_date,
             registry_name, registry_url, issuing_authority, issued_at, expires_at,
             verification_status, verification_document_url, verification_notes,
             dt_created, dt_modified
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY identifier_type ASC
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

    const { identifier_type, identifier_value, issuing_authority, issued_at, expires_at, verification_status } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_number SET
        identifier_type = COALESCE($1, identifier_type),
        identifier_value = COALESCE($2, identifier_value),
        issuing_authority = COALESCE($3, issuing_authority),
        issued_at = COALESCE($4, issued_at),
        expires_at = COALESCE($5, expires_at),
        verification_status = COALESCE($6, verification_status),
        dt_modified = NOW()
      WHERE legal_entity_reference_id = $7 AND is_deleted = false
      RETURNING *
    `, [identifier_type, identifier_value, issuing_authority, issued_at, expires_at, verification_status, identifierId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Identifier not found' });
    }

    // Invalidate identifiers cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/identifiers`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating identifier:', error);
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

    // Get the KvK identifier for this legal entity
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
          kvkData.materialRegistrationDate,
          kvkData.status || 'Active',
          JSON.stringify(kvkData.addresses),
          JSON.stringify(kvkData.sbiActivities),
          kvkData.totalEmployees,
          JSON.stringify(validation.companyData)
        ]);

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
// ENDPOINTS
// ============================================================================
router.get('/v1/legal-entities/:legalentityid/endpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT legal_entity_endpoint_id, legal_entity_id, endpoint_type, endpoint_url,
             endpoint_name, is_active, authentication_method,
             dt_created, dt_modified
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

      // 6a. Create members record (required for Member Portal login)
      const memberId = randomUUID();
      await client.query(`
        INSERT INTO members (
          id, org_id, legal_entity_id, email, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [
        memberId,
        legalEntityId, // org_id (UUIDs are 36 chars, well under varchar(100) limit)
        legalEntityId,
        application.applicant_email
      ]);

      // 7. Update application status and link to created member
      await client.query(`
        UPDATE applications
        SET status = 'approved',
            reviewed_at = NOW(),
            dt_updated = NOW(),
            created_member_id = $2
        WHERE application_id = $1
      `, [id, memberId]);

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
      memberId: memberId,
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

    // Get member's legal_entity_id using email
    let memberResult = await pool.query(`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    // If not found, try by domain
    if (memberResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      memberResult = await pool.query(`
        SELECT m.legal_entity_id
        FROM v_members_full m
        WHERE m.domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { legal_entity_id } = memberResult.rows[0];

    // Get all contacts for this member's legal entity
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

    // If not found, try by domain
    if (memberResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      memberResult = await pool.query(`
        SELECT m.legal_entity_id
        FROM v_members_full m
        WHERE m.domain = $1
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
// MEMBER STATUS
// ============================================================================
router.put('/v1/members/:memberId/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { memberId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const { rows, rowCount } = await pool.query(`
      UPDATE members
      SET status = $1, status_reason = $2, dt_modified = NOW()
      WHERE org_id = $3
      RETURNING *
    `, [status, reason, memberId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating member status:', error);
    res.status(500).json({ error: 'Failed to update member status' });
  }
});

// Admin endpoint to fix missing member records
router.post('/v1/admin/fix-missing-members', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();

  try {
    // Insert missing member records for legal entities without members
    const { rows } = await pool.query(`
      INSERT INTO members (
        id, org_id, legal_entity_id, email, created_at, updated_at
      )
      SELECT
        gen_random_uuid() as id,
        le.legal_entity_id as org_id,
        le.legal_entity_id,
        COALESCE(lec.email, 'noreply@example.com') as email,
        le.dt_created as created_at,
        NOW() as updated_at
      FROM legal_entity le
      LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
      LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.is_primary = true AND lec.is_deleted = false
      WHERE m.id IS NULL
        AND le.is_deleted = false
        AND le.status IN ('ACTIVE', 'PENDING')
      ON CONFLICT DO NOTHING
      RETURNING legal_entity_id, email
    `);

    res.json({
      message: `Created ${rows.length} missing member record(s)`,
      created: rows
    });
  } catch (error: any) {
    console.error('Error fixing missing members:', error);
    res.status(500).json({ error: 'Failed to fix missing members' });
  }
});

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

// Generate BVAD Token (Requires Authentication)
router.post('/v1/bdi/tokens/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { legal_entity_id } = req.body;

    if (!legal_entity_id) {
      return res.status(400).json({ error: 'legal_entity_id is required' });
    }

    // Get full member data including identifiers
    const { rows: memberRows } = await pool.query(`
      SELECT
        le.legal_entity_id,
        le.primary_legal_name,
        le.status,
        le.country_code,
        m.email,
        lec.contact_name as admin_name,
        lec.email as admin_email,
        lec.role as admin_role,
        lec.phone as admin_phone
      FROM legal_entity le
      JOIN members m ON le.legal_entity_id = m.legal_entity_id
      LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id
        AND lec.is_primary = true
        AND lec.is_deleted = false
      WHERE le.legal_entity_id = $1 AND le.is_deleted = false
    `, [legal_entity_id]);

    if (memberRows.length === 0) {
      return res.status(404).json({ error: 'Legal entity not found' });
    }

    const member = memberRows[0];

    // Get identifiers
    const { rows: identifierRows } = await pool.query(`
      SELECT identifier_type, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legal_entity_id]);

    const identifiers: Record<string, string> = {};
    identifierRows.forEach(row => {
      identifiers[row.identifier_type.toLowerCase()] = row.identifier_value;
    });

    // Get primary endpoint for BDI connector URI
    const { rows: endpointRows } = await pool.query(`
      SELECT endpoint_uri
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1 AND is_deleted = false AND is_primary = true
      LIMIT 1
    `, [legal_entity_id]);

    // Generate BVAD token
    const { generateBvad } = await import('./services/bdiJwtService');

    const token = generateBvad({
      memberDomain: member.email.split('@')[1], // Extract domain from email
      legalName: member.primary_legal_name,
      kvk: identifiers.kvk,
      lei: identifiers.lei,
      euid: identifiers.euid,
      countryCode: member.country_code || 'NL',
      status: member.status,
      complianceChecked: member.status === 'ACTIVE',
      ownerChecked: member.status === 'ACTIVE',
      bdiConnectorUri: endpointRows.length > 0 ? endpointRows[0].endpoint_uri : undefined,
      adminContact: member.admin_name ? {
        name: member.admin_name,
        email: member.admin_email,
        role: member.admin_role,
        phone: member.admin_phone,
      } : undefined,
      validityHours: 24,
    });

    // Store issued token in database
    await pool.query(`
      INSERT INTO bvad_issued_tokens (
        token_id, legal_entity_id, issued_at, expires_at,
        token_hash, issued_by, dt_created
      )
      VALUES ($1, $2, NOW(), NOW() + INTERVAL '24 hours', $3, $4, NOW())
    `, [
      randomUUID(),
      legal_entity_id,
      token.substring(0, 64), // Store hash prefix for lookup
      (req as any).user?.oid || 'system',
    ]);

    res.json({
      token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      legal_entity_id,
    });
  } catch (error: any) {
    console.error('Error generating BVAD token:', error);
    res.status(500).json({ error: 'Failed to generate BVAD token', detail: error.message });
  }
});

// Validate BVOD Token (Requires Authentication)
router.post('/v1/bdi/tokens/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    // Validate token signature and claims
    const { validateBvodToken, extractOrchestrationDetails } = await import('./services/bdiJwtService');

    const validation = await validateBvodToken(token);

    if (!validation.valid) {
      return res.status(401).json({
        valid: false,
        reason: validation.reason,
        expired: validation.expired,
        signatureValid: validation.signatureValid,
      });
    }

    // Extract orchestration details
    const orchestrationDetails = extractOrchestrationDetails(validation.claims!);

    // Log validation event
    await pool.query(`
      INSERT INTO bvod_validation_log (
        log_id, token_jti, validation_result,
        validation_reason, orchestration_id, validated_by, dt_created
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      randomUUID(),
      validation.claims!.jti,
      'valid',
      'Token validated successfully',
      orchestrationDetails.internalUuid || null,
      (req as any).user?.oid || 'system',
    ]);

    res.json({
      valid: true,
      claims: validation.claims,
      orchestration: orchestrationDetails,
      signatureValid: true,
    });
  } catch (error: any) {
    console.error('Error validating BVOD token:', error);

    // Log failed validation
    const pool = getPool();
    await pool.query(`
      INSERT INTO bvod_validation_log (
        log_id, token_jti, validation_result,
        validation_reason, validated_by, dt_created
      )
      VALUES ($1, NULL, $2, $3, $4, NOW())
    `, [
      randomUUID(),
      'invalid',
      error.message,
      (req as any).user?.oid || 'system',
    ]);

    res.status(500).json({ error: 'Token validation failed', detail: error.message });
  }
});
