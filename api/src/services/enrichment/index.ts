/**
 * Enrichment Service - Main Orchestrator
 *
 * Coordinates all enrichment operations for legal entities:
 * - NL: KVK → RSIN → VAT → VIES
 * - DE: Handelsregister → HRB
 * - ALL EU: EUID generation (from national identifiers)
 * - Global: LEI (GLEIF), Peppol, Branding
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { Pool } from 'pg';
import { EnrichmentContext, EnrichmentResult, EnrichmentSummary, ExistingIdentifier } from './types';
import { enrichRsin, enrichVat, ensureKvkRegistryData, updateLegalEntityFromKvk } from './nlEnrichmentService';
import { enrichGermanRegistry } from './deEnrichmentService';
import { enrichLei } from './leiEnrichmentService';
import { enrichPeppol } from './peppolEnrichmentService';
import { enrichBranding } from './brandingService';
import { enrichEuid } from './euidEnrichmentService';

// Re-export types
export * from './types';

/**
 * Main enrichment function
 *
 * Performs comprehensive enrichment based on country code:
 * 1. NL: RSIN from KVK → VAT derivation → VIES validation
 * 2. DE: Handelsregister → HRB/HRA
 * 3. ALL EU: EUID generation from national identifiers
 * 4. Global: LEI from GLEIF, Peppol lookup, branding
 *
 * @param pool - PostgreSQL connection pool
 * @param legalEntityId - UUID of the legal entity to enrich
 * @returns EnrichmentSummary with all results
 */
export async function enrichLegalEntity(
  pool: Pool,
  legalEntityId: string
): Promise<EnrichmentSummary> {
  console.log('[Enrichment] Starting enrichment for legal entity:', legalEntityId);

  const results: EnrichmentResult[] = [];

  // Get legal entity details
  const { rows: legalEntityRows } = await pool.query(`
    SELECT primary_legal_name, country_code
    FROM legal_entity
    WHERE legal_entity_id = $1 AND is_deleted = false
  `, [legalEntityId]);

  if (legalEntityRows.length === 0) {
    throw new Error('Legal entity not found');
  }

  const companyName = legalEntityRows[0]?.primary_legal_name || null;
  const countryCode = legalEntityRows[0]?.country_code || 'NL';
  console.log('[Enrichment] Company:', companyName, 'Country:', countryCode);

  // Get existing identifiers
  const { rows: existingIdentifiers } = await pool.query<ExistingIdentifier>(`
    SELECT identifier_type, identifier_value, registry_name
    FROM legal_entity_number
    WHERE legal_entity_id = $1 AND is_deleted = false
  `, [legalEntityId]);

  const existingTypes = new Set(existingIdentifiers.map(r => r.identifier_type));

  // Build context
  const ctx: EnrichmentContext = {
    pool,
    legalEntityId,
    companyName,
    countryCode,
    existingIdentifiers,
    existingTypes
  };

  // =========================================================================
  // 1. Dutch-specific enrichment (NL)
  // =========================================================================
  let rsin: string | null = null;

  if (countryCode === 'NL') {
    // RSIN from KVK
    const rsinResult = await enrichRsin(ctx);
    rsin = rsinResult.rsin;
    if (rsinResult.result) {
      results.push(rsinResult.result);
    }
  }

  // VAT derivation (works for NL with RSIN, shows message for others)
  const vatResult = await enrichVat(ctx, rsin);
  results.push(vatResult);

  // =========================================================================
  // 2. German-specific enrichment (DE)
  // =========================================================================
  let germanRegistryFetched = false;

  if (countryCode === 'DE') {
    const deResults = await enrichGermanRegistry(ctx);
    // Filter out EUID from DE results - we'll handle it in the generic EUID step
    const deResultsWithoutEuid = deResults.filter(r => r.identifier !== 'EUID');
    results.push(...deResultsWithoutEuid);
    germanRegistryFetched = deResultsWithoutEuid.some(r => r.status === 'added');
  }

  // =========================================================================
  // 3. EUID generation (ALL EU countries)
  // =========================================================================
  const euidResult = await enrichEuid(ctx);
  results.push(euidResult);

  // =========================================================================
  // 4. Global enrichment (all countries)
  // =========================================================================

  // LEI from GLEIF
  const leiResult = await enrichLei(ctx);
  results.push(leiResult);

  // Peppol (if KVK available)
  const peppolResult = await enrichPeppol(ctx);
  results.push(peppolResult);

  // =========================================================================
  // 5. Ensure KVK registry data exists (NL)
  // =========================================================================
  if (countryCode === 'NL') {
    await ensureKvkRegistryData(ctx);
  }

  // =========================================================================
  // 6. Update legal_entity with registry data
  // =========================================================================
  let companyDetailsUpdated = false;
  let updatedFields: string[] = [];

  if (countryCode === 'NL') {
    const updateResult = await updateLegalEntityFromKvk(ctx);
    companyDetailsUpdated = updateResult.updated;
    updatedFields = updateResult.fields;
  }

  // =========================================================================
  // 7. Branding (logo from domain)
  // =========================================================================
  const brandingResult = await enrichBranding(ctx);

  // =========================================================================
  // Summary
  // =========================================================================
  const added = results.filter(r => r.status === 'added');
  const exists = results.filter(r => r.status === 'exists');
  const notAvailable = results.filter(r => r.status === 'not_available');
  const errors = results.filter(r => r.status === 'error');

  console.log('[Enrichment] Completed:', {
    legalEntityId,
    added: added.map(r => r.identifier),
    exists: exists.map(r => r.identifier),
    notAvailable: notAvailable.map(r => r.identifier),
    errors: errors.map(r => r.identifier),
    companyDetailsUpdated,
    updatedFields,
    logoFetched: brandingResult.fetched,
    germanRegistryFetched
  });

  return {
    results,
    companyDetailsUpdated,
    updatedFields,
    logoFetched: brandingResult.fetched,
    logoUrl: brandingResult.logoUrl,
    germanRegistryFetched
  };
}

/**
 * Format enrichment summary for API response
 */
export function formatEnrichmentResponse(summary: EnrichmentSummary): any {
  const { results, companyDetailsUpdated, updatedFields, logoFetched, logoUrl, germanRegistryFetched } = summary;

  const added = results.filter(r => r.status === 'added');
  const exists = results.filter(r => r.status === 'exists');
  const notAvailable = results.filter(r => r.status === 'not_available');
  const errors = results.filter(r => r.status === 'error');

  return {
    success: true,
    added_count: added.length,
    company_details_updated: companyDetailsUpdated,
    updated_fields: updatedFields,
    logo_fetched: logoFetched,
    logo_url: logoUrl,
    german_registry_fetched: germanRegistryFetched,
    results,
    summary: {
      added: added.map(r => `${r.identifier}: ${r.value}`),
      already_exists: exists.map(r => r.identifier),
      not_available: notAvailable.map(r => `${r.identifier} (${r.message})`),
      errors: errors.map(r => `${r.identifier}: ${r.message}`),
      company_fields_updated: companyDetailsUpdated ? updatedFields : [],
      branding: logoFetched ? 'Logo fetched from domain' : (logoUrl ? 'Logo already exists' : 'No domain available')
    }
  };
}
