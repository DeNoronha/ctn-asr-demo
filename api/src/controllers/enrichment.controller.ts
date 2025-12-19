/**
 * Enrichment Controller
 *
 * Handles unified enrichment operations for legal entities.
 * Fetches identifiers from multiple registries (KVK, LEI, Peppol, VIES, etc.)
 *
 * @module controllers/enrichment
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// UNIFIED ENRICHMENT
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/enrich
 * Comprehensive enrichment that fetches all possible identifiers.
 *
 * Country-specific flows:
 * - NL: KVK → RSIN → VAT (derived) → VIES validation
 * - DE: Handelsregister → HRB/HRA → EUID generation
 *
 * Global:
 * - LEI from GLEIF (all countries)
 * - Peppol from directory (if KVK available)
 * - Branding/logo from domain
 */
export async function enrichLegalEntity(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const { legalentityid } = req.params;

  try {
    // Use extracted enrichment service
    const { enrichLegalEntity: enrichFn, formatEnrichmentResponse } = await import('../services/enrichment');
    const summary = await enrichFn(pool, legalentityid);
    res.json(formatEnrichmentResponse(summary));
  } catch (error: any) {
    console.error('Enrichment error:', {
      legalEntityId: legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Enrichment failed',
      detail: error.message
    });
  }
}
