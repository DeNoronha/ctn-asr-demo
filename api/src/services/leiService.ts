/**
 * LEI Service
 *
 * Service for retrieving Legal Entity Identifiers (LEI) from the GLEIF API.
 * Supports multi-country lookups using registration authority codes.
 *
 * @see https://www.gleif.org/en/lei-data/gleif-api
 * @see https://api.gleif.org/api/v1/
 */

import axios from 'axios';
import { InvocationContext } from '@azure/functions';

const GLEIF_API_BASE_URL = 'https://api.gleif.org/api/v1';

/**
 * Mapping of country codes to registration authority codes
 * Each country may have multiple registration authorities
 */
export const REGISTRATION_AUTHORITY_MAP: Record<string, string[]> = {
  NL: ['NL-KVK'],                          // Netherlands - Kamer van Koophandel
  DE: ['DE-HRB', 'DE-HRA'],                // Germany - Handelsregister B and A
  BE: ['BE-BCE'],                          // Belgium - Banque-Carrefour des Entreprises / Kruispuntbank van Ondernemingen
  FR: ['FR-RCS'],                          // France - Registre du Commerce et des Sociétés
  GB: ['GB-COH'],                          // United Kingdom - Companies House
  IT: ['IT-REA'],                          // Italy - Registro delle Imprese
  ES: ['ES-CIF'],                          // Spain - Registro Mercantil
  PT: ['PT-CR'],                           // Portugal - Conservatória do Registo Comercial
  LU: ['LU-RCS'],                          // Luxembourg - Registre de Commerce et des Sociétés
  AT: ['AT-FB'],                           // Austria - Firmenbuch
  DK: ['DK-CVR'],                          // Denmark - Central Business Register
  SE: ['SE-BR'],                           // Sweden - Bolagsverket
  NO: ['NO-BR'],                           // Norway - Brønnøysundregistrene
  FI: ['FI-PRH'],                          // Finland - Patent- ja rekisterihallitus
  IE: ['IE-CRO'],                          // Ireland - Companies Registration Office
  PL: ['PL-KRS'],                          // Poland - Krajowy Rejestr Sądowy
  CZ: ['CZ-OR'],                           // Czech Republic - Obchodní rejstřík
  CH: ['CH-EHRA', 'CH-CHRB'],             // Switzerland - Handelsregister
};

/**
 * Interface for GLEIF API LEI record
 */
interface GLEIFLeiRecord {
  type: 'lei-records';
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName: {
        name: string;
      };
      registeredAs: string;
      registrationAuthority: {
        id: string;
        other: string | null;
      };
      legalAddress: {
        country: string;
        addressLines: string[];
        city: string;
        postalCode: string;
      };
      headquartersAddress: {
        country: string;
        addressLines: string[];
        city: string;
        postalCode: string;
      };
    };
    registration: {
      registrationStatus: string;
      registrationDate: string;
      lastUpdateDate: string;
    };
  };
}

/**
 * Interface for GLEIF API response
 */
interface GLEIFResponse {
  data: GLEIFLeiRecord[];
  meta: {
    count: number;
  };
}

/**
 * Interface for LEI fetch result
 */
export interface LeiFetchResult {
  lei: string | null;
  legal_name: string | null;
  registration_authority: string | null;
  registration_number: string | null;
  country: string | null;
  status: 'found' | 'not_found' | 'error';
  attempts: number;
  message: string;
  gleif_response?: GLEIFLeiRecord;
}

/**
 * Fetches LEI from GLEIF API using registration authority and number
 *
 * @param registrationAuthority - e.g., 'NL-KVK', 'DE-HRB'
 * @param registrationNumber - e.g., '12345678'
 * @param context - Azure Functions invocation context for logging
 * @returns LEI record if found, null otherwise
 */
async function fetchLeiFromGleif(
  registrationAuthority: string,
  registrationNumber: string,
  context: InvocationContext
): Promise<GLEIFLeiRecord | null> {
  const registeredAs = `${registrationAuthority}/${registrationNumber}`;
  const url = `${GLEIF_API_BASE_URL}/lei-records`;

  context.log(`Querying GLEIF API: ${url}?filter[entity.registeredAs]=${registeredAs}`);

  try {
    const response = await axios.get<GLEIFResponse>(url, {
      params: {
        'filter[entity.registeredAs]': registeredAs,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data.data && response.data.data.length > 0) {
      context.log(`✓ Found LEI: ${response.data.data[0].attributes.lei}`);
      return response.data.data[0];
    }

    context.log(`✗ No LEI found for ${registeredAs}`);
    return null;

  } catch (error: any) {
    if (error.response) {
      // Axios error with response
      if (error.response.status === 404) {
        context.log(`✗ No LEI found for ${registeredAs} (404)`);
        return null;
      }
      context.error(`GLEIF API error: ${error.response.status} ${error.message}`);
    } else {
      context.error(`Unexpected error querying GLEIF API:`, error);
    }
    throw error;
  }
}

/**
 * Retrieves LEI for an organization using registration number and country
 *
 * This function:
 * 1. Determines applicable registration authority codes for the country
 * 2. Tries each authority code sequentially until LEI is found
 * 3. Returns the first successful match
 *
 * @param registrationNumber - Organization's registration number (e.g., KvK, HRB)
 * @param countryCode - Two-letter country code (e.g., 'NL', 'DE')
 * @param identifierType - Type of identifier (e.g., 'KVK', 'HRB')
 * @param context - Azure Functions invocation context for logging
 * @returns LEI fetch result with status and data
 */
export async function fetchLeiForOrganization(
  registrationNumber: string,
  countryCode: string,
  identifierType: string,
  context: InvocationContext
): Promise<LeiFetchResult> {
  const upperCountryCode = countryCode.toUpperCase();
  const authorities = REGISTRATION_AUTHORITY_MAP[upperCountryCode];

  if (!authorities || authorities.length === 0) {
    return {
      lei: null,
      legal_name: null,
      registration_authority: null,
      registration_number: null,
      country: null,
      status: 'not_found',
      attempts: 0,
      message: `No registration authority mapping found for country: ${upperCountryCode}`,
    };
  }

  context.log(`Fetching LEI for ${identifierType} ${registrationNumber} in ${upperCountryCode}`);
  context.log(`Will try authorities: ${authorities.join(', ')}`);

  let attempts = 0;
  const errors: string[] = [];

  // Try each registration authority sequentially
  for (const authority of authorities) {
    attempts++;
    try {
      const record = await fetchLeiFromGleif(authority, registrationNumber, context);

      if (record) {
        return {
          lei: record.attributes.lei,
          legal_name: record.attributes.entity.legalName.name,
          registration_authority: authority,
          registration_number: registrationNumber,
          country: record.attributes.entity.legalAddress.country,
          status: 'found',
          attempts,
          message: `LEI found using ${authority}`,
          gleif_response: record,
        };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${authority}: ${errorMsg}`);
      context.warn(`Failed to fetch LEI using ${authority}: ${errorMsg}`);
      // Continue to next authority
    }
  }

  // No LEI found after trying all authorities
  return {
    lei: null,
    legal_name: null,
    registration_authority: null,
    registration_number: null,
    country: null,
    status: 'not_found',
    attempts,
    message: `No LEI found after trying ${attempts} registration ${attempts === 1 ? 'authority' : 'authorities'}: ${authorities.join(', ')}`,
  };
}

/**
 * Validates LEI format (20 alphanumeric characters)
 */
export function isValidLeiFormat(lei: string): boolean {
  return /^[A-Z0-9]{20}$/.test(lei.trim().toUpperCase());
}

/**
 * Gets registration authority codes for a country
 */
export function getAuthoritiesForCountry(countryCode: string): string[] {
  return REGISTRATION_AUTHORITY_MAP[countryCode.toUpperCase()] || [];
}

/**
 * Search LEI by company name in GLEIF database
 *
 * @param companyName - Company name to search (wildcards supported)
 * @param countryCode - Optional two-letter country code to filter results
 * @param context - Azure Functions invocation context for logging
 * @returns Array of LEI records matching the search
 */
export async function searchLeiByCompanyName(
  companyName: string,
  countryCode: string | null,
  context: InvocationContext
): Promise<GLEIFLeiRecord[]> {
  const url = `${GLEIF_API_BASE_URL}/lei-records`;

  // Use fuzzy search with wildcards
  const searchName = companyName.includes('*') ? companyName : `${companyName}*`;

  context.log(`Searching GLEIF API by company name: ${searchName}${countryCode ? ` (country: ${countryCode})` : ''}`);

  try {
    const params: Record<string, string> = {
      'filter[entity.legalName]': searchName,
      'page[size]': '20',
    };

    // Add country filter if provided
    if (countryCode) {
      params['filter[entity.legalAddress.country]'] = countryCode.toUpperCase();
    }

    const response = await axios.get<GLEIFResponse>(url, {
      params,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000, // 15 second timeout for name searches
    });

    if (response.data.data && response.data.data.length > 0) {
      context.log(`✓ Found ${response.data.data.length} LEI records for name search "${searchName}"`);
      return response.data.data;
    }

    context.log(`✗ No LEI found for company name "${searchName}"`);
    return [];

  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 404) {
        context.log(`✗ No LEI found for company name "${searchName}" (404)`);
        return [];
      }
      context.error(`GLEIF API error: ${error.response.status} ${error.message}`);
    } else {
      context.error(`Unexpected error searching GLEIF API:`, error);
    }
    throw error;
  }
}

/**
 * Retrieves LEI for an organization with fallback to company name search
 *
 * This function:
 * 1. First tries registration authority lookup (exact match)
 * 2. If not found and company name provided, falls back to name search
 * 3. For name search, tries to find best match based on company name similarity
 *
 * @param registrationNumber - Organization's registration number (e.g., KvK, HRB)
 * @param countryCode - Two-letter country code (e.g., 'NL', 'DE')
 * @param identifierType - Type of identifier (e.g., 'KVK', 'HRB')
 * @param companyName - Optional company name for fallback search
 * @param context - Azure Functions invocation context for logging
 * @returns LEI fetch result with status and data
 */
export async function fetchLeiForOrganizationWithNameFallback(
  registrationNumber: string,
  countryCode: string,
  identifierType: string,
  companyName: string | null,
  context: InvocationContext
): Promise<LeiFetchResult> {
  // First try the standard registration number lookup
  const registrationResult = await fetchLeiForOrganization(
    registrationNumber,
    countryCode,
    identifierType,
    context
  );

  // If found by registration number, return immediately
  if (registrationResult.status === 'found') {
    return registrationResult;
  }

  // If no company name provided for fallback, return the not_found result
  if (!companyName) {
    return registrationResult;
  }

  // Try name search as fallback
  context.log(`Registration number lookup failed, trying company name search: "${companyName}"`);

  try {
    const nameResults = await searchLeiByCompanyName(companyName, countryCode, context);

    if (nameResults.length === 0) {
      return {
        ...registrationResult,
        message: `${registrationResult.message}. Name search for "${companyName}" also returned no results.`,
      };
    }

    // If only one result, use it
    if (nameResults.length === 1) {
      const record = nameResults[0];
      return {
        lei: record.attributes.lei,
        legal_name: record.attributes.entity.legalName.name,
        registration_authority: record.attributes.entity.registrationAuthority?.id || null,
        registration_number: record.attributes.entity.registeredAs || null,
        country: record.attributes.entity.legalAddress.country,
        status: 'found',
        attempts: registrationResult.attempts + 1,
        message: `LEI found via company name search (single match)`,
        gleif_response: record,
      };
    }

    // Multiple results - try to find exact or best match
    const normalizedSearchName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Look for exact match first
    const exactMatch = nameResults.find(record => {
      const recordName = record.attributes.entity.legalName.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return recordName === normalizedSearchName;
    });

    if (exactMatch) {
      return {
        lei: exactMatch.attributes.lei,
        legal_name: exactMatch.attributes.entity.legalName.name,
        registration_authority: exactMatch.attributes.entity.registrationAuthority?.id || null,
        registration_number: exactMatch.attributes.entity.registeredAs || null,
        country: exactMatch.attributes.entity.legalAddress.country,
        status: 'found',
        attempts: registrationResult.attempts + 1,
        message: `LEI found via company name search (exact match)`,
        gleif_response: exactMatch,
      };
    }

    // Look for starts-with match
    const startsWithMatch = nameResults.find(record => {
      const recordName = record.attributes.entity.legalName.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return recordName.startsWith(normalizedSearchName) || normalizedSearchName.startsWith(recordName);
    });

    if (startsWithMatch) {
      return {
        lei: startsWithMatch.attributes.lei,
        legal_name: startsWithMatch.attributes.entity.legalName.name,
        registration_authority: startsWithMatch.attributes.entity.registrationAuthority?.id || null,
        registration_number: startsWithMatch.attributes.entity.registeredAs || null,
        country: startsWithMatch.attributes.entity.legalAddress.country,
        status: 'found',
        attempts: registrationResult.attempts + 1,
        message: `LEI found via company name search (partial match from ${nameResults.length} results)`,
        gleif_response: startsWithMatch,
      };
    }

    // No good match found - return not_found with info about multiple results
    return {
      ...registrationResult,
      message: `${registrationResult.message}. Name search found ${nameResults.length} results but no exact match for "${companyName}".`,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    context.warn(`Name search failed: ${errorMsg}`);
    return {
      ...registrationResult,
      message: `${registrationResult.message}. Name search also failed: ${errorMsg}`,
    };
  }
}

/**
 * Fetch LEI details directly from GLEIF API by LEI code
 *
 * @param lei - The 20-character LEI code
 * @returns GLEIF LEI record or null if not found
 */
export async function fetchLeiByCode(lei: string): Promise<GLEIFLeiRecord | null> {
  if (!isValidLeiFormat(lei)) {
    console.error('Invalid LEI format:', lei);
    return null;
  }

  const url = `${GLEIF_API_BASE_URL}/lei-records/${lei.toUpperCase()}`;

  try {
    const response = await axios.get<{ data: GLEIFLeiRecord }>(url, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`LEI ${lei} not found in GLEIF`);
      return null;
    }
    console.error(`GLEIF API error for LEI ${lei}:`, error.message);
    throw error;
  }
}

/**
 * Store GLEIF registry data in the database
 *
 * @param pool - PostgreSQL connection pool
 * @param legalEntityId - UUID of the legal entity
 * @param gleifRecord - Full GLEIF API record
 */
export async function storeGleifRegistryData(
  pool: any,
  legalEntityId: string,
  gleifRecord: GLEIFLeiRecord
): Promise<void> {
  const entity = gleifRecord.attributes.entity;
  const registration = gleifRecord.attributes.registration;

  await pool.query(`
    INSERT INTO gleif_registry_data (
      legal_entity_id, lei, legal_name, legal_name_language,
      jurisdiction, registered_as, registration_authority_id,
      legal_address, headquarters_address,
      entity_status, initial_registration_date, last_update_date,
      next_renewal_date, registration_status, managing_lou,
      raw_api_response, fetched_at, last_verified_at,
      data_source, created_by, dt_created, dt_modified
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), 'gleif_api', 'enrichment', NOW(), NOW())
    ON CONFLICT (legal_entity_id) WHERE legal_entity_id IS NOT NULL
    DO UPDATE SET
      lei = EXCLUDED.lei,
      legal_name = EXCLUDED.legal_name,
      legal_name_language = EXCLUDED.legal_name_language,
      jurisdiction = EXCLUDED.jurisdiction,
      registered_as = EXCLUDED.registered_as,
      registration_authority_id = EXCLUDED.registration_authority_id,
      legal_address = EXCLUDED.legal_address,
      headquarters_address = EXCLUDED.headquarters_address,
      entity_status = EXCLUDED.entity_status,
      initial_registration_date = EXCLUDED.initial_registration_date,
      last_update_date = EXCLUDED.last_update_date,
      next_renewal_date = EXCLUDED.next_renewal_date,
      registration_status = EXCLUDED.registration_status,
      managing_lou = EXCLUDED.managing_lou,
      raw_api_response = EXCLUDED.raw_api_response,
      last_verified_at = NOW(),
      dt_modified = NOW()
  `, [
    legalEntityId,
    gleifRecord.attributes.lei,
    entity.legalName?.name || null,
    null, // legal_name_language - not directly available in current structure
    entity.legalAddress?.country || null,
    entity.registeredAs || null,
    entity.registrationAuthority?.id || null,
    entity.legalAddress ? JSON.stringify(entity.legalAddress) : null,
    entity.headquartersAddress ? JSON.stringify(entity.headquartersAddress) : null,
    null, // entity_status - need to check if in response
    registration?.registrationDate ? new Date(registration.registrationDate) : null,
    registration?.lastUpdateDate ? new Date(registration.lastUpdateDate) : null,
    null, // next_renewal_date
    registration?.registrationStatus || null,
    null, // managing_lou
    JSON.stringify(gleifRecord)
  ]);

  console.log(`Stored GLEIF registry data for legal entity ${legalEntityId}, LEI: ${gleifRecord.attributes.lei}`);
}

// Re-export the GLEIFLeiRecord type for external use
export type { GLEIFLeiRecord };
