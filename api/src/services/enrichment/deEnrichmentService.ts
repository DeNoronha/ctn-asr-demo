/**
 * German (DE) Company Enrichment Service
 *
 * Handles enrichment specific to German companies:
 * 1. Handelsregister search (by HRB/HRA or company name)
 * 2. German registry data storage
 * 3. HRB/HRA identifier creation
 * 4. EUID generation (DE{courtCode}.{type}{number})
 *
 * Note: VAT cannot be auto-derived for German companies.
 * Handelsregister does not contain VAT data, and VIES only validates.
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';

/**
 * Enrich German company from Handelsregister
 *
 * Flow:
 * 1. Check if german_registry_data already exists
 * 2. If HRB/HRA exists, search by register number
 * 3. Otherwise, search by company name
 * 4. Store german_registry_data
 * 5. Create HRB/HRA identifier if found
 * 6. Generate EUID if court code available
 */
export async function enrichGermanRegistry(ctx: EnrichmentContext): Promise<EnrichmentResult[]> {
  const { pool, legalEntityId, companyName, existingIdentifiers, existingTypes } = ctx;
  const results: EnrichmentResult[] = [];

  if (ctx.countryCode !== 'DE') {
    return results;
  }

  try {
    // Check if we already have German registry data
    const { rows: existingGermanRegistry } = await pool.query(`
      SELECT registry_data_id FROM german_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      LIMIT 1
    `, [legalEntityId]);

    if (existingGermanRegistry.length === 0) {
      // No existing data - need to fetch
      const { HandelsregisterService } = await import('../handelsregisterService');
      const hrService = new HandelsregisterService();
      let hrResult: any = null;

      // Check if we have an existing HRB/HRA identifier
      const existingHrb = existingIdentifiers.find(i =>
        (i.identifier_type === 'HRB' || i.identifier_type === 'HRA') && i.identifier_value
      );

      if (existingHrb) {
        console.log('[DE Enrichment] Searching by register number:', existingHrb.identifier_value);
        hrResult = await hrService.searchByRegisterNumber(
          existingHrb.identifier_value,
          existingHrb.registry_name || undefined
        );
      } else if (companyName) {
        console.log('[DE Enrichment] Searching by company name:', companyName);
        hrResult = await hrService.searchByCompanyName(companyName);
      }

      if (hrResult?.status === 'found' && hrResult.companyData) {
        const hrData = hrResult.companyData;
        console.log('[DE Enrichment] Found German company:', hrData.companyName, hrData.registerNumber);

        // Store german_registry_data
        await storeGermanRegistryData(pool, legalEntityId, hrData);

        // Add HRB/HRA identifier if not already present
        if (hrData.registerNumber && hrData.registerNumber !== 'Unknown' &&
            !existingTypes.has('HRB') && !existingTypes.has('HRA')) {
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, $3, $4, 'DE', 'VALID', 'Handelsregister', 'https://www.handelsregister.de/', NOW(), NOW())
          `, [randomUUID(), legalEntityId, hrData.registerType, hrData.registerNumber]);

          results.push({
            identifier: hrData.registerType,
            status: 'added',
            value: hrData.registerNumber,
            message: 'Found via GLEIF/Handelsregister'
          });
        }

        // Add EUID if generated
        if (hrData.euid && !existingTypes.has('EUID')) {
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'EUID', $3, 'VALID', 'BRIS', 'https://e-justice.europa.eu/', NOW(), NOW())
          `, [randomUUID(), legalEntityId, hrData.euid]);

          results.push({
            identifier: 'EUID',
            status: 'added',
            value: hrData.euid,
            message: 'Generated from German register data'
          });
        }

        // Update legal_entity with address
        if (hrData.address?.city || hrData.address?.street) {
          await updateLegalEntityAddress(pool, legalEntityId, hrData.address);
        }

      } else if (hrResult) {
        results.push({
          identifier: 'HRB',
          status: 'not_available',
          message: hrResult.message || 'Not found in Handelsregister'
        });
      }
    } else {
      console.log('[DE Enrichment] German registry data already exists');

      // Generate EUID from existing HRB if missing
      const euidResult = await generateEuidFromExisting(ctx);
      if (euidResult) {
        results.push(euidResult);
      }
    }
  } catch (hrError: any) {
    console.warn('[DE Enrichment] Handelsregister search failed:', hrError.message);
    results.push({
      identifier: 'HRB',
      status: 'error',
      message: hrError.message
    });
  }

  return results;
}

/**
 * Generate EUID from existing HRB/HRA and court code
 *
 * Format: DE{courtCode}.{type}{number}
 * Example: DED4601R.HRB15884 (Neuss)
 */
export async function generateEuidFromExisting(ctx: EnrichmentContext): Promise<EnrichmentResult | null> {
  const { pool, legalEntityId, existingIdentifiers, existingTypes } = ctx;

  if (existingTypes.has('EUID')) {
    return null;
  }

  const existingHrb = existingIdentifiers.find(i =>
    (i.identifier_type === 'HRB' || i.identifier_type === 'HRA') && i.identifier_value
  );

  if (!existingHrb) {
    return null;
  }

  // Get court code from german_registry_data
  const { rows: grData } = await pool.query(`
    SELECT register_court_code, register_type
    FROM german_registry_data
    WHERE legal_entity_id = $1 AND is_deleted = false
    LIMIT 1
  `, [legalEntityId]);

  if (grData.length === 0 || !grData[0].register_court_code) {
    return null;
  }

  const { HandelsregisterService } = await import('../handelsregisterService');
  const hrService = new HandelsregisterService();

  // Parse HRB number (e.g., "HRB 15884" -> { type: "HRB", number: "15884" })
  const hrbMatch = existingHrb.identifier_value.match(/([A-Z]+)\s*(\d+)/i);
  if (!hrbMatch) {
    return null;
  }

  const registerType = hrbMatch[1].toUpperCase();
  const registerNumber = hrbMatch[2];

  const euid = hrService.generateEuid(
    grData[0].register_court_code,
    registerType,
    registerNumber
  );

  await pool.query(`
    INSERT INTO legal_entity_number (
      legal_entity_reference_id, legal_entity_id,
      identifier_type, identifier_value,
      validation_status, registry_name, registry_url,
      dt_created, dt_modified
    )
    VALUES ($1, $2, 'EUID', $3, 'VALID', 'BRIS', 'https://e-justice.europa.eu/', NOW(), NOW())
  `, [randomUUID(), legalEntityId, euid]);

  console.log(`[DE Enrichment] Generated EUID ${euid} from existing HRB ${existingHrb.identifier_value}`);

  return {
    identifier: 'EUID',
    status: 'added',
    value: euid,
    message: 'Generated from existing HRB/HRA and court code'
  };
}

// Helper: Store German registry data
async function storeGermanRegistryData(
  pool: any,
  legalEntityId: string,
  hrData: any
): Promise<void> {
  await pool.query(`
    INSERT INTO german_registry_data (
      legal_entity_id, register_number, register_type, register_court,
      register_court_code, euid, company_name, legal_form, legal_form_long,
      company_status, registration_date, street, postal_code, city, country,
      full_address, data_source, source_url, raw_response,
      fetched_at, created_by, dt_created, dt_modified, is_deleted
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), 'enrichment', NOW(), NOW(), false)
  `, [
    legalEntityId,
    hrData.registerNumber,
    hrData.registerType,
    hrData.registerCourt,
    hrData.registerCourtCode,
    hrData.euid,
    hrData.companyName,
    hrData.legalForm,
    hrData.legalFormLong,
    hrData.status,
    hrData.registrationDate,
    hrData.address?.street,
    hrData.address?.postalCode,
    hrData.address?.city,
    hrData.address?.country || 'DE',
    hrData.address?.fullAddress,
    hrData.dataSource,
    hrData.sourceUrl,
    JSON.stringify(hrData.rawResponse)
  ]);

  console.log('[DE Enrichment] Stored German registry data for:', hrData.companyName);
}

// Helper: Update legal_entity address from German registry
async function updateLegalEntityAddress(
  pool: any,
  legalEntityId: string,
  address: any
): Promise<void> {
  const updateFields: string[] = [];
  const updateVals: any[] = [];
  let idx = 1;

  if (address.street) {
    updateFields.push(`address_line1 = $${idx++}`);
    updateVals.push(address.street);
  }
  if (address.postalCode) {
    updateFields.push(`postal_code = $${idx++}`);
    updateVals.push(address.postalCode);
  }
  if (address.city) {
    updateFields.push(`city = $${idx++}`);
    updateVals.push(address.city);
  }
  updateFields.push(`country_code = $${idx++}`);
  updateVals.push('DE');

  if (updateFields.length > 0) {
    updateFields.push('dt_modified = NOW()');
    updateVals.push(legalEntityId);

    await pool.query(`
      UPDATE legal_entity
      SET ${updateFields.join(', ')}
      WHERE legal_entity_id = $${idx} AND is_deleted = false
    `, updateVals);
  }
}
