/**
 * LEI Service
 *
 * Service for retrieving Legal Entity Identifiers (LEI) from the GLEIF API.
 * Supports multi-country lookups using registration authority codes.
 *
 * IMPORTANT: The GLEIF API uses two separate fields:
 * - entity.registeredAs: Contains ONLY the identifier number (e.g., "33031431")
 * - entity.registeredAt.id: Contains the GLEIF RA code (e.g., "RA000463")
 *
 * Our previous implementation incorrectly combined these as "NL-KVK/12345678".
 * The correct approach is to filter by registeredAs (number only) and optionally
 * by country to narrow results.
 *
 * @see https://www.gleif.org/en/lei-data/gleif-api
 * @see https://api.gleif.org/api/v1/
 * @see https://www.gleif.org/en/about-lei/code-lists/gleif-registration-authorities-list
 */

import axios from 'axios';
import { InvocationContext } from '@azure/functions';

const GLEIF_API_BASE_URL = 'https://api.gleif.org/api/v1';

/**
 * Official GLEIF Registration Authority codes
 * @see https://www.gleif.org/en/about-lei/code-lists/gleif-registration-authorities-list
 *
 * Note: Germany has many RA codes (one per local court/Amtsgericht), so we use
 * multiple common ones. The API filter by country is more reliable for DE.
 */
export const GLEIF_RA_CODES: Record<string, string[]> = {
  NL: ['RA000463'],                        // Netherlands - KvK (Kamer van Koophandel)
  BE: ['RA000025'],                        // Belgium - KBO/BCE (Kruispuntbank van Ondernemingen)
  FR: ['RA000192', 'RA000189'],            // France - RCS (Infogreffe) and SIRENE
  GB: ['RA000585', 'RA000586', 'RA000587'], // UK - Companies House (England/Wales, NI, Scotland)
  IT: ['RA000407'],                        // Italy - Registro Delle Imprese
  ES: ['RA000533', 'RA000780'],            // Spain - Registro Mercantil (local and central)
  PT: ['RA000487'],                        // Portugal - Registo Comercial
  LU: ['RA000432'],                        // Luxembourg - RCS
  AT: ['RA000017'],                        // Austria - Firmenbuch
  DK: ['RA000170'],                        // Denmark - CVR (Central Business Register)
  SE: ['RA000544'],                        // Sweden - Bolagsverket
  NO: ['RA000472', 'RA000473'],            // Norway - Brønnøysund (Foretaksregisteret / Enhetsregisteret)
  FI: ['RA000188'],                        // Finland - PRH (Patent and Registration Office)
  IE: ['RA000402'],                        // Ireland - CRO (Companies Registration Office)
  PL: ['RA000484'],                        // Poland - KRS (Krajowy Rejestr Sądowy)
  CZ: ['RA000163'],                        // Czech Republic - Obchodní rejstřík
  CH: ['RA000549', 'RA000548'],            // Switzerland - Handelsregister / UID-Register
  // Germany has ~100 local court RA codes (RA000197-RA000296), use country filter instead
  DE: ['RA000217', 'RA000234', 'RA000242', 'RA000254'], // DE - Berlin, Düsseldorf, Frankfurt, Hamburg (common ones)
};

/**
 * Legacy mapping for backwards compatibility - maps our identifier types to country codes
 * This is used to determine which country to filter by when searching GLEIF
 */
export const IDENTIFIER_TO_COUNTRY: Record<string, string> = {
  'KVK': 'NL',
  'HRB': 'DE',
  'HRA': 'DE',
  'KBO': 'BE',
  'BCE': 'BE',
  'RCS': 'FR',
  'SIREN': 'FR',
  'CRN': 'GB',
  'REA': 'IT',
  'CIF': 'ES',
  'CVR': 'DK',
  'CHR': 'CH',
  'KRS': 'PL',
};

/**
 * @deprecated Use GLEIF_RA_CODES instead. Kept for backwards compatibility.
 */
export const REGISTRATION_AUTHORITY_MAP: Record<string, string[]> = {
  NL: ['RA000463'],
  DE: ['RA000217', 'RA000234', 'RA000242', 'RA000254'],
  BE: ['RA000025'],
  FR: ['RA000192'],
  GB: ['RA000585'],
  IT: ['RA000407'],
  ES: ['RA000533'],
  PT: ['RA000487'],
  LU: ['RA000432'],
  AT: ['RA000017'],
  DK: ['RA000170'],
  SE: ['RA000544'],
  NO: ['RA000472'],
  FI: ['RA000188'],
  IE: ['RA000402'],
  PL: ['RA000484'],
  CZ: ['RA000163'],
  CH: ['RA000549'],
};

/**
 * Interface for GLEIF API LEI record
 *
 * Key fields:
 * - entity.registeredAs: Contains ONLY the identifier number (e.g., "33031431")
 * - entity.registeredAt.id: Contains the GLEIF RA code (e.g., "RA000463")
 */
interface GLEIFLeiRecord {
  type: 'lei-records';
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName: {
        name: string;
        language?: string;
      };
      registeredAs: string;
      /** The registration authority - contains the GLEIF RA code (e.g., "RA000463") */
      registeredAt: {
        id: string;
        other: string | null;
      };
      /** @deprecated Use registeredAt instead */
      registrationAuthority?: {
        id: string;
        other: string | null;
      };
      jurisdiction: string;
      legalAddress: {
        country: string;
        addressLines: string[];
        city: string;
        postalCode: string;
        region?: string;
        language?: string;
      };
      headquartersAddress: {
        country: string;
        addressLines: string[];
        city: string;
        postalCode: string;
        region?: string;
        language?: string;
      };
      status: string;
      category?: string;
    };
    registration: {
      registrationStatus: string;
      initialRegistrationDate?: string;
      registrationDate?: string;
      lastUpdateDate: string;
      nextRenewalDate?: string;
      managingLou?: string;
      corroborationLevel?: string;
      validatedAt?: {
        id: string;
        other: string | null;
      };
      validatedAs?: string;
    };
    bic?: string[];
    ocid?: string;
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
 * Fetches LEI from GLEIF API using registration number and country
 *
 * The GLEIF API expects:
 * - filter[entity.registeredAs]: Just the identifier number (e.g., "33031431")
 * - filter[entity.legalAddress.country]: Country code to narrow results (e.g., "NL")
 *
 * Note: The registeredAt.id filter (for RA codes) is not supported in combination
 * with registeredAs, so we use country filtering instead.
 *
 * @param registrationNumber - e.g., '33031431' (just the number, no authority prefix)
 * @param countryCode - e.g., 'NL', 'DE' - used to filter results by country
 * @param context - Azure Functions invocation context for logging
 * @returns LEI record if found, null otherwise
 */
async function fetchLeiFromGleif(
  registrationNumber: string,
  countryCode: string | null,
  context: InvocationContext
): Promise<GLEIFLeiRecord | null> {
  const url = `${GLEIF_API_BASE_URL}/lei-records`;

  // Build filter params - registeredAs is just the number
  const params: Record<string, string> = {
    'filter[entity.registeredAs]': registrationNumber,
  };

  // Add country filter if provided (helps narrow results for common numbers)
  if (countryCode) {
    params['filter[entity.legalAddress.country]'] = countryCode.toUpperCase();
  }

  context.log(`Querying GLEIF API: ${url}?filter[entity.registeredAs]=${registrationNumber}${countryCode ? `&filter[entity.legalAddress.country]=${countryCode}` : ''}`);

  try {
    const response = await axios.get<GLEIFResponse>(url, {
      params,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data.data && response.data.data.length > 0) {
      // If multiple results, try to find one matching the expected country
      if (response.data.data.length > 1 && countryCode) {
        const countryMatch = response.data.data.find(
          r => r.attributes.entity.legalAddress.country === countryCode.toUpperCase()
        );
        if (countryMatch) {
          context.log(`✓ Found LEI (matched by country ${countryCode}): ${countryMatch.attributes.lei}`);
          return countryMatch;
        }
      }

      context.log(`✓ Found LEI: ${response.data.data[0].attributes.lei}`);
      return response.data.data[0];
    }

    context.log(`✗ No LEI found for registeredAs=${registrationNumber}${countryCode ? ` in ${countryCode}` : ''}`);
    return null;

  } catch (error: any) {
    if (error.response) {
      // Axios error with response
      if (error.response.status === 404) {
        context.log(`✗ No LEI found for registeredAs=${registrationNumber} (404)`);
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
 * 1. Searches GLEIF by registration number (registeredAs field)
 * 2. Uses country code to narrow results
 * 3. Returns the matching LEI if found
 *
 * Note: The GLEIF API's registeredAs field contains ONLY the identifier number,
 * not a combined "authority/number" format.
 *
 * @param registrationNumber - Organization's registration number (e.g., '33031431' for KvK)
 * @param countryCode - Two-letter country code (e.g., 'NL', 'DE')
 * @param identifierType - Type of identifier (e.g., 'KVK', 'HRB') - used for logging
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

  context.log(`Fetching LEI for ${identifierType} ${registrationNumber} in ${upperCountryCode}`);

  try {
    // Search GLEIF by registration number and country
    const record = await fetchLeiFromGleif(registrationNumber, upperCountryCode, context);

    if (record) {
      // Extract the RA code from the response for logging/storage
      const raCode = record.attributes.entity.registeredAt?.id || null;

      return {
        lei: record.attributes.lei,
        legal_name: record.attributes.entity.legalName.name,
        registration_authority: raCode,
        registration_number: record.attributes.entity.registeredAs || registrationNumber,
        country: record.attributes.entity.legalAddress.country,
        status: 'found',
        attempts: 1,
        message: `LEI found for ${identifierType} ${registrationNumber}${raCode ? ` (RA: ${raCode})` : ''}`,
        gleif_response: record,
      };
    }

    return {
      lei: null,
      legal_name: null,
      registration_authority: null,
      registration_number: null,
      country: null,
      status: 'not_found',
      attempts: 1,
      message: `No LEI found for ${identifierType} ${registrationNumber} in ${upperCountryCode}`,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    context.warn(`Failed to fetch LEI for ${identifierType} ${registrationNumber}: ${errorMsg}`);

    return {
      lei: null,
      legal_name: null,
      registration_authority: null,
      registration_number: null,
      country: null,
      status: 'error',
      attempts: 1,
      message: `Error fetching LEI: ${errorMsg}`,
    };
  }
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
        registration_authority: record.attributes.entity.registeredAt?.id || null,
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
        registration_authority: exactMatch.attributes.entity.registeredAt?.id || null,
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
        registration_authority: startsWithMatch.attributes.entity.registeredAt?.id || null,
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
    entity.legalName?.language || null, // legal_name_language
    entity.jurisdiction || entity.legalAddress?.country || null,
    entity.registeredAs || null,
    entity.registeredAt?.id || null, // GLEIF RA code (e.g., "RA000463")
    entity.legalAddress ? JSON.stringify(entity.legalAddress) : null,
    entity.headquartersAddress ? JSON.stringify(entity.headquartersAddress) : null,
    entity.status || null, // entity_status
    registration?.initialRegistrationDate ? new Date(registration.initialRegistrationDate) : null,
    registration?.lastUpdateDate ? new Date(registration.lastUpdateDate) : null,
    registration?.nextRenewalDate ? new Date(registration.nextRenewalDate) : null,
    registration?.registrationStatus || null,
    registration?.managingLou || null, // managing_lou
    JSON.stringify(gleifRecord)
  ]);

  console.log(`Stored GLEIF registry data for legal entity ${legalEntityId}, LEI: ${gleifRecord.attributes.lei}`);
}

// Re-export the GLEIFLeiRecord type for external use
export type { GLEIFLeiRecord };
