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
