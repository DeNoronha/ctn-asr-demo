/**
 * Enrichment Routes
 *
 * Routes for unified legal entity enrichment operations.
 * Fetches identifiers from multiple registries.
 *
 * Routes:
 * - POST /v1/legal-entities/:legalentityid/enrich - Comprehensive enrichment
 *
 * @module routes/v1/enrichment
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as enrichmentController from '../../controllers/enrichment.controller';

const router = Router();

// ============================================================================
// UNIFIED ENRICHMENT
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/enrich
 * Comprehensive enrichment that fetches all possible identifiers.
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/enrich',
  requireAuth,
  enrichmentController.enrichLegalEntity
);

export default router;
