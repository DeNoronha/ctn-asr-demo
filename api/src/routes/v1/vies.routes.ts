/**
 * VIES Routes
 *
 * Routes for VIES (VAT Information Exchange System) operations.
 * VIES is the EU system for validating VAT numbers across member states.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/vies-registry - Get stored VIES data
 * - POST /v1/legal-entities/:legalentityid/vies/fetch - Fetch and validate VAT
 * - GET  /v1/vies/validate - Validate VAT without saving
 *
 * @module routes/v1/vies
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as viesController from '../../controllers/vies.controller';

const router = Router();

/**
 * GET /v1/legal-entities/:legalentityid/vies-registry
 * Get stored VIES registry data for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/vies-registry',
  requireAuth,
  viesController.getViesRegistry
);

/**
 * POST /v1/legal-entities/:legalentityid/vies/fetch
 * Fetch and validate VAT from EU VIES service
 * Optionally saves to database (save_to_database=true by default)
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/vies/fetch',
  requireAuth,
  viesController.fetchVies
);

/**
 * GET /v1/vies/validate
 * Validate a VAT number without saving to database
 * Use for lookups and validation checks
 * Requires authentication
 */
router.get(
  '/v1/vies/validate',
  requireAuth,
  viesController.validateVies
);

export default router;
