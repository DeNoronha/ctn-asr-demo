/**
 * VIES Enrichment Service
 *
 * Handles VAT verification against the EU VIES system.
 * Works for all EU member states.
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';
import { ViesService, ViesCompanyData } from '../viesService';

/**
 * Verify a VAT number against VIES and store the result
 *
 * @param pool - Database pool
 * @param legalEntityId - Legal entity UUID
 * @param vatNumber - Full VAT number including country code (e.g., BE0439291125, NL001671248B03)
 * @returns EnrichmentResult with verification status
 */
export async function verifyVatAgainstVies(
  pool: Pool,
  legalEntityId: string,
  vatNumber: string
): Promise<EnrichmentResult> {
  // Parse country code and number from full VAT
  const countryCode = vatNumber.substring(0, 2).toUpperCase();
  const vatWithoutCountry = vatNumber.substring(2);

  const viesService = new ViesService();

  // Check if country is supported by VIES
  if (!viesService.isEuCountry(countryCode)) {
    return {
      identifier: 'VIES',
      status: 'not_available',
      message: `Country ${countryCode} is not supported by VIES`,
    };
  }

  console.log(`[VIES Enrichment] Verifying VAT ${vatNumber} for country ${countryCode}`);

  try {
    const viesResult = await viesService.fetchAndValidate(countryCode, vatWithoutCountry);

    if (viesResult.companyData) {
      // Store VIES registry data
      await storeViesRegistryData(pool, legalEntityId, countryCode, vatWithoutCountry, viesResult.companyData);

      // Update the VAT identifier validation status
      const newStatus = viesResult.isValid ? 'VERIFIED' : 'FAILED';
      await pool.query(`
        UPDATE legal_entity_number
        SET validation_status = $1,
            verification_notes = $2,
            dt_modified = NOW()
        WHERE legal_entity_id = $3
          AND identifier_type = 'VAT'
          AND is_deleted = false
      `, [
        newStatus,
        viesResult.isValid
          ? `VIES verified: ${viesResult.companyData.traderName}`
          : `VIES invalid: ${viesResult.message}`,
        legalEntityId
      ]);

      if (viesResult.isValid) {
        return {
          identifier: 'VIES',
          status: 'added',
          value: vatNumber,
          message: `VIES verified: ${viesResult.companyData.traderName}`,
        };
      } else {
        return {
          identifier: 'VIES',
          status: 'error',
          message: `VAT invalid in VIES: ${viesResult.message}`,
        };
      }
    } else {
      return {
        identifier: 'VIES',
        status: 'error',
        message: viesResult.message || 'VIES lookup failed',
      };
    }
  } catch (error: any) {
    console.error('[VIES Enrichment] Error:', error.message);
    return {
      identifier: 'VIES',
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Verify all unverified VAT numbers in the database against VIES
 *
 * @param pool - Database pool
 * @returns Array of results for each VAT number
 */
export async function verifyAllUnverifiedVatNumbers(pool: Pool): Promise<{
  total: number;
  verified: number;
  failed: number;
  results: Array<{
    legalEntityId: string;
    companyName: string;
    vatNumber: string;
    result: EnrichmentResult;
  }>;
}> {
  console.log('[VIES Enrichment] Starting batch verification of unverified VAT numbers...');

  // Find all VAT identifiers without VIES verification
  const { rows: unverifiedVat } = await pool.query<{
    legal_entity_id: string;
    identifier_value: string;
    primary_legal_name: string;
  }>(`
    SELECT
      len.legal_entity_id,
      len.identifier_value,
      le.primary_legal_name
    FROM legal_entity_number len
    JOIN legal_entity le ON le.legal_entity_id = len.legal_entity_id
    LEFT JOIN vies_registry_data vrd ON vrd.legal_entity_id = len.legal_entity_id AND vrd.is_deleted = false
    WHERE len.identifier_type = 'VAT'
      AND len.is_deleted = false
      AND le.is_deleted = false
      AND vrd.registry_data_id IS NULL
    ORDER BY len.dt_created DESC
  `);

  const results: Array<{
    legalEntityId: string;
    companyName: string;
    vatNumber: string;
    result: EnrichmentResult;
  }> = [];

  let verified = 0;
  let failed = 0;

  for (const row of unverifiedVat) {
    console.log(`[VIES Enrichment] Verifying ${row.identifier_value} for ${row.primary_legal_name}`);

    const result = await verifyVatAgainstVies(pool, row.legal_entity_id, row.identifier_value);

    results.push({
      legalEntityId: row.legal_entity_id,
      companyName: row.primary_legal_name,
      vatNumber: row.identifier_value,
      result,
    });

    if (result.status === 'added') {
      verified++;
    } else {
      failed++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[VIES Enrichment] Batch complete: ${verified} verified, ${failed} failed out of ${unverifiedVat.length}`);

  return {
    total: unverifiedVat.length,
    verified,
    failed,
    results,
  };
}

/**
 * Store VIES registry data for a legal entity
 */
async function storeViesRegistryData(
  pool: Pool,
  legalEntityId: string,
  countryCode: string,
  vatWithoutCountry: string,
  companyData: ViesCompanyData
): Promise<void> {
  const fullVatNumber = `${countryCode}${vatWithoutCountry}`;

  await pool.query(`
    INSERT INTO vies_registry_data (
      registry_data_id, legal_entity_id, country_code, vat_number, full_vat_number,
      is_valid, user_error, request_date, request_identifier,
      trader_name, trader_address,
      approx_name, approx_street, approx_postal_code, approx_city, approx_company_type,
      match_name, match_street, match_postal_code, match_city, match_company_type,
      raw_api_response,
      fetched_at, last_verified_at, data_source, created_by, dt_created, dt_modified, is_deleted
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), 'vies_api', 'enrichment', NOW(), NOW(), false)
    ON CONFLICT (legal_entity_id) WHERE is_deleted = false
    DO UPDATE SET
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
      dt_modified = NOW()
  `, [
    randomUUID(),
    legalEntityId,
    countryCode,
    vatWithoutCountry,
    fullVatNumber,
    companyData.isValid,
    companyData.userError,
    companyData.requestDate,
    companyData.requestIdentifier,
    companyData.traderName,
    companyData.traderAddress,
    companyData.approximate?.name || null,
    companyData.approximate?.street || null,
    companyData.approximate?.postalCode || null,
    companyData.approximate?.city || null,
    companyData.approximate?.companyType || null,
    companyData.approximate?.matchName || null,
    companyData.approximate?.matchStreet || null,
    companyData.approximate?.matchPostalCode || null,
    companyData.approximate?.matchCity || null,
    companyData.approximate?.matchCompanyType || null,
    JSON.stringify(companyData.rawApiResponse),
  ]);

  console.log(`[VIES Enrichment] Stored VIES data for ${fullVatNumber}: valid=${companyData.isValid}, name=${companyData.traderName}`);
}
