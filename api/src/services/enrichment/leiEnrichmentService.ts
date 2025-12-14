/**
 * LEI Enrichment Service
 *
 * Handles LEI lookup from GLEIF for ALL countries:
 * 1. Search by Chamber of Commerce / registration number first (all countries)
 * 2. Fallback to company name + city search
 * 3. Store LEI identifier
 * 4. Store GLEIF registry data
 *
 * Supported CoC identifiers:
 * - NL: KVK (NL-KVK)
 * - DE: HRB/HRA (DE-HRB, DE-HRA)
 * - BE: KBO/BCE (BE-BCE)
 * - FR: RCS (FR-RCS)
 * - GB: CRN (GB-COH)
 * - And many more via REGISTRATION_AUTHORITY_MAP in leiService.ts
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';

// Map of identifier types to GLEIF registration authority prefixes
const IDENTIFIER_TO_AUTHORITY: Record<string, string> = {
  'KVK': 'NL-KVK',
  'HRB': 'DE-HRB',
  'HRA': 'DE-HRA',
  'KBO': 'BE-BCE',
  'BCE': 'BE-BCE',
  'RCS': 'FR-RCS',
  'SIREN': 'FR-RCS',
  'CRN': 'GB-COH',
  'REA': 'IT-REA',
  'CIF': 'ES-CIF',
  'CVR': 'DK-CVR',
  'CHR': 'CH-CHRB',
};

/**
 * Enrich with LEI from GLEIF - works for ALL countries
 *
 * Flow:
 * 1. Check if LEI already exists
 * 2. Find any available CoC/registration number (KVK, HRB, KBO, CRN, etc.)
 * 3. Search GLEIF by registration authority + number
 * 4. Fallback to company name search
 * 5. Store LEI identifier and GLEIF registry data
 */
export async function enrichLei(ctx: EnrichmentContext): Promise<EnrichmentResult> {
  const { pool, legalEntityId, companyName, countryCode, existingIdentifiers, existingTypes } = ctx;

  // Check if LEI already exists
  if (existingTypes.has('LEI')) {
    return {
      identifier: 'LEI',
      status: 'exists',
      value: getExistingValue(existingIdentifiers, 'LEI')
    };
  }

  // Find any Chamber of Commerce / registration number for GLEIF lookup
  const cocIdentifier = findCocIdentifier(existingIdentifiers);

  // Need either a registration number or company name for search
  if (!cocIdentifier && !companyName) {
    return {
      identifier: 'LEI',
      status: 'not_available',
      message: 'No Chamber of Commerce number or company name available for LEI search'
    };
  }

  try {
    const { fetchLeiForOrganizationWithNameFallback, searchLeiByCompanyName } = await import('../leiService');

    // Create mock context for legacy service
    const mockContext = {
      log: (...args: any[]) => console.log('[LEI Service]', ...args),
      warn: (...args: any[]) => console.warn('[LEI Service]', ...args),
      error: (...args: any[]) => console.error('[LEI Service]', ...args),
    } as any;

    let leiResult: any = null;

    // Search by CoC/registration number first (all countries)
    if (cocIdentifier) {
      console.log(`[LEI Enrichment] Searching by ${cocIdentifier.type}: ${cocIdentifier.value}`);
      leiResult = await fetchLeiForOrganizationWithNameFallback(
        cocIdentifier.cleanValue,
        countryCode,
        cocIdentifier.type,
        companyName,
        mockContext
      );
    } else if (companyName) {
      // Only have company name - search directly
      const nameResults = await searchLeiByCompanyName(companyName, countryCode, mockContext);

      if (nameResults.length === 1) {
        const record = nameResults[0];
        leiResult = {
          lei: record.attributes.lei,
          legal_name: record.attributes.entity.legalName.name,
          status: 'found' as const,
          attempts: 1,
          message: 'LEI found via company name search (single match)',
          gleif_response: record,
        };
      } else if (nameResults.length > 1) {
        // Try exact match
        const normalizedSearchName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const exactMatch = nameResults.find(record => {
          const recordName = record.attributes.entity.legalName.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return recordName === normalizedSearchName;
        });

        if (exactMatch) {
          leiResult = {
            lei: exactMatch.attributes.lei,
            legal_name: exactMatch.attributes.entity.legalName.name,
            status: 'found' as const,
            attempts: 1,
            message: 'LEI found via company name search (exact match)',
            gleif_response: exactMatch,
          };
        } else {
          leiResult = {
            lei: null,
            status: 'not_found' as const,
            attempts: 1,
            message: `Name search found ${nameResults.length} results but no exact match for "${companyName}"`,
          };
        }
      } else {
        leiResult = {
          lei: null,
          status: 'not_found' as const,
          attempts: 1,
          message: `No LEI found for company name "${companyName}"`,
        };
      }
    }

    if (leiResult?.status === 'found' && leiResult.lei) {
      // Store LEI identifier
      await pool.query(`
        INSERT INTO legal_entity_number (
          legal_entity_reference_id, legal_entity_id,
          identifier_type, identifier_value,
          validation_status, registry_name, registry_url,
          dt_created, dt_modified
        )
        VALUES ($1, $2, 'LEI', $3, 'VERIFIED', 'GLEIF', 'https://www.gleif.org/', NOW(), NOW())
      `, [randomUUID(), legalEntityId, leiResult.lei]);

      // Store GLEIF registry data if available
      if (leiResult.gleif_response) {
        try {
          const { storeGleifRegistryData } = await import('../leiService');
          await storeGleifRegistryData(pool, legalEntityId, leiResult.gleif_response);
          console.log('[LEI Enrichment] Stored GLEIF registry data for LEI:', leiResult.lei);
        } catch (gleifStoreError: any) {
          console.warn('[LEI Enrichment] Failed to store GLEIF registry data:', gleifStoreError.message);
        }
      }

      return {
        identifier: 'LEI',
        status: 'added',
        value: leiResult.lei,
        message: leiResult.message
      };
    } else {
      return {
        identifier: 'LEI',
        status: 'not_available',
        message: leiResult?.message || 'No LEI found in GLEIF'
      };
    }
  } catch (leiError: any) {
    console.warn('[LEI Enrichment] LEI fetch failed:', leiError.message);
    return { identifier: 'LEI', status: 'error', message: leiError.message };
  }
}

/**
 * Find any Chamber of Commerce / registration identifier that can be used for GLEIF lookup
 * Priority: KVK (NL) > HRB/HRA (DE) > KBO (BE) > CRN (GB) > other CoC numbers
 */
function findCocIdentifier(existingIdentifiers: Array<{ identifier_type: string; identifier_value: string }>): {
  type: string;
  value: string;
  cleanValue: string;
} | null {
  // Priority list of identifier types for GLEIF lookup
  const priorityOrder = ['KVK', 'HRB', 'HRA', 'KBO', 'BCE', 'CRN', 'RCS', 'SIREN', 'REA', 'CIF', 'CVR', 'CHR'];

  for (const idType of priorityOrder) {
    const found = existingIdentifiers.find(i =>
      i.identifier_type === idType && i.identifier_value
    );
    if (found) {
      // Clean the value - extract just the number for HRB/HRA
      let cleanValue = found.identifier_value;
      if (idType === 'HRB' || idType === 'HRA') {
        const match = found.identifier_value.match(/(\d+)/);
        if (match) cleanValue = match[1];
      }
      return {
        type: idType,
        value: found.identifier_value,
        cleanValue
      };
    }
  }

  return null;
}
