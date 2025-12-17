/**
 * EORI Controller
 *
 * Handles EORI (Economic Operators Registration and Identification) operations.
 * EORI numbers are EU customs identification numbers required for import/export.
 *
 * @module controllers/eori
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { EoriService } from '../services/eoriService';

/**
 * GET /v1/legal-entities/:legalentityid/eori-registry
 * Get stored EORI registry data for a legal entity
 */
export async function getEoriRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        eori_number,
        country_code,
        status,
        status_description,
        error_reason,
        trader_name,
        trader_address,
        street,
        postal_code,
        city,
        country,
        request_date,
        request_identifier,
        data_source,
        raw_api_response,
        fetched_at,
        last_verified_at,
        dt_created,
        dt_modified
      FROM eori_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      res.json({
        hasData: false,
        message: 'No EORI registry data available. Use the fetch endpoint to validate an EORI number.'
      });
      return;
    }

    res.json({
      hasData: true,
      data: rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching EORI registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch EORI registry data', detail: error.message });
  }
}

/**
 * POST /v1/legal-entities/:legalentityid/eori/fetch
 * Fetch and validate EORI from EU service, optionally save to database
 */
export async function fetchEori(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { eori_number, save_to_database = true } = req.body;

    if (!eori_number) {
      res.status(400).json({
        error: 'Bad request',
        message: 'eori_number is required'
      });
      return;
    }

    const eoriService = new EoriService();

    // Basic format validation
    if (!eoriService.isValidFormat(eori_number)) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid EORI format. EORI must be 2-letter country code followed by 1-15 alphanumeric characters.'
      });
      return;
    }

    const countryCode = eoriService.extractCountryCode(eori_number);

    // Check if country is valid for EORI
    if (!eoriService.isValidEoriCountry(countryCode)) {
      res.status(400).json({
        error: 'Bad request',
        message: `Country code ${countryCode} is not valid for EORI validation.`
      });
      return;
    }

    // Fetch and validate from EU EORI service
    const eoriResult = await eoriService.fetchAndValidate(eori_number);

    if (!eoriResult.companyData) {
      res.json({
        status: 'error',
        is_valid: false,
        flags: eoriResult.flags,
        message: eoriResult.message
      });
      return;
    }

    const eoriData = eoriResult.companyData;

    if (save_to_database) {
      // Check if EORI identifier already exists
      const { rows: existingRows } = await pool.query(`
        SELECT legal_entity_reference_id FROM legal_entity_number
        WHERE legal_entity_id = $1 AND identifier_type = 'EORI' AND is_deleted = false
      `, [legalentityid]);

      const identifierId = existingRows.length > 0
        ? existingRows[0].legal_entity_reference_id
        : randomUUID();

      if (existingRows.length === 0) {
        // Create EORI identifier
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value,
            validation_status, registry_name, registry_url, dt_created, dt_modified, country_code
          )
          VALUES ($1, $2, 'EORI', $3, $4, 'EU EORI System', 'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp', NOW(), NOW(), $5)
        `, [identifierId, legalentityid, eoriData.eoriNumber, eoriData.isValid ? 'VALID' : 'INVALID', eoriData.countryCode]);
      } else {
        // Update existing identifier
        await pool.query(`
          UPDATE legal_entity_number SET
            identifier_value = $1,
            validation_status = $2,
            dt_modified = NOW()
          WHERE legal_entity_reference_id = $3
        `, [eoriData.eoriNumber, eoriData.isValid ? 'VALID' : 'INVALID', identifierId]);
      }

      // Upsert EORI registry data
      await pool.query(`
        INSERT INTO eori_registry_data (
          registry_data_id, legal_entity_id, eori_number, country_code,
          status, status_description, error_reason,
          trader_name, trader_address,
          street, postal_code, city, country,
          request_date, data_source, raw_api_response,
          fetched_at, last_verified_at, created_by, is_deleted
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ec_eori_soap', $15, NOW(), NOW(), 'api', false
        )
        ON CONFLICT (legal_entity_id) WHERE is_deleted = false
        DO UPDATE SET
          eori_number = EXCLUDED.eori_number,
          country_code = EXCLUDED.country_code,
          status = EXCLUDED.status,
          status_description = EXCLUDED.status_description,
          error_reason = EXCLUDED.error_reason,
          trader_name = EXCLUDED.trader_name,
          trader_address = EXCLUDED.trader_address,
          street = EXCLUDED.street,
          postal_code = EXCLUDED.postal_code,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          request_date = EXCLUDED.request_date,
          raw_api_response = EXCLUDED.raw_api_response,
          fetched_at = NOW(),
          last_verified_at = NOW(),
          modified_by = 'api',
          dt_modified = NOW()
      `, [
        randomUUID(),
        legalentityid,
        eoriData.eoriNumber,
        eoriData.countryCode,
        eoriData.status,
        eoriData.statusDescription,
        eoriData.errorReason || null,
        eoriData.traderName || null,
        eoriData.traderAddress || null,
        eoriData.parsedAddress?.street || null,
        eoriData.parsedAddress?.postalCode || null,
        eoriData.parsedAddress?.city || null,
        eoriData.parsedAddress?.country || null,
        eoriData.requestDate,
        JSON.stringify(eoriData.rawResponse)
      ]);

      res.json({
        status: 'validated',
        is_valid: eoriData.isValid,
        was_saved: true,
        eori_number: eoriData.eoriNumber,
        trader_name: eoriData.traderName,
        trader_address: eoriData.traderAddress,
        request_date: eoriData.requestDate,
        flags: eoriResult.flags,
        message: eoriResult.message
      });
    } else {
      // Just return the validation result without saving
      res.json({
        status: 'validated',
        is_valid: eoriData.isValid,
        was_saved: false,
        eori_number: eoriData.eoriNumber,
        trader_name: eoriData.traderName,
        trader_address: eoriData.traderAddress,
        request_date: eoriData.requestDate,
        flags: eoriResult.flags,
        message: eoriResult.message
      });
    }
  } catch (error: any) {
    console.error('Error fetching EORI data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch EORI data', detail: error.message });
  }
}

/**
 * GET /v1/eori/validate
 * Validate EORI number without saving (for lookups)
 */
export async function validateEori(req: Request, res: Response): Promise<void> {
  try {
    const { eori_number } = req.query;

    if (!eori_number || typeof eori_number !== 'string') {
      res.status(400).json({
        error: 'Bad request',
        message: 'eori_number query parameter is required'
      });
      return;
    }

    const eoriService = new EoriService();

    // Basic format validation
    if (!eoriService.isValidFormat(eori_number)) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid EORI format. EORI must be 2-letter country code followed by 1-15 alphanumeric characters.'
      });
      return;
    }

    const countryCode = eoriService.extractCountryCode(eori_number);

    // Check if country is valid for EORI
    if (!eoriService.isValidEoriCountry(countryCode)) {
      res.status(400).json({
        error: 'Bad request',
        message: `Country code ${countryCode} is not valid for EORI validation.`
      });
      return;
    }

    // Validate through EORI service
    const eoriResult = await eoriService.fetchAndValidate(eori_number);

    if (!eoriResult.companyData) {
      res.json({
        status: 'error',
        is_valid: false,
        eori_number,
        flags: eoriResult.flags,
        message: eoriResult.message
      });
      return;
    }

    res.json({
      status: 'validated',
      is_valid: eoriResult.companyData.isValid,
      eori_number: eoriResult.companyData.eoriNumber,
      trader_name: eoriResult.companyData.traderName,
      trader_address: eoriResult.companyData.traderAddress,
      request_date: eoriResult.companyData.requestDate,
      flags: eoriResult.flags,
      message: eoriResult.message
    });
  } catch (error: any) {
    console.error('Error validating EORI number:', {
      query: req.query,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to validate EORI number', detail: error.message });
  }
}
