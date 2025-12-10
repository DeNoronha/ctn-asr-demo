/**
 * Peppol Directory Service
 *
 * Service for retrieving company information from the Peppol Directory API.
 * Peppol is the Pan-European Public Procurement Online network for e-invoicing.
 *
 * @see https://directory.peppol.eu/public/locale-en_US/menuitem-docs-rest-api
 */

import axios from 'axios';

const PEPPOL_DIRECTORY_BASE_URL = 'https://directory.peppol.eu/search/1.0/json';

// Rate limit: 2 queries per second (500ms minimum between requests)
const MIN_REQUEST_INTERVAL_MS = 500;
let lastRequestTime = 0;

/**
 * Peppol identifier scheme codes mapped to identifier types
 * @see https://docs.peppol.eu/edelivery/codelists/
 */
export const PEPPOL_IDENTIFIER_SCHEMES: Record<string, string> = {
  // Netherlands
  'KVK': '0106',           // NL Chamber of Commerce (KvK)
  'VAT_NL': '9944',        // NL VAT number
  'OIN': '0190',           // NL Organization Identification Number

  // Belgium
  'KBO': '0208',           // BE Crossroads Bank for Enterprises
  'VAT_BE': '9925',        // BE VAT number

  // Germany
  'LWID': '9930',          // DE Leitweg-ID (public sector)
  'VAT_DE': '9930',        // DE VAT number

  // France
  'SIRET': '0009',         // FR SIRET
  'VAT_FR': '9957',        // FR VAT number

  // United Kingdom
  'CRN': '0088',           // UK Companies House
  'VAT_GB': '9932',        // GB VAT number

  // Italy
  'CF': '9906',            // IT Codice Fiscale
  'VAT_IT': '9906',        // IT VAT number

  // Spain
  'VAT_ES': '9920',        // ES VAT number

  // Sweden
  'ORGNR_SE': '0007',      // SE Organization number
  'VAT_SE': '9955',        // SE VAT number

  // Denmark
  'CVR': '0184',           // DK CVR number
  'VAT_DK': '9902',        // DK VAT number

  // Norway
  'ORGNR_NO': '0192',      // NO Organization number
  'VAT_NO': '9908',        // NO VAT number

  // Finland
  'OVT': '0037',           // FI OVT code
  'VAT_FI': '9917',        // FI VAT number

  // Austria
  'VAT_AT': '9914',        // AT VAT number

  // Poland
  'VAT_PL': '9945',        // PL VAT number

  // Portugal
  'VAT_PT': '9946',        // PT VAT number

  // Ireland
  'VAT_IE': '9928',        // IE VAT number

  // Luxembourg
  'VAT_LU': '9936',        // LU VAT number
};

/**
 * Reverse mapping: scheme code to identifier type
 */
export const SCHEME_TO_IDENTIFIER_TYPE: Record<string, string> = Object.entries(
  PEPPOL_IDENTIFIER_SCHEMES
).reduce((acc, [type, scheme]) => {
  acc[scheme] = type;
  return acc;
}, {} as Record<string, string>);

/**
 * Interface for a Peppol participant entity
 */
export interface PeppolEntity {
  name: Array<{ name: string; language?: string }>;
  countryCode?: string;
  geoInfo?: string;
  identifiers?: Array<{ scheme: string; value: string }>;
  websites?: string[];
  contacts?: Array<{ type?: string; name?: string; phone?: string; email?: string }>;
  additionalInfo?: string;
  regDate?: string;
}

/**
 * Interface for a Peppol participant record
 */
export interface PeppolParticipant {
  participantID: {
    scheme: string;
    value: string;
  };
  docTypes?: Array<{
    scheme: string;
    value: string;
  }>;
  entities?: PeppolEntity[];
}

/**
 * Interface for Peppol Directory API response
 */
interface PeppolDirectoryResponse {
  version: string;
  'total-result-count': number;
  'used-result-count': number;
  'result-page-index': number;
  'result-page-count': number;
  'first-result-index': number;
  'last-result-index': number;
  'query-terms': string;
  'creation-dt': string;
  matches?: PeppolParticipant[];
}

/**
 * Interface for Peppol fetch result
 */
export interface PeppolFetchResult {
  participant_id: string | null;
  participant_scheme: string | null;
  participant_value: string | null;
  entity_name: string | null;
  country: string | null;
  registration_date: string | null;
  additional_identifiers: Array<{ scheme: string; value: string }>;
  document_types: Array<{ scheme: string; value: string }>;
  websites: string[];
  contacts: Array<{ type?: string; name?: string; phone?: string; email?: string }>;
  geo_info: string | null;
  additional_info: string | null;
  status: 'found' | 'not_found' | 'error';
  message: string;
  peppol_response?: PeppolParticipant;
}

/**
 * Rate limiter to ensure we don't exceed 2 requests per second
 */
async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Creates an empty/not found result
 */
function createNotFoundResult(message: string): PeppolFetchResult {
  return {
    participant_id: null,
    participant_scheme: null,
    participant_value: null,
    entity_name: null,
    country: null,
    registration_date: null,
    additional_identifiers: [],
    document_types: [],
    websites: [],
    contacts: [],
    geo_info: null,
    additional_info: null,
    status: 'not_found',
    message,
  };
}

/**
 * Creates an error result
 */
function createErrorResult(message: string): PeppolFetchResult {
  return {
    ...createNotFoundResult(message),
    status: 'error',
  };
}

/**
 * Parses a Peppol participant into a standardized result
 */
function parsePeppolParticipant(participant: PeppolParticipant): PeppolFetchResult {
  const entity = participant.entities?.[0];
  const fullParticipantId = `${participant.participantID.scheme}::${participant.participantID.value}`;

  return {
    participant_id: fullParticipantId,
    participant_scheme: participant.participantID.scheme,
    participant_value: participant.participantID.value,
    entity_name: entity?.name?.[0]?.name || null,
    country: entity?.countryCode || null,
    registration_date: entity?.regDate || null,
    additional_identifiers: entity?.identifiers || [],
    document_types: participant.docTypes || [],
    websites: entity?.websites || [],
    contacts: entity?.contacts || [],
    geo_info: entity?.geoInfo || null,
    additional_info: entity?.additionalInfo || null,
    status: 'found',
    message: 'Peppol participant found',
    peppol_response: participant,
  };
}

/**
 * Fetches from Peppol Directory API with given parameters
 *
 * @param params - Query parameters for the API
 * @returns Peppol fetch result
 */
async function fetchFromPeppolDirectory(
  params: Record<string, string>
): Promise<PeppolFetchResult> {
  await rateLimitDelay();

  try {
    const response = await axios.get<PeppolDirectoryResponse>(PEPPOL_DIRECTORY_BASE_URL, {
      params,
      headers: {
        Accept: 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;

    if (!data.matches || data.matches.length === 0) {
      return createNotFoundResult('No Peppol participant found for the given criteria');
    }

    // Return first match
    return parsePeppolParticipant(data.matches[0]);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number }; message?: string; isAxiosError?: boolean };
    if (axiosError.isAxiosError || axiosError.response) {
      if (axiosError.response?.status === 429) {
        return createErrorResult('Peppol Directory rate limit exceeded. Please try again later.');
      }
      if (axiosError.response?.status === 405) {
        return createErrorResult('Invalid request method to Peppol Directory API');
      }
      return createErrorResult(`Peppol Directory API error: ${axiosError.response?.status || axiosError.message || 'Unknown'}`);
    }
    return createErrorResult(`Unexpected error querying Peppol Directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches Peppol participant by identifier scheme and value
 *
 * @param schemeCode - Peppol scheme code (e.g., '0106' for KVK)
 * @param value - Identifier value (e.g., '12345678')
 * @returns Peppol fetch result
 */
export async function fetchPeppolByIdentifier(
  schemeCode: string,
  value: string
): Promise<PeppolFetchResult> {
  console.log(`[PeppolService] Searching by identifier: scheme=${schemeCode}, value=${value}`);

  return fetchFromPeppolDirectory({
    identifierScheme: schemeCode,
    identifierValue: value,
  });
}

/**
 * Fetches Peppol participant by KVK number (Netherlands)
 *
 * @param kvkNumber - Dutch KvK number (8 digits)
 * @returns Peppol fetch result
 */
export async function fetchPeppolByKvk(kvkNumber: string): Promise<PeppolFetchResult> {
  const cleanedKvk = kvkNumber.replace(/\s+/g, '');
  console.log(`[PeppolService] Searching by KVK: ${cleanedKvk}`);

  return fetchPeppolByIdentifier(PEPPOL_IDENTIFIER_SCHEMES.KVK, cleanedKvk);
}

/**
 * Fetches Peppol participant by company name and country
 *
 * @param name - Company name (minimum 3 characters)
 * @param countryCode - Two-letter ISO country code
 * @returns Peppol fetch result
 */
export async function fetchPeppolByName(
  name: string,
  countryCode: string
): Promise<PeppolFetchResult> {
  if (name.length < 3) {
    return createErrorResult('Company name must be at least 3 characters for Peppol search');
  }

  console.log(`[PeppolService] Searching by name: "${name}" in country: ${countryCode}`);

  return fetchFromPeppolDirectory({
    name: name,
    country: countryCode.toUpperCase(),
  });
}

/**
 * Fetches Peppol participant for an organization using available identifiers
 * Tries identifier-based search first, then falls back to name search
 *
 * @param identifierType - Type of identifier (e.g., 'KVK', 'VAT_NL')
 * @param identifierValue - Identifier value
 * @param companyName - Company name for fallback search
 * @param countryCode - Country code
 * @returns Peppol fetch result
 */
export async function fetchPeppolForOrganization(
  identifierType: string,
  identifierValue: string,
  companyName?: string,
  countryCode?: string
): Promise<PeppolFetchResult> {
  // Try identifier search first
  const schemeCode = PEPPOL_IDENTIFIER_SCHEMES[identifierType];

  if (schemeCode) {
    console.log(`[PeppolService] Attempting identifier search: ${identifierType} -> scheme ${schemeCode}`);
    const result = await fetchPeppolByIdentifier(schemeCode, identifierValue);

    if (result.status === 'found') {
      return result;
    }
    console.log(`[PeppolService] Identifier search returned: ${result.status}`);
  } else {
    console.log(`[PeppolService] No Peppol scheme mapping for identifier type: ${identifierType}`);
  }

  // Fallback to name search if company name and country provided
  if (companyName && countryCode) {
    console.log(`[PeppolService] Falling back to name search: "${companyName}" in ${countryCode}`);
    const nameResult = await fetchPeppolByName(companyName, countryCode);

    if (nameResult.status === 'found') {
      nameResult.message = 'Peppol participant found via company name search (identifier not found)';
      return nameResult;
    }
  }

  return createNotFoundResult(
    `No Peppol participant found for ${identifierType}: ${identifierValue}${companyName ? ` or company name: ${companyName}` : ''}`
  );
}

/**
 * Validates Peppol participant ID format
 * Format: scheme::value (e.g., "iso6523-actorid-upis::0106:12345678")
 */
export function isValidPeppolIdFormat(peppolId: string): boolean {
  // Basic format: scheme::scheme_code:identifier
  return /^[a-z0-9-]+::[0-9]{4}:[A-Za-z0-9]+$/.test(peppolId.trim());
}

/**
 * Parses a full Peppol participant ID into its components
 */
export function parsePeppolId(peppolId: string): { scheme: string; value: string } | null {
  const match = peppolId.match(/^([a-z0-9-]+)::(.+)$/);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    value: match[2],
  };
}

/**
 * Gets the Peppol scheme code for an identifier type
 */
export function getSchemeCodeForIdentifierType(identifierType: string): string | null {
  return PEPPOL_IDENTIFIER_SCHEMES[identifierType] || null;
}

/**
 * Gets supported countries for Peppol integration
 */
export function getSupportedCountries(): string[] {
  // Countries with at least one scheme mapping
  return ['NL', 'BE', 'DE', 'FR', 'GB', 'IT', 'ES', 'SE', 'DK', 'NO', 'FI', 'AT', 'PL', 'PT', 'IE', 'LU'];
}
