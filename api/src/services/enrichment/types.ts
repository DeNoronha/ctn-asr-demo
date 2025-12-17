/**
 * Enrichment Service Types
 *
 * Shared types for the enrichment service modules.
 */

import { Pool } from 'pg';

/**
 * Result of an individual enrichment operation
 */
export interface EnrichmentResult {
  identifier: string;
  status: 'added' | 'exists' | 'error' | 'not_available';
  value?: string;
  message?: string;
}

/**
 * Context passed to enrichment services
 */
export interface EnrichmentContext {
  pool: Pool;
  legalEntityId: string;
  companyName: string | null;
  countryCode: string;
  existingIdentifiers: ExistingIdentifier[];
  existingTypes: Set<string>;
}

/**
 * Existing identifier from database
 */
export interface ExistingIdentifier {
  identifier_type: string;
  identifier_value: string;
  registry_name?: string;
}

/**
 * Summary of enrichment operation
 */
export interface EnrichmentSummary {
  results: EnrichmentResult[];
  companyDetailsUpdated: boolean;
  updatedFields: string[];
  logoFetched: boolean;
  logoUrl: string | null;
  germanRegistryFetched: boolean;
  belgiumRegistryFetched: boolean;
}

/**
 * Helper to get value of an existing identifier
 */
export function getExistingValue(
  existingIdentifiers: ExistingIdentifier[],
  type: string
): string | undefined {
  return existingIdentifiers.find(r => r.identifier_type === type)?.identifier_value;
}
