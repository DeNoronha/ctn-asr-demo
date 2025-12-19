/**
 * Member Portal Controller
 *
 * Handles member portal self-service operations.
 * These routes are used by authenticated members to manage their own organization data.
 *
 * @module controllers/member-portal
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

// ============================================================================
// MEMBER PROFILE
// ============================================================================

/**
 * GET /v1/member
 * Get current member's organization profile with identifiers
 */
export async function getMemberProfile(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const userId = (req as any).userId;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized', message: 'User email not found in token' });
      return;
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
      res.status(404).json({
        error: 'not_found',
        error_description: 'No member data found for this user',
        email: userEmail,
        userId: userId,
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching authenticated member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
}

// ============================================================================
// MEMBER API TOKENS
// ============================================================================

/**
 * GET /v1/member/tokens
 * Get all API tokens for the current member's organization
 */
export async function getMemberTokens(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Member not found' });
      return;
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
}

/**
 * POST /v1/member/tokens
 * Create a new API token for the current member's organization
 */
export async function createMemberToken(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { description, expiresInDays = 365 } = req.body;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const { legal_entity_id: legalEntityId } = entityResult.rows[0];

    // Generate new token
    const jti = `api-${randomUUID()}`;
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
}

/**
 * DELETE /v1/member/tokens/:tokenId
 * Revoke an API token for the current member's organization
 */
export async function revokeMemberToken(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { tokenId } = req.params;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Member not found' });
      return;
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
      res.status(404).json({ error: 'Token not found or does not belong to you' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error revoking member token:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
}

// ============================================================================
// MEMBER CONTACTS (Self-service)
// ============================================================================

/**
 * GET /v1/member/contacts
 * Get all contacts for the current member's organization
 */
export async function getMemberOrgContacts(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
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
}

/**
 * PUT /v1/member/contacts/:contactId
 * Update a contact for the current member's organization
 */
export async function updateMemberOrgContact(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;
    const { contactId } = req.params;
    const { contact_type, full_name, email, phone, mobile, job_title, department, is_primary, preferred_contact_method } = req.body;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    const { legal_entity_id } = legalEntityResult.rows[0];

    // Verify the contact belongs to this legal entity
    const contactCheck = await pool.query(`
      SELECT legal_entity_contact_id FROM legal_entity_contact
      WHERE legal_entity_contact_id = $1 AND legal_entity_id = $2 AND is_deleted = false
    `, [contactId, legal_entity_id]);

    if (contactCheck.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found or does not belong to your organization' });
      return;
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
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ message: 'Contact updated successfully' });
  } catch (error: any) {
    console.error('Error updating member contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
}
