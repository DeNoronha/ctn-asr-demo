/**
 * Belgian (BE) Company Enrichment Service
 *
 * Handles enrichment specific to Belgian companies:
 * 1. KBO (Kruispuntbank van Ondernemingen) search by KBO number or company name
 * 2. Belgian registry data storage
 * 3. KBO identifier creation
 * 4. VAT derivation (BE + KBO number)
 * 5. EUID generation (BE.KBO.{number})
 *
 * Data Sources:
 * - KBO Public Search (free): Web scraping of kbopub.economie.fgov.be
 * - KBO API (paid): Official API via kbodata.app (when enabled)
 *
 * Note: Belgian VAT numbers are directly derived from KBO numbers.
 * Format: BE + 10-digit KBO number (e.g., BE0439291125)
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';
import { kboService, KboCompanyData } from '../kboService';
import { kboApiService, KboApiEnterprise } from '../kboApiService';

/**
 * Enrich Belgian company from KBO
 *
 * Flow:
 * 1. Check if belgium_registry_data already exists
 * 2. If KBO exists, search by KBO number
 * 3. Otherwise, skip (name search not reliable for KBO)
 * 4. Store belgium_registry_data
 * 5. Create KBO identifier if found
 * 6. Derive VAT from KBO (BE + KBO number)
 * 7. Generate EUID (BE.KBO.{number})
 */
export async function enrichBelgianRegistry(ctx: EnrichmentContext): Promise<EnrichmentResult[]> {
  const { pool, legalEntityId, existingIdentifiers, existingTypes } = ctx;
  const results: EnrichmentResult[] = [];

  if (ctx.countryCode !== 'BE') {
    return results;
  }

  try {
    // Check if we already have Belgian registry data
    const { rows: existingBelgiumRegistry } = await pool.query(`
      SELECT registry_data_id FROM belgium_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      LIMIT 1
    `, [legalEntityId]);

    if (existingBelgiumRegistry.length === 0) {
      // No existing data - need to fetch
      let kboResult: any = null;

      // Check if we have an existing KBO identifier
      const existingKbo = existingIdentifiers.find(i =>
        (i.identifier_type === 'KBO' || i.identifier_type === 'BCE') && i.identifier_value
      );

      if (existingKbo) {
        console.log('[BE Enrichment] Searching by KBO number:', existingKbo.identifier_value);

        // Try KBO API first if enabled (paid service with richer data)
        if (kboApiService.isEnabled()) {
          console.log('[BE Enrichment] Using KBO API (paid service)');
          const apiResult = await kboApiService.fetchCompleteProfile(existingKbo.identifier_value);
          if (apiResult) {
            kboResult = {
              status: 'found',
              companyData: transformApiToKboData(apiResult),
            };
          }
        }

        // Fallback to public scraping if API not available or failed
        if (!kboResult) {
          console.log('[BE Enrichment] Using KBO Public Search (web scraping)');
          kboResult = await kboService.searchByKboNumber(existingKbo.identifier_value);
        }
      } else {
        // Unlike German Handelsregister, KBO name search is not reliable via public interface
        // We need a KBO number to proceed
        results.push({
          identifier: 'KBO',
          status: 'not_available',
          message: 'No KBO number available. KBO public search requires enterprise number.',
        });
        return results;
      }

      if (kboResult?.status === 'found' && kboResult.companyData) {
        const kboData = kboResult.companyData;
        console.log('[BE Enrichment] Found Belgian company:', kboData.companyName, kboData.kboNumber);

        // Store belgium_registry_data
        await storeBelgiumRegistryData(pool, legalEntityId, kboData);

        // Add KBO identifier if not already present
        if (!existingTypes.has('KBO') && !existingTypes.has('BCE')) {
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, registry_url,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'KBO', $3, 'BE', 'VERIFIED', 'KBO', 'https://kbopub.economie.fgov.be', NOW(), NOW())
          `, [randomUUID(), legalEntityId, kboData.kboNumberClean]);

          results.push({
            identifier: 'KBO',
            status: 'added',
            value: kboData.kboNumber,
            message: 'Found via KBO public search',
          });
        }

        // Derive VAT from KBO (Belgian VAT = BE + KBO number)
        if (!existingTypes.has('VAT')) {
          const vatNumber = kboService.generateVatNumber(kboData.kboNumberClean);

          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, registry_url,
              verification_notes, dt_created, dt_modified
            )
            VALUES ($1, $2, 'VAT', $3, 'BE', 'DERIVED', 'KBO', 'https://kbopub.economie.fgov.be',
                    'Derived from KBO number', NOW(), NOW())
          `, [randomUUID(), legalEntityId, vatNumber]);

          results.push({
            identifier: 'VAT',
            status: 'added',
            value: vatNumber,
            message: 'Derived from KBO number (BE + KBO)',
          });
        }

        // Update legal_entity with address
        if (kboData.address?.city || kboData.address?.street) {
          await updateLegalEntityAddress(pool, legalEntityId, kboData.address);
        }

      } else if (kboResult) {
        results.push({
          identifier: 'KBO',
          status: 'not_available',
          message: kboResult.message || 'Not found in KBO',
        });
      }
    } else {
      console.log('[BE Enrichment] Belgian registry data already exists');

      // Generate VAT from existing KBO if missing
      if (!existingTypes.has('VAT')) {
        const kboValue = getExistingValue(existingIdentifiers, 'KBO') ||
                         getExistingValue(existingIdentifiers, 'BCE');
        if (kboValue) {
          const vatNumber = kboService.generateVatNumber(kboValue);
          await pool.query(`
            INSERT INTO legal_entity_number (
              legal_entity_reference_id, legal_entity_id,
              identifier_type, identifier_value, country_code,
              validation_status, registry_name, verification_notes,
              dt_created, dt_modified
            )
            VALUES ($1, $2, 'VAT', $3, 'BE', 'DERIVED', 'KBO',
                    'Derived from KBO number', NOW(), NOW())
          `, [randomUUID(), legalEntityId, vatNumber]);

          results.push({
            identifier: 'VAT',
            status: 'added',
            value: vatNumber,
            message: 'Derived from existing KBO number',
          });
        }
      }
    }
  } catch (kboError: any) {
    console.warn('[BE Enrichment] KBO search failed:', kboError.message);
    results.push({
      identifier: 'KBO',
      status: 'error',
      message: kboError.message,
    });
  }

  return results;
}

/**
 * Store Belgian registry data
 */
async function storeBelgiumRegistryData(
  pool: Pool,
  legalEntityId: string,
  kboData: KboCompanyData
): Promise<void> {
  await pool.query(`
    INSERT INTO belgium_registry_data (
      legal_entity_id, kbo_number, kbo_number_clean,
      enterprise_type, enterprise_type_code,
      company_name, legal_form, legal_form_full,
      company_status, status_start_date, start_date,
      street, house_number, bus_number, postal_code, city, country, full_address,
      vat_number, vat_status, vat_start_date,
      nace_codes, main_activity,
      representatives, establishment_count,
      data_source, source_url, raw_response,
      fetched_at, created_by, dt_created, dt_modified, is_deleted
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW(), 'enrichment', NOW(), NOW(), false)
  `, [
    legalEntityId,
    kboData.kboNumber,
    kboData.kboNumberClean,
    kboData.enterpriseType,
    kboData.enterpriseTypeCode,
    kboData.companyName,
    kboData.legalForm,
    kboData.legalFormFull,
    kboData.status,
    kboData.statusStartDate,
    kboData.startDate,
    kboData.address?.street,
    kboData.address?.houseNumber,
    kboData.address?.busNumber,
    kboData.address?.postalCode,
    kboData.address?.city,
    kboData.address?.country || 'Belgium',
    kboData.address?.fullAddress,
    kboData.vatNumber,
    kboData.vatStatus,
    kboData.vatStartDate,
    kboData.naceCodes ? JSON.stringify(kboData.naceCodes) : null,
    kboData.mainActivity,
    kboData.representatives ? JSON.stringify(kboData.representatives) : null,
    kboData.establishmentCount,
    kboData.dataSource,
    kboData.sourceUrl,
    kboData.rawResponse ? JSON.stringify(kboData.rawResponse) : null,
  ]);

  console.log('[BE Enrichment] Stored Belgian registry data for:', kboData.companyName);
}

/**
 * Update legal_entity address from Belgian registry
 */
async function updateLegalEntityAddress(
  pool: Pool,
  legalEntityId: string,
  address: any
): Promise<void> {
  const updateFields: string[] = [];
  const updateVals: any[] = [];
  let idx = 1;

  if (address.street) {
    let addressLine = address.street;
    if (address.houseNumber) {
      addressLine += ` ${address.houseNumber}`;
    }
    if (address.busNumber) {
      addressLine += ` bus ${address.busNumber}`;
    }
    updateFields.push(`address_line1 = $${idx++}`);
    updateVals.push(addressLine);
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
  updateVals.push('BE');

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

/**
 * Transform KBO API response to KboCompanyData format
 * This allows the enrichment service to work with both data sources
 */
function transformApiToKboData(apiData: KboApiEnterprise): KboCompanyData {
  // Get primary denomination (social name)
  const socialName = apiData.denominations?.find(d => d.type === 'social');
  const companyName = socialName?.value || '';

  // Map juridical form to short code
  let legalForm = apiData.juridicalForm?.code || '';
  const legalFormFull = apiData.juridicalForm?.description?.nl || apiData.juridicalForm?.description?.en || '';

  // Common Belgian legal form mappings
  if (legalFormFull.toLowerCase().includes('besloten vennootschap')) {
    legalForm = 'BV';
  } else if (legalFormFull.toLowerCase().includes('naamloze vennootschap')) {
    legalForm = 'NV';
  } else if (legalFormFull.toLowerCase().includes('coöperatieve')) {
    legalForm = 'CVBA';
  } else if (legalFormFull.toLowerCase().includes('vereniging zonder winstoogmerk') || legalFormFull.toLowerCase().includes('vzw')) {
    legalForm = 'VZW';
  }

  // Map status
  let status: 'Actief' | 'Stopgezet' | 'Start' | 'Unknown' = 'Unknown';
  if (apiData.active) {
    status = 'Actief';
  } else if (apiData.dateEnd) {
    status = 'Stopgezet';
  }

  // Get primary address
  const primaryAddress = apiData.addresses?.[0];

  // Build NACE codes array
  const naceCodes = apiData.activities?.map((act, idx) => ({
    code: act.naceCode,
    description: act.description?.nl || act.description?.en || '',
    isMain: idx === 0,
  })) || [];

  // Build representatives array
  const representatives = apiData.roles?.map(role => ({
    name: role.name,
    role: role.roleTitle?.nl || role.roleTitle?.en || 'Bestuurder',
    startDate: role.dateStart,
  })) || [];

  return {
    kboNumber: apiData.enterpriseNumberFormatted,
    kboNumberClean: apiData.enterpriseNumber,
    enterpriseType: apiData.type === 'entity' ? 'Rechtspersoon' : 'Natuurlijk persoon',
    enterpriseTypeCode: apiData.type === 'entity' ? '2' : '1',
    companyName,
    legalForm,
    legalFormFull,
    status,
    startDate: apiData.dateStart,
    endDate: apiData.dateEnd,
    address: primaryAddress ? {
      street: primaryAddress.street,
      houseNumber: primaryAddress.houseNumber,
      busNumber: primaryAddress.box,
      postalCode: primaryAddress.zipcode,
      city: primaryAddress.city,
      country: 'Belgium',
      fullAddress: [
        primaryAddress.street,
        primaryAddress.houseNumber,
        primaryAddress.box ? `bus ${primaryAddress.box}` : '',
        primaryAddress.zipcode,
        primaryAddress.city,
      ].filter(Boolean).join(' '),
    } : undefined,
    vatNumber: apiData.vatNumber,
    naceCodes: naceCodes.length > 0 ? naceCodes : undefined,
    mainActivity: naceCodes[0]?.description,
    representatives: representatives.length > 0 ? representatives : undefined,
    establishmentCount: apiData.establishments?.length,
    dataSource: 'kbo_api',
    sourceUrl: `https://api.kbodata.app/enterprise/${apiData.enterpriseNumber}`,
    rawResponse: apiData,
  };
}
