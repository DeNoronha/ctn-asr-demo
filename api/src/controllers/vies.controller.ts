/**
 * VIES Controller
 *
 * Handles VIES (VAT Information Exchange System) operations.
 * VIES is the EU system for validating VAT numbers across member states.
 *
 * @module controllers/vies
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';

/**
 * GET /v1/legal-entities/:legalentityid/vies-registry
 * Get stored VIES registry data for a legal entity
 */
export async function getViesRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

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
      res.json({
        hasData: false,
        message: 'No VIES registry data available. Use the fetch endpoint to validate a VAT number.'
      });
      return;
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
}

/**
 * POST /v1/legal-entities/:legalentityid/vies/fetch
 * Fetch and validate VAT from VIES, optionally save to database
 */
export async function fetchVies(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { country_code, vat_number, save_to_database = true } = req.body;

    if (!country_code || !vat_number) {
      res.status(400).json({
        error: 'Bad request',
        message: 'country_code and vat_number are required'
      });
      return;
    }

    // Import VIES service
    const { ViesService } = await import('../services/viesService');
    const viesService = new ViesService();

    // Check if country is EU member
    if (!viesService.isEuCountry(country_code)) {
      res.status(400).json({
        error: 'Bad request',
        message: `Country code ${country_code} is not an EU member state. VIES only supports EU VAT numbers.`
      });
      return;
    }

    // Fetch and validate from VIES
    const viesResult = await viesService.fetchAndValidate(country_code, vat_number);

    if (!viesResult.companyData) {
      res.json({
        status: 'error',
        is_valid: false,
        flags: viesResult.flags,
        message: viesResult.message
      });
      return;
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
        `, [identifierId, legalentityid, viesData.fullVatNumber, viesData.isValid ? 'VALID' : 'INVALID', viesData.countryCode]);
      } else {
        // Update existing identifier
        await pool.query(`
          UPDATE legal_entity_number SET
            identifier_value = $1,
            validation_status = $2,
            dt_modified = NOW()
          WHERE legal_entity_reference_id = $3
        `, [viesData.fullVatNumber, viesData.isValid ? 'VALID' : 'INVALID', identifierId]);
      }

      // Upsert VIES registry data
      // Note: Using column-based ON CONFLICT for partial unique index compatibility
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
        ON CONFLICT (legal_entity_id) WHERE is_deleted = false
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

      res.json({
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
      res.json({
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
}

/**
 * GET /v1/vies/validate
 * Validate VAT number without saving (for lookups)
 */
export async function validateVies(req: Request, res: Response): Promise<void> {
  try {
    const { country_code, vat_number } = req.query;

    if (!country_code || !vat_number) {
      res.status(400).json({
        error: 'Bad request',
        message: 'country_code and vat_number query parameters are required'
      });
      return;
    }

    // Import VIES service
    const { ViesService } = await import('../services/viesService');
    const viesService = new ViesService();

    // Check if country is EU member
    if (!viesService.isEuCountry(country_code as string)) {
      res.status(400).json({
        error: 'Bad request',
        message: `Country code ${country_code} is not an EU member state. VIES only supports EU VAT numbers.`
      });
      return;
    }

    // Validate through VIES
    const viesResult = await viesService.fetchAndValidate(country_code as string, vat_number as string);

    if (!viesResult.companyData) {
      res.json({
        status: 'error',
        is_valid: false,
        country_code,
        vat_number,
        flags: viesResult.flags,
        message: viesResult.message
      });
      return;
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
}
