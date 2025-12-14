/**
 * Peppol Enrichment Service
 *
 * Handles Peppol participant lookup from Peppol Directory for ALL countries.
 * Uses available CoC/registration identifiers or VAT numbers.
 *
 * Supported identifiers (see peppolService.ts PEPPOL_IDENTIFIER_SCHEMES):
 * - NL: KVK (0106), VAT (9944), OIN (0190)
 * - BE: KBO (0208), VAT (9925)
 * - DE: LWID (9930), VAT (9930)
 * - FR: SIRET (0009), VAT (9957)
 * - GB: CRN (0088), VAT (9932)
 * - IT: CF (9906), VAT (9906)
 * - And many more EU countries...
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';

// Map of identifier types to Peppol scheme codes
const IDENTIFIER_TO_PEPPOL_SCHEME: Record<string, string> = {
  'KVK': '0106',    // NL Chamber of Commerce
  'KBO': '0208',    // BE Crossroads Bank
  'BCE': '0208',    // BE (French name)
  'CRN': '0088',    // UK Companies House
  'SIRET': '0009',  // FR SIRET
  'CVR': '0184',    // DK CVR
  'VAT': '9944',    // Generic VAT (NL default, adjusted per country)
};

// VAT scheme codes by country
const VAT_SCHEME_BY_COUNTRY: Record<string, string> = {
  'NL': '9944', 'BE': '9925', 'DE': '9930', 'FR': '9957',
  'GB': '9932', 'IT': '9906', 'ES': '9920', 'SE': '9955',
  'DK': '9902', 'NO': '9908', 'FI': '9917', 'AT': '9914',
  'PL': '9945', 'PT': '9946', 'IE': '9928', 'LU': '9936',
};

/**
 * Enrich with Peppol participant ID - works for ALL EU countries
 *
 * Flow:
 * 1. Check if PEPPOL already exists
 * 2. Find any supported identifier (KVK, KBO, CRN, VAT, etc.)
 * 3. Query Peppol Directory by identifier
 * 4. Fallback to company name search
 * 5. Store PEPPOL identifier if found
 */
export async function enrichPeppol(ctx: EnrichmentContext): Promise<EnrichmentResult> {
  const { pool, legalEntityId, companyName, countryCode, existingIdentifiers, existingTypes } = ctx;

  // Check if PEPPOL already exists
  if (existingTypes.has('PEPPOL')) {
    return {
      identifier: 'PEPPOL',
      status: 'exists',
      value: getExistingValue(existingIdentifiers, 'PEPPOL')
    };
  }

  // Find any supported identifier for Peppol lookup
  const peppolIdentifier = findPeppolIdentifier(existingIdentifiers, countryCode);

  // Need either an identifier or company name for search
  if (!peppolIdentifier && !companyName) {
    return {
      identifier: 'PEPPOL',
      status: 'not_available',
      message: 'No supported identifier or company name available for Peppol lookup'
    };
  }

  try {
    const { fetchPeppolForOrganization, fetchPeppolByName } = await import('../peppolService');

    let peppolResult: any = null;

    // Search by identifier first
    if (peppolIdentifier) {
      console.log(`[Peppol Enrichment] Searching by ${peppolIdentifier.type}: ${peppolIdentifier.value}`);
      peppolResult = await fetchPeppolForOrganization(
        peppolIdentifier.type,
        peppolIdentifier.value,
        companyName || undefined,
        countryCode
      );
    } else if (companyName) {
      // Fallback to name search
      console.log(`[Peppol Enrichment] Searching by name: ${companyName} (${countryCode})`);
      peppolResult = await fetchPeppolByName(companyName, countryCode);
    }

    if (peppolResult.status === 'found' && peppolResult.participant_id) {
      await pool.query(`
        INSERT INTO legal_entity_number (
          legal_entity_reference_id, legal_entity_id,
          identifier_type, identifier_value,
          validation_status, registry_name, registry_url,
          dt_created, dt_modified
        )
        VALUES ($1, $2, 'PEPPOL', $3, 'VERIFIED', 'Peppol Directory', 'https://directory.peppol.eu/', NOW(), NOW())
      `, [randomUUID(), legalEntityId, peppolResult.participant_id]);

      return {
        identifier: 'PEPPOL',
        status: 'added',
        value: peppolResult.participant_id
      };
    } else {
      return {
        identifier: 'PEPPOL',
        status: 'not_available',
        message: 'No Peppol participant found'
      };
    }
  } catch (peppolError: any) {
    console.warn('[Peppol Enrichment] Peppol fetch failed:', peppolError.message);
    return { identifier: 'PEPPOL', status: 'error', message: peppolError.message };
  }
}

/**
 * Find any supported identifier for Peppol lookup
 * Priority: KVK > KBO > CRN > VAT > other CoC numbers
 */
function findPeppolIdentifier(
  existingIdentifiers: Array<{ identifier_type: string; identifier_value: string }>,
  countryCode: string
): { type: string; value: string } | null {
  // Priority list of identifier types for Peppol lookup
  const priorityOrder = ['KVK', 'KBO', 'BCE', 'CRN', 'SIRET', 'CVR', 'VAT'];

  for (const idType of priorityOrder) {
    const found = existingIdentifiers.find(i =>
      i.identifier_type === idType && i.identifier_value
    );
    if (found) {
      // For VAT, we need to use the country-specific scheme
      // The type is used to look up the scheme in peppolService
      return {
        type: idType === 'VAT' ? `VAT_${countryCode}` : idType,
        value: found.identifier_value
      };
    }
  }

  return null;
}
