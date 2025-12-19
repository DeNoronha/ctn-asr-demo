/**
 * Contacts Controller
 *
 * Handles contact CRUD operations for legal entities.
 * Contacts are people associated with a legal entity (PRIMARY, BILLING, TECHNICAL, ADMIN).
 *
 * @module controllers/contacts
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { invalidateCacheForUser } from '../middleware/cache';

// ============================================================================
// CONTACTS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/contacts
 * Get all contacts for a legal entity
 */
export async function getContactsByLegalEntity(req: Request, res: Response): Promise<void> {
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
}

/**
 * POST /v1/legal-entities/:legalentityid/contacts
 * Create a new contact for a legal entity
 */
export async function createContactForLegalEntity(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const contactId = randomUUID();

    const { contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    if (!full_name || !email) {
      res.status(400).json({ error: 'full_name and email are required' });
      return;
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
}

/**
 * PUT /v1/legal-entities/:legalentityid/contacts/:contactId
 * Update a contact for a legal entity
 */
export async function updateContactForLegalEntity(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Contact not found' });
      return;
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
}

/**
 * DELETE /v1/legal-entities/:legalentityid/contacts/:contactId
 * Soft-delete a contact for a legal entity
 */
export async function deleteContactForLegalEntity(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_contact SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_contact_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [contactId]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
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
}

// ============================================================================
// STANDALONE CONTACT ENDPOINTS
// ============================================================================

/**
 * GET /v1/contacts/:contactId
 * Get a single contact by ID
 */
export async function getContactById(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
}

/**
 * POST /v1/contacts
 * Create a new contact (standalone endpoint)
 */
export async function createContact(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const contactId = randomUUID();

    const { legal_entity_id, contact_type, full_name, email, phone, job_title, is_primary } = req.body;

    if (!legal_entity_id || !full_name || !email) {
      res.status(400).json({ error: 'legal_entity_id, full_name and email are required' });
      return;
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
}

/**
 * PUT /v1/contacts/:contactId
 * Update a contact (standalone endpoint)
 */
export async function updateContact(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
}

/**
 * DELETE /v1/contacts/:contactId
 * Soft-delete a contact (standalone endpoint)
 */
export async function deleteContact(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { contactId } = req.params;

    const { rowCount } = await pool.query(`
      UPDATE legal_entity_contact SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_contact_id = $1 AND is_deleted = false
    `, [contactId]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
}

// ============================================================================
// MEMBER PORTAL SELF-SERVICE
// ============================================================================

/**
 * GET /v1/member-contacts
 * Get contacts for the current user's legal entity
 */
export async function getMemberContacts(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      res.status(404).json({ error: 'Member not found' });
      return;
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
}
