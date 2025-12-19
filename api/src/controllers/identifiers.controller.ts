/**
 * Identifiers Controller
 *
 * Handles identifier CRUD operations for legal entities.
 * Identifiers include KvK, LEI, EORI, VAT, DUNS, RSIN, EUID, etc.
 *
 * @module controllers/identifiers
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { invalidateCacheForUser } from '../middleware/cache';

// ============================================================================
// IDENTIFIERS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/identifiers
 * Get all identifiers for a legal entity
 */
export async function getIdentifiersByLegalEntity(req: Request, res: Response): Promise<void> {
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
}

/**
 * POST /v1/legal-entities/:legalentityid/identifiers
 * Create a new identifier for a legal entity
 */
export async function createIdentifierForLegalEntity(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const identifierId = randomUUID();

    const { identifier_type, identifier_value, country_code, issuing_authority, issued_at, expires_at, verification_status } = req.body;

    if (!identifier_type || !identifier_value) {
      res.status(400).json({ error: 'identifier_type and identifier_value are required' });
      return;
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
}

// ============================================================================
// STANDALONE IDENTIFIER ENDPOINTS
// ============================================================================

/**
 * GET /v1/identifiers/:identifierId
 * Get a single identifier by ID
 */
export async function getIdentifierById(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Identifier not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching identifier:', error);
    res.status(500).json({ error: 'Failed to fetch identifier' });
  }
}

/**
 * PUT /v1/identifiers/:identifierId
 * Update an identifier
 */
export async function updateIdentifier(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Identifier not found' });
      return;
    }

    // Invalidate identifiers cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/identifiers`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating identifier:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'uq_identifier') {
      res.status(409).json({
        error: 'Duplicate identifier',
        message: 'An identifier with this type and value already exists for this legal entity'
      });
      return;
    }

    res.status(500).json({ error: 'Failed to update identifier' });
  }
}

/**
 * DELETE /v1/identifiers/:identifierId
 * Soft-delete an identifier
 */
export async function deleteIdentifier(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { identifierId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_number SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_reference_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [identifierId]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Identifier not found' });
      return;
    }

    // Invalidate identifiers cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/identifiers`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting identifier:', error);
    res.status(500).json({ error: 'Failed to delete identifier' });
  }
}

/**
 * POST /v1/identifiers/:identifierId/validate
 * Validate identifier against format rules
 */
export async function validateIdentifier(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Identifier not found' });
      return;
    }

    const identifier = rows[0];
    let valid = false;
    const validationDetails: Record<string, any> = {
      validated_at: new Date().toISOString(),
      identifier_type: identifier.identifier_type,
      identifier_value: identifier.identifier_value,
    };

    // Basic format validation (registry lookups via enrichment services)
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
    `, [identifierId, valid ? 'VALID' : 'INVALID']);

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
}

// ============================================================================
// VERIFICATION HISTORY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/verifications
 * Get verification history for a legal entity
 */
export async function getVerificationHistory(req: Request, res: Response): Promise<void> {
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
    const { BlobStorageService } = await import('../services/blobStorageService');
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
}
