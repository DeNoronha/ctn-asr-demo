/**
 * Peppol Controller
 *
 * Handles Peppol (Pan-European Public Procurement OnLine) registry operations.
 * Peppol enables cross-border e-invoicing and procurement across Europe.
 *
 * @module controllers/peppol
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

/**
 * GET /v1/legal-entities/:legalentityid/peppol-registry
 * Get stored Peppol registry data for a legal entity
 */
export async function getPeppolRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

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
      res.json({
        hasData: false,
        message: 'No Peppol registry data available. Use the fetch endpoint to retrieve data from Peppol Directory.'
      });
      return;
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
}

/**
 * POST /v1/legal-entities/:legalentityid/peppol/fetch
 * Fetch Peppol data from directory, optionally save to database
 */
export async function fetchPeppol(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { identifier_type, identifier_value, company_name, country_code, save_to_database = true } = req.body;

    if (!identifier_type && !company_name) {
      res.status(400).json({
        error: 'Either identifier_type and identifier_value, or company_name and country_code must be provided'
      });
      return;
    }

    const { fetchPeppolForOrganization, fetchPeppolByName } = await import('../services/peppolService');

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
      res.status(400).json({
        error: 'Invalid search parameters. Provide identifier_type+identifier_value or company_name+country_code'
      });
      return;
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
          VALUES ($1, $2, 'PEPPOL', $3, 'VALID', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
        `, [identifierId, legalentityid, peppolResult.participant_id]);
      } else {
        identifierId = existingRows[0].legal_entity_reference_id;
        // Update existing identifier
        await pool.query(`
          UPDATE legal_entity_number
          SET identifier_value = $1, validation_status = 'VALID', dt_modified = NOW()
          WHERE legal_entity_reference_id = $2
        `, [peppolResult.participant_id, identifierId]);
      }

      // Upsert Peppol registry data
      // Note: Using column-based ON CONFLICT for partial unique index compatibility
      await pool.query(`
        INSERT INTO peppol_registry_data (
          legal_entity_id, participant_id, participant_scheme, participant_value,
          entity_name, country_code, registration_date,
          additional_identifiers, document_types, websites, contacts,
          geo_info, additional_info, raw_api_response,
          fetched_at, last_verified_at, data_source, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), 'peppol_directory', 'api')
        ON CONFLICT (legal_entity_id) WHERE is_deleted = false
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
}

/**
 * GET /v1/peppol/search
 * Search Peppol directory without saving (for lookups)
 */
export async function searchPeppol(req: Request, res: Response): Promise<void> {
  try {
    const { scheme, value, name, country } = req.query;

    const { fetchPeppolByIdentifier, fetchPeppolByName, PEPPOL_IDENTIFIER_SCHEMES } = await import('../services/peppolService');

    let peppolResult;

    if (scheme && value) {
      // Search by identifier scheme and value
      const schemeCode = PEPPOL_IDENTIFIER_SCHEMES[scheme as string] || scheme;
      peppolResult = await fetchPeppolByIdentifier(schemeCode as string, value as string);
    } else if (name && country) {
      // Search by name and country
      peppolResult = await fetchPeppolByName(name as string, country as string);
    } else {
      res.status(400).json({
        error: 'Provide either scheme+value or name+country query parameters'
      });
      return;
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
}
