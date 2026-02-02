/**
 * Members Controller
 *
 * Handles member listing and legal entity CRUD operations.
 * Members are represented as legal entities in the database.
 *
 * @module controllers/members
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

/**
 * GET /v1/members
 * List all members with pagination and search
 */
export async function getMembers(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { page = '1', limit = '50', search, status } = req.query;

    // Use vw_legal_entities view for member listing (includes city, country_code, vat, peppol for UI)
    let query = `
      SELECT legal_entity_id, primary_legal_name as legal_name, city, country_code, kvk, lei, euid, eori, duns, vat, peppol,
             domain, status, membership_level, authentication_tier, authentication_method,
             dt_created as created_at, metadata, contact_count, endpoint_count
      FROM vw_legal_entities
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (primary_legal_name ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR kvk ILIKE $${paramIndex})`;
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
      countQuery += ` AND (primary_legal_name ILIKE $${countParamIndex} OR city ILIKE $${countParamIndex} OR kvk ILIKE $${countParamIndex})`;
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
}

/**
 * GET /v1/all-members
 * Alias for /v1/members - used by admin portal (uses page_size param)
 */
export async function getAllMembers(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { page = '1', page_size = '50', search, status } = req.query;
    const limit = page_size; // all-members uses page_size param

    // Use vw_legal_entities view for member listing (includes city, country_code, vat, peppol for UI)
    let query = `
      SELECT legal_entity_id, primary_legal_name as legal_name, city, country_code, kvk, lei, euid, eori, duns, vat, peppol,
             domain, status, membership_level, authentication_tier, authentication_method,
             dt_created as created_at, metadata, contact_count, endpoint_count
      FROM vw_legal_entities
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (primary_legal_name ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR kvk ILIKE $${paramIndex})`;
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
      countQuery += ` AND (primary_legal_name ILIKE $${countParamIndex} OR city ILIKE $${countParamIndex} OR kvk ILIKE $${countParamIndex})`;
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
}

/**
 * PUT/PATCH /v1/members/:legalEntityId/status
 * Update member status with audit logging
 */
export async function updateMemberStatus(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalEntityId } = req.params;
    const { status, reason, notes } = req.body;

    // Accept 'reason' or 'notes' for backward compatibility
    const statusNotes = notes || reason;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    // Get old status for response
    const { rows: oldRows } = await pool.query(
      `SELECT status FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false`,
      [legalEntityId]
    );

    if (oldRows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
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
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Log status change to audit_log (use COALESCE to handle NULL values)
    await pool.query(`
      INSERT INTO audit_log (event_type, severity, result, resource_type, resource_id, action, details)
      VALUES ('member_status_change', 'INFO', 'SUCCESS', 'legal_entity', $1, 'UPDATE_STATUS',
        jsonb_build_object('old_status', COALESCE($2::text, 'unknown'), 'new_status', $3::text, 'notes', $4::text))
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

/**
 * GET /v1/legal-entities
 * List all legal entities with pagination
 */
export async function getLegalEntities(req: Request, res: Response): Promise<void> {
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
}

/**
 * GET /v1/legal-entities/:legalentityid
 * Get a single legal entity by ID
 */
export async function getLegalEntityById(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
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
}

/**
 * POST /v1/legal-entities
 * Create a new legal entity
 */
export async function createLegalEntity(req: Request, res: Response): Promise<void> {
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
      res.status(400).json({ error: 'primary_legal_name is required' });
      return;
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
}

/**
 * PUT /v1/legal-entities/:legalentityid
 * Update a legal entity
 */
export async function updateLegalEntity(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating legal entity:', error);
    res.status(500).json({ error: 'Failed to update legal entity' });
  }
}

/**
 * DELETE /v1/legal-entities/:legalentityid
 * Soft-delete a legal entity and cascade to related records
 */
export async function deleteLegalEntity(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    // 2. Cascade soft-delete all related records
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
}
