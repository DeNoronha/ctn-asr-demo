/**
 * KVK Verification Controller
 *
 * Handles KvK (Kamer van Koophandel) document verification operations.
 * Part of the identity verification workflow for Dutch companies.
 *
 * @module controllers/kvk-verification
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

// ============================================================================
// KVK VERIFICATION
// ============================================================================

/**
 * GET /v1/legal-entities/:legalEntityId/kvk-verification
 * Get KvK verification status and document for a specific legal entity
 */
export async function getKvkVerificationStatus(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({
        error: 'Legal entity not found',
        legal_entity_id: legalEntityId
      });
      return;
    }

    const data = rows[0];

    // Generate SAS URL for document if it exists
    if (data.kvk_document_url) {
      try {
        const { BlobStorageService } = await import('../services/blobStorageService');
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
}

/**
 * GET /v1/kvk-verification/flagged
 * Get all legal entities with flagged KvK verification status
 */
export async function getFlaggedKvkEntities(req: Request, res: Response): Promise<void> {
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
}

/**
 * POST /v1/kvk-verification/:legalentityid/review
 * Review and approve/reject KvK verification for a legal entity
 */
export async function reviewKvkVerification(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { status, notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'status must be approved or rejected' });
      return;
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    res.json({ message: `KvK verification ${status}` });
  } catch (error: any) {
    console.error('Error reviewing KvK verification:', error);
    res.status(500).json({ error: 'Failed to review KvK verification' });
  }
}

// ============================================================================
// KVK DOCUMENT UPLOAD & VERIFICATION
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/kvk-document
 * Upload KvK document for verification (Member Portal)
 */
export async function uploadKvkDocument(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    // Verify legal entity exists
    const { rows: entityRows } = await pool.query(`
      SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (entityRows.length === 0) {
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    // Upload document to blob storage
    const { BlobStorageService } = await import('../services/blobStorageService');
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
      size: file.size
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
    console.error('Error uploading KvK document:', error);
    res.status(500).json({ error: 'Failed to upload document', detail: error.message });
  }
}

/**
 * POST /v1/legal-entities/:legalentityid/kvk-document/verify
 * Manually trigger verification for existing KvK document
 */
export async function triggerKvkVerification(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    const kvkDocumentUrl = entityRows[0].kvk_document_url;
    const currentStatus = entityRows[0].kvk_verification_status;

    if (!kvkDocumentUrl) {
      res.status(400).json({ error: 'No KvK document found for this entity' });
      return;
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
    console.error('Error triggering KvK verification:', error);
    res.status(500).json({ error: 'Failed to trigger verification', detail: error.message });
  }
}

// ============================================================================
// ADDRESS REFRESH FROM KVK
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/refresh-address-from-kvk
 * Refresh address from existing KVK registry data (bezoekadres)
 */
export async function refreshAddressFromKvk(req: Request, res: Response): Promise<void> {
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
      res.status(404).json({ error: 'No KVK registry data with addresses found' });
      return;
    }

    const addresses = typeof kvkData[0].addresses === 'string'
      ? JSON.parse(kvkData[0].addresses)
      : kvkData[0].addresses;

    // Find bezoekadres (visiting address)
    const bezoekadres = addresses.find(
      (addr: any) => addr.type === 'bezoekadres' || addr.type === 'Bezoekadres'
    ) || addresses[0];

    if (!bezoekadres) {
      res.status(404).json({ error: 'No address found in KVK data' });
      return;
    }

    const { addressLine1, postalCode, city, countryCode } = formatKvkAddress(bezoekadres);

    // Update legal_entity address
    const { rowCount } = await pool.query(`
      UPDATE legal_entity
      SET address_line1 = $2, postal_code = $3, city = $4, country_code = $5, dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid, addressLine1, postalCode, city, countryCode]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    res.json({
      message: 'Address updated from KVK bezoekadres',
      address: { address_line1: addressLine1, postal_code: postalCode, city, country_code: countryCode }
    });
  } catch (error: any) {
    console.error('Error refreshing address from KVK:', error);
    res.status(500).json({ error: 'Failed to refresh address', detail: error.message });
  }
}

/**
 * POST /v1/admin/refresh-all-addresses-from-kvk
 * Bulk refresh addresses from KVK data for all entities with empty addresses
 */
export async function bulkRefreshAddressesFromKvk(req: Request, res: Response): Promise<void> {
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

        const { addressLine1, postalCode, city, countryCode } = formatKvkAddress(bezoekadres);

        await pool.query(`
          UPDATE legal_entity
          SET address_line1 = $2, postal_code = $3, city = $4, country_code = $5, dt_modified = NOW()
          WHERE legal_entity_id = $1
        `, [entity.legal_entity_id, addressLine1, postalCode, city, countryCode]);

        results.updated.push(entity.primary_legal_name);
      } catch {
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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format KVK address based on country (NL, DE, BE formats)
 */
function formatKvkAddress(addr: any): { addressLine1: string; postalCode: string; city: string; countryCode: string } {
  const country = addr.country || 'Nederland';
  const countryCode = country === 'Nederland' ? 'NL' :
                     country === 'Deutschland' || country === 'Germany' ? 'DE' :
                     country === 'België' || country === 'Belgium' || country === 'Belgique' ? 'BE' :
                     country.substring(0, 2).toUpperCase();

  const houseNum = addr.houseNumber || '';
  const houseLetter = addr.houseLetter || '';
  const houseAddition = addr.houseNumberAddition || '';
  const street = addr.street || '';

  let addressLine1: string;
  if (countryCode === 'DE') {
    addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
  } else if (countryCode === 'BE') {
    addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? ' bus ' + houseAddition : ''}`.trim();
  } else {
    addressLine1 = `${street} ${houseNum}${houseLetter}${houseAddition ? '-' + houseAddition : ''}`.trim();
  }

  return {
    addressLine1,
    postalCode: addr.postalCode || '',
    city: addr.city || '',
    countryCode
  };
}

/**
 * Async function to process KvK document verification
 * Extracts data from document, validates against KvK API, and enriches with LEI/Peppol
 */
async function processKvKVerification(legalEntityId: string, blobUrl: string, verificationId: string): Promise<void> {
  const pool = getPool();

  try {
    console.log('Starting KvK document verification:', { legalEntityId, verificationId });

    // Download document buffer for Document Intelligence
    const { BlobStorageService } = await import('../services/blobStorageService');
    const blobService = new BlobStorageService();
    const documentBuffer = await blobService.downloadDocumentBuffer(blobUrl);

    // Extract data from document using Document Intelligence
    const { DocumentIntelligenceService } = await import('../services/documentIntelligenceService');
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

    if (enteredKvkNumber && extractedData.kvkNumber) {
      const normalizedEntered = enteredKvkNumber.replace(/[\s-]/g, '');
      const normalizedExtracted = extractedData.kvkNumber.replace(/[\s-]/g, '');
      if (normalizedEntered !== normalizedExtracted) {
        comparisonFlags.push('entered_kvk_mismatch');
      }
    }

    if (enteredCompanyName && extractedData.companyName) {
      const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,\-]/g, '');
      const normalizedEntered = normalize(enteredCompanyName);
      const normalizedExtracted = normalize(extractedData.companyName);
      const namesMatch = normalizedEntered === normalizedExtracted ||
                        normalizedEntered.includes(normalizedExtracted) ||
                        normalizedExtracted.includes(normalizedEntered);
      if (!namesMatch) {
        comparisonFlags.push('entered_name_mismatch');
      }
    }

    // Validate against KvK API if we have a number
    if (extractedData.kvkNumber) {
      const { KvKService } = await import('../services/kvkService');
      const kvkService = new KvKService();
      const validation = await kvkService.validateCompany(
        extractedData.kvkNumber,
        extractedData.companyName || ''
      );

      const allFlags = [...comparisonFlags, ...validation.flags];

      let newStatus: string;
      if (comparisonFlags.length > 0) {
        newStatus = 'flagged';
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

      // Store KvK registry data and enrich with identifiers
      if (validation.companyData) {
        await storeKvkRegistryDataAndEnrich(pool, legalEntityId, validation.companyData);
      }

      console.log('KvK verification completed:', { legalEntityId, verificationId, status: newStatus, flags: allFlags });
    }
  } catch (error: any) {
    console.error('KvK verification processing error:', { legalEntityId, verificationId, error: error.message });

    await pool.query(`
      UPDATE legal_entity
      SET kvk_verification_status = 'failed',
          kvk_mismatch_flags = ARRAY['processing_error'],
          dt_modified = NOW()
      WHERE legal_entity_id = $1
    `, [legalEntityId]);
  }
}

/**
 * Store KvK registry data and enrich with additional identifiers (EUID, LEI, Peppol)
 */
async function storeKvkRegistryDataAndEnrich(pool: any, legalEntityId: string, kvkData: any): Promise<void> {
  // Determine company status from Open Data API or fallback to materialEndDate
  let companyStatus: string;
  if (kvkData.companyStatus?.statusSource === 'open_data_api') {
    // Use authoritative status from Open Data API
    if (kvkData.companyStatus.insolventieCode) {
      companyStatus = `${kvkData.companyStatus.insolventieDescription} (${kvkData.companyStatus.insolventieCode})`;
    } else {
      companyStatus = kvkData.companyStatus.isActive ? 'Actief' : 'Inactief';
    }
  } else {
    // Fallback: derive from materialEndDate (less reliable)
    companyStatus = kvkData.materialEndDate ? 'Inactief (uitgeschreven)' : 'Actief (verondersteld)';
  }

  // Store KvK registry data
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
    companyStatus,
    JSON.stringify(kvkData.addresses),
    JSON.stringify(kvkData.sbiActivities),
    kvkData.totalEmployees,
    JSON.stringify(kvkData)
  ]);

  // Update address from bezoekadres if empty
  const bezoekadres = kvkData.addresses?.find(
    (addr: any) => addr.type === 'bezoekadres' || addr.type === 'Bezoekadres'
  ) || kvkData.addresses?.[0];

  if (bezoekadres) {
    const { addressLine1, postalCode, city, countryCode } = formatKvkAddress(bezoekadres);
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
  }

  // Create EUID from KvK number
  const euid = `NL.KVK.${kvkData.kvkNumber}`;
  const { rows: euidRows } = await pool.query(`
    SELECT legal_entity_reference_id FROM legal_entity_number
    WHERE legal_entity_id = $1 AND identifier_type = 'EUID' AND is_deleted = false
  `, [legalEntityId]);

  if (euidRows.length === 0) {
    await pool.query(`
      INSERT INTO legal_entity_number (
        legal_entity_reference_id, legal_entity_id,
        identifier_type, identifier_value, country_code,
        validation_status, dt_created, dt_modified
      )
      VALUES ($1, $2, 'EUID', $3, 'NL', 'VALID', NOW(), NOW())
    `, [randomUUID(), legalEntityId, euid]);
  }

  // Fetch LEI from GLEIF (non-blocking enrichment)
  try {
    const { fetchLeiForOrganization } = await import('../services/leiService');
    const mockContext = {
      log: (...args: any[]) => console.log('[LEI Service]', ...args),
      warn: (...args: any[]) => console.warn('[LEI Service]', ...args),
      error: (...args: any[]) => console.error('[LEI Service]', ...args),
    } as any;

    const leiResult = await fetchLeiForOrganization(kvkData.kvkNumber, 'NL', 'KVK', mockContext);

    if (leiResult.status === 'found' && leiResult.lei) {
      const { rows: leiRows } = await pool.query(`
        SELECT legal_entity_reference_id FROM legal_entity_number
        WHERE legal_entity_id = $1 AND identifier_type = 'LEI' AND is_deleted = false
      `, [legalEntityId]);

      if (leiRows.length === 0) {
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id,
            identifier_type, identifier_value,
            validation_status, dt_created, dt_modified
          )
          VALUES ($1, $2, 'LEI', $3, 'VALID', NOW(), NOW())
        `, [randomUUID(), legalEntityId, leiResult.lei]);
      }
    }
  } catch (leiError: any) {
    console.warn('Failed to fetch LEI (non-fatal):', leiError.message);
  }

  // Fetch Peppol participant (non-blocking enrichment)
  try {
    const { fetchPeppolByKvk } = await import('../services/peppolService');
    const peppolResult = await fetchPeppolByKvk(kvkData.kvkNumber);

    if (peppolResult.status === 'found' && peppolResult.participant_id) {
      const { rows: peppolRows } = await pool.query(`
        SELECT legal_entity_reference_id FROM legal_entity_number
        WHERE legal_entity_id = $1 AND identifier_type = 'PEPPOL' AND is_deleted = false
      `, [legalEntityId]);

      if (peppolRows.length === 0) {
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id,
            identifier_type, identifier_value,
            validation_status, registry_name, registry_url,
            dt_created, dt_modified
          )
          VALUES ($1, $2, 'PEPPOL', $3, 'VALID', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
        `, [randomUUID(), legalEntityId, peppolResult.participant_id]);
      }

      // Store Peppol registry data
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
          entity_name = EXCLUDED.entity_name,
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
    }
  } catch (peppolError: any) {
    console.warn('Failed to fetch Peppol (non-fatal):', peppolError.message);
  }
}
