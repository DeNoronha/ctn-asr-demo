/**
 * Dutch (NL) Company Enrichment Service
 *
 * Handles enrichment specific to Dutch companies:
 * 1. KVK → RSIN extraction
 * 2. RSIN → VAT derivation (NL + RSIN + B01)
 * 3. VAT → VIES validation
 * 4. KVK registry data storage
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';

/**
 * Enrich Dutch company with RSIN from KVK data
 *
 * Flow:
 * 1. Check if RSIN already exists
 * 2. Check kvk_registry_data for stored RSIN
 * 3. If not found, fetch fresh from KVK API
 * 4. Store RSIN identifier
 */
export async function enrichRsin(ctx: EnrichmentContext): Promise<{
  rsin: string | null;
  result: EnrichmentResult | null;
}> {
  const { pool, legalEntityId, existingTypes, existingIdentifiers } = ctx;
  const kvkNumber = getExistingValue(existingIdentifiers, 'KVK');

  // RSIN is only applicable for Dutch companies
  if (ctx.countryCode !== 'NL') {
    return { rsin: null, result: null };
  }

  // Check if RSIN already exists
  if (existingTypes.has('RSIN')) {
    const existingRsin = getExistingValue(existingIdentifiers, 'RSIN') || null;
    return {
      rsin: existingRsin,
      result: { identifier: 'RSIN', status: 'exists', value: existingRsin || undefined }
    };
  }

  let rsin: string | null = null;

  // Check kvk_registry_data table
  const { rows: kvkRegistry } = await pool.query(`
    SELECT rsin, raw_api_response
    FROM kvk_registry_data
    WHERE legal_entity_id = $1 AND is_deleted = false
    ORDER BY fetched_at DESC
    LIMIT 1
  `, [legalEntityId]);

  if (kvkRegistry.length > 0 && kvkRegistry[0].rsin) {
    rsin = kvkRegistry[0].rsin;
    console.log('[NL Enrichment] Found RSIN in kvk_registry_data:', rsin);
  } else if (kvkRegistry.length > 0 && kvkRegistry[0].raw_api_response) {
    // Extract from raw API response
    const rawResponse = kvkRegistry[0].raw_api_response;
    rsin = rawResponse?._embedded?.eigenaar?.rsin || rawResponse?._embedded?.hoofdvestiging?.rsin || null;
    console.log('[NL Enrichment] Extracted RSIN from raw_api_response:', rsin);

    // Update the kvk_registry_data with the extracted RSIN
    if (rsin) {
      await pool.query(`
        UPDATE kvk_registry_data
        SET rsin = $1, dt_modified = NOW()
        WHERE legal_entity_id = $2 AND is_deleted = false
      `, [rsin, legalEntityId]);
    }
  }

  // If still no RSIN and we have KVK number, fetch fresh from KVK API
  if (!rsin && kvkNumber) {
    try {
      console.log('[NL Enrichment] Fetching fresh KVK data to get RSIN for:', kvkNumber);
      const { KvKService } = await import('../kvkService');
      const kvkService = new KvKService();
      const kvkData = await kvkService.fetchCompanyProfile(kvkNumber, false);

      if (kvkData?.rsin) {
        rsin = kvkData.rsin;
        console.log('[NL Enrichment] Fetched RSIN from KVK API:', rsin);
      }

      // Store the full KVK registry data
      if (kvkData) {
        await storeKvkRegistryData(pool, legalEntityId, kvkNumber, kvkData, rsin);
      }
    } catch (kvkError: any) {
      console.warn('[NL Enrichment] Failed to fetch KVK data for RSIN:', kvkError.message);
    }
  }

  // Create RSIN identifier if found
  if (rsin) {
    await pool.query(`
      INSERT INTO legal_entity_number (
        legal_entity_reference_id, legal_entity_id,
        identifier_type, identifier_value, country_code,
        validation_status, registry_name, registry_url,
        dt_created, dt_modified
      )
      VALUES ($1, $2, 'RSIN', $3, 'NL', 'VERIFIED', 'KVK', 'https://www.kvk.nl/', NOW(), NOW())
    `, [randomUUID(), legalEntityId, rsin]);

    return {
      rsin,
      result: { identifier: 'RSIN', status: 'added', value: rsin }
    };
  } else if (kvkNumber) {
    return {
      rsin: null,
      result: { identifier: 'RSIN', status: 'not_available', message: 'RSIN not found in KVK data' }
    };
  }

  return { rsin: null, result: null };
}

/**
 * Derive and validate VAT from RSIN
 *
 * Flow:
 * 1. Check if VAT already exists
 * 2. Derive VAT: NL + RSIN + B01
 * 3. Validate via VIES API
 * 4. If B01 fails, try B02 (fiscal units)
 * 5. Store VAT identifier and VIES registry data
 */
export async function enrichVat(
  ctx: EnrichmentContext,
  rsin: string | null
): Promise<EnrichmentResult> {
  const { pool, legalEntityId, existingTypes, existingIdentifiers, countryCode } = ctx;

  // Check if VAT already exists
  if (existingTypes.has('VAT')) {
    return {
      identifier: 'VAT',
      status: 'exists',
      value: getExistingValue(existingIdentifiers, 'VAT')
    };
  }

  // For Dutch companies: derive from RSIN
  if (rsin && countryCode === 'NL') {
    const derivedVat = `NL${rsin}B01`;

    try {
      const { ViesService } = await import('../viesService');
      const viesService = new ViesService();
      const viesResult = await viesService.fetchAndValidate('NL', `${rsin}B01`);

      if (viesResult.isValid && viesResult.companyData) {
        // Store VAT identifier
        await pool.query(`
          INSERT INTO legal_entity_number (
            legal_entity_reference_id, legal_entity_id,
            identifier_type, identifier_value, country_code,
            validation_status, registry_name, registry_url,
            dt_created, dt_modified
          )
          VALUES ($1, $2, 'VAT', $3, 'NL', 'VERIFIED', 'VIES', 'https://ec.europa.eu/taxation_customs/vies/', NOW(), NOW())
        `, [randomUUID(), legalEntityId, derivedVat]);

        // Store VIES registry data
        await storeViesRegistryData(pool, legalEntityId, rsin, viesResult.companyData);

        return {
          identifier: 'VAT',
          status: 'added',
          value: derivedVat,
          message: 'Validated via VIES'
        };
      } else {
        // Try B02 suffix for fiscal units
        const viesResultB02 = await viesService.fetchAndValidate('NL', `${rsin}B02`);
        if (viesResultB02.isValid && viesResultB02.companyData) {
          const vatB02 = `NL${rsin}B02`;
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'VAT', $3, 'NL', 'VERIFIED', 'VIES', 'https://ec.europa.eu/taxation_customs/vies/', NOW(), NOW())
          `, [randomUUID(), legalEntityId, vatB02]);

          return {
            identifier: 'VAT',
            status: 'added',
            value: vatB02,
            message: 'Validated via VIES (B02 fiscal unit)'
          };
        } else {
          return {
            identifier: 'VAT',
            status: 'not_available',
            message: `VAT ${derivedVat} not valid in VIES`
          };
        }
      }
    } catch (viesError: any) {
      console.warn('[NL Enrichment] VIES validation failed:', viesError.message);
      return { identifier: 'VAT', status: 'error', message: viesError.message };
    }
  }

  // Dutch company without RSIN
  if (countryCode === 'NL') {
    return {
      identifier: 'VAT',
      status: 'not_available',
      message: 'Cannot derive VAT without RSIN (Dutch companies)'
    };
  }

  // Non-Dutch EU companies: VAT cannot be auto-derived
  return {
    identifier: 'VAT',
    status: 'not_available',
    message: `VAT for ${countryCode} companies must be provided manually (cannot be auto-derived)`
  };
}

/**
 * Ensure KVK registry data exists in database
 */
export async function ensureKvkRegistryData(ctx: EnrichmentContext): Promise<void> {
  const { pool, legalEntityId, existingIdentifiers } = ctx;
  const kvkNumber = getExistingValue(existingIdentifiers, 'KVK');

  if (!kvkNumber) return;

  // Check if kvk_registry_data exists
  const { rows: kvkExists } = await pool.query(`
    SELECT registry_data_id FROM kvk_registry_data
    WHERE legal_entity_id = $1 AND is_deleted = false
    LIMIT 1
  `, [legalEntityId]);

  if (kvkExists.length === 0) {
    try {
      console.log('[NL Enrichment] Fetching KVK registry data:', kvkNumber);
      const { KvKService } = await import('../kvkService');
      const kvkService = new KvKService();
      const kvkData = await kvkService.fetchCompanyProfile(kvkNumber, false);

      if (kvkData) {
        const existingRsin = getExistingValue(existingIdentifiers, 'RSIN');
        await storeKvkRegistryData(pool, legalEntityId, kvkNumber, kvkData, kvkData.rsin || existingRsin || null);
      }
    } catch (kvkFetchError: any) {
      console.warn('[NL Enrichment] Failed to fetch KVK registry data:', kvkFetchError.message);
    }
  }
}

/**
 * Update legal_entity with KVK registry data
 */
export async function updateLegalEntityFromKvk(ctx: EnrichmentContext): Promise<{
  updated: boolean;
  fields: string[];
}> {
  const { pool, legalEntityId } = ctx;
  const updatedFields: string[] = [];

  try {
    const { rows: kvkData } = await pool.query(`
      SELECT company_name, statutory_name, legal_form, addresses,
             formal_registration_date, company_status
      FROM kvk_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalEntityId]);

    if (kvkData.length === 0) {
      return { updated: false, fields: [] };
    }

    const kvk = kvkData[0];
    const addresses = kvk.addresses || [];
    const bezoekadres = addresses.find((a: any) => a.type === 'bezoekadres') || addresses[0];

    const updateFieldsSql: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (kvk.company_name) {
      updateFieldsSql.push(`primary_legal_name = $${paramIndex++}`);
      updateValues.push(kvk.company_name);
      updatedFields.push('primary_legal_name');
    }

    if (kvk.legal_form) {
      updateFieldsSql.push(`entity_legal_form = $${paramIndex++}`);
      updateValues.push(kvk.legal_form);
      updatedFields.push('entity_legal_form');
    }

    if (bezoekadres) {
      let addressLine1 = '';
      if (bezoekadres.street) {
        addressLine1 = bezoekadres.street;
        if (bezoekadres.houseNumber) addressLine1 += ` ${bezoekadres.houseNumber}`;
        if (bezoekadres.houseLetter) addressLine1 += bezoekadres.houseLetter;
        if (bezoekadres.houseNumberAddition) addressLine1 += `-${bezoekadres.houseNumberAddition}`;
      } else if (bezoekadres.fullAddress) {
        addressLine1 = bezoekadres.fullAddress.split('\n')[0];
      }

      if (addressLine1) {
        updateFieldsSql.push(`address_line1 = $${paramIndex++}`);
        updateValues.push(addressLine1);
        updatedFields.push('address_line1');
      }

      if (bezoekadres.postalCode) {
        updateFieldsSql.push(`postal_code = $${paramIndex++}`);
        updateValues.push(bezoekadres.postalCode);
        updatedFields.push('postal_code');
      }

      if (bezoekadres.city) {
        updateFieldsSql.push(`city = $${paramIndex++}`);
        updateValues.push(bezoekadres.city);
        updatedFields.push('city');
      }

      if (bezoekadres.country) {
        updateFieldsSql.push(`country_code = $${paramIndex++}`);
        updateValues.push(bezoekadres.country === 'Nederland' ? 'NL' : bezoekadres.country);
        updatedFields.push('country_code');
      }
    }

    if (kvk.formal_registration_date) {
      updateFieldsSql.push(`registered_at = $${paramIndex++}`);
      updateValues.push(kvk.formal_registration_date);
      updatedFields.push('registered_at');
    }

    if (updateFieldsSql.length > 0) {
      updateFieldsSql.push('dt_modified = NOW()');
      updateValues.push(legalEntityId);

      await pool.query(`
        UPDATE legal_entity
        SET ${updateFieldsSql.join(', ')}
        WHERE legal_entity_id = $${paramIndex} AND is_deleted = false
      `, updateValues);

      console.log('[NL Enrichment] Updated legal_entity with KVK data:', updatedFields);
      return { updated: true, fields: updatedFields };
    }
  } catch (error: any) {
    console.warn('[NL Enrichment] Failed to update legal_entity with KVK data:', error.message);
  }

  return { updated: false, fields: [] };
}

// Helper: Store KVK registry data
async function storeKvkRegistryData(
  pool: any,
  legalEntityId: string,
  kvkNumber: string,
  kvkData: any,
  rsin: string | null
): Promise<void> {
  // Check if record already exists
  const { rows: existing } = await pool.query(`
    SELECT registry_data_id FROM kvk_registry_data
    WHERE legal_entity_id = $1 AND is_deleted = false
    LIMIT 1
  `, [legalEntityId]);

  if (existing.length > 0) {
    // Update existing record
    await pool.query(`
      UPDATE kvk_registry_data SET
        company_name = $2,
        legal_form = $3,
        statutory_name = $4,
        trade_names = $5,
        formal_registration_date = $6,
        material_registration_date = $7,
        company_status = $8,
        addresses = $9,
        sbi_activities = $10,
        total_employees = $11,
        rsin = $12,
        raw_api_response = $13,
        last_verified_at = NOW(),
        dt_modified = NOW()
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [
      legalEntityId,
      kvkData.companyName || null,
      kvkData.legalForm || null,
      kvkData.statutoryName || null,
      kvkData.tradeNames ? JSON.stringify(kvkData.tradeNames) : null,
      kvkData.formalRegistrationDate || null,
      kvkData.materialStartDate || null,
      null,
      kvkData.addresses ? JSON.stringify(kvkData.addresses) : null,
      kvkData.sbiActivities ? JSON.stringify(kvkData.sbiActivities) : null,
      kvkData.totalEmployees || null,
      rsin,
      JSON.stringify(kvkData.rawApiResponse || kvkData)
    ]);
  } else {
    // Insert new record
    await pool.query(`
      INSERT INTO kvk_registry_data (
        legal_entity_id, kvk_number, company_name, legal_form, statutory_name,
        trade_names, formal_registration_date, material_registration_date,
        company_status, addresses, sbi_activities, total_employees,
        rsin, raw_api_response, fetched_at, last_verified_at,
        data_source, created_by, dt_created, dt_modified, is_deleted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(),
              'kvk_api', 'enrichment', NOW(), NOW(), false)
    `, [
      legalEntityId,
      kvkNumber,
      kvkData.companyName || null,
      kvkData.legalForm || null,
      kvkData.statutoryName || null,
      kvkData.tradeNames ? JSON.stringify(kvkData.tradeNames) : null,
      kvkData.formalRegistrationDate || null,
      kvkData.materialStartDate || null,
      null,
      kvkData.addresses ? JSON.stringify(kvkData.addresses) : null,
      kvkData.sbiActivities ? JSON.stringify(kvkData.sbiActivities) : null,
      kvkData.totalEmployees || null,
      rsin,
      JSON.stringify(kvkData.rawApiResponse || kvkData)
    ]);
  }

  // Sync company name to legal_entity
  const officialName = kvkData.statutoryName || kvkData.companyName;
  if (officialName) {
    await pool.query(`
      UPDATE legal_entity
      SET primary_legal_name = $1, dt_modified = NOW()
      WHERE legal_entity_id = $2 AND is_deleted = false
    `, [officialName, legalEntityId]);
  }

  console.log('[NL Enrichment] Stored KVK registry data for:', kvkNumber);
}

/**
 * Enrich Dutch company with EUID derived from KVK
 *
 * Flow:
 * 1. Check if EUID already exists
 * 2. Get KVK number from existing identifiers
 * 3. Generate EUID in format: NL.KVK.{kvkNumber}
 * 4. Store EUID identifier
 */
export async function enrichEuid(ctx: EnrichmentContext): Promise<EnrichmentResult> {
  const { pool, legalEntityId, existingTypes, existingIdentifiers } = ctx;
  const kvkNumber = getExistingValue(existingIdentifiers, 'KVK');

  // EUID is only applicable for Dutch companies with KVK
  if (ctx.countryCode !== 'NL') {
    return { identifier: 'EUID', status: 'not_available', message: 'EUID only for NL companies' };
  }

  // Check if EUID already exists
  if (existingTypes.has('EUID')) {
    const existingEuid = getExistingValue(existingIdentifiers, 'EUID');
    return {
      identifier: 'EUID',
      status: 'exists',
      value: existingEuid || undefined
    };
  }

  // Need KVK to generate EUID
  if (!kvkNumber) {
    return {
      identifier: 'EUID',
      status: 'not_available',
      message: 'Cannot generate EUID without KVK number'
    };
  }

  // Generate EUID: NL.KVK.{kvkNumber}
  const euidValue = `NL.KVK.${kvkNumber}`;

  await pool.query(`
    INSERT INTO legal_entity_number (
      legal_entity_reference_id, legal_entity_id,
      identifier_type, identifier_value, country_code,
      validation_status, registry_name, registry_url,
      verification_notes, dt_created, dt_modified
    )
    VALUES ($1, $2, 'EUID', $3, 'NL', 'VALIDATED', 'BRIS', 'https://e-justice.europa.eu/489/EN/business_registers',
            'Auto-generated from KVK', NOW(), NOW())
  `, [randomUUID(), legalEntityId, euidValue]);

  console.log('[NL Enrichment] Generated EUID from KVK:', euidValue);

  return {
    identifier: 'EUID',
    status: 'added',
    value: euidValue,
    message: 'Generated from KVK number'
  };
}

// Helper: Store VIES registry data
async function storeViesRegistryData(
  pool: any,
  legalEntityId: string,
  rsin: string,
  companyData: any
): Promise<void> {
  await pool.query(`
    INSERT INTO vies_registry_data (
      registry_data_id, legal_entity_id, country_code, vat_number, full_vat_number,
      is_valid, user_error, request_date, request_identifier,
      trader_name, trader_address, raw_api_response,
      fetched_at, last_verified_at, data_source, created_by, dt_created, dt_modified, is_deleted
    )
    VALUES ($1, $2, 'NL', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), 'vies_api', 'enrichment', NOW(), NOW(), false)
    ON CONFLICT (legal_entity_id) WHERE is_deleted = false
    DO UPDATE SET
      is_valid = EXCLUDED.is_valid,
      user_error = EXCLUDED.user_error,
      request_date = EXCLUDED.request_date,
      request_identifier = EXCLUDED.request_identifier,
      trader_name = EXCLUDED.trader_name,
      trader_address = EXCLUDED.trader_address,
      raw_api_response = EXCLUDED.raw_api_response,
      last_verified_at = NOW(),
      dt_modified = NOW()
  `, [
    randomUUID(),
    legalEntityId,
    `${rsin}B01`,
    `NL${rsin}B01`,
    companyData.isValid,
    companyData.userError,
    companyData.requestDate,
    companyData.requestIdentifier,
    companyData.traderName,
    companyData.traderAddress,
    JSON.stringify(companyData.rawApiResponse)
  ]);
}
