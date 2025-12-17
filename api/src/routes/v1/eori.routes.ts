/**
 * EORI Routes
 *
 * Routes for EORI (Economic Operators Registration and Identification) operations.
 * EORI numbers are EU customs identification numbers required for import/export.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/eori-registry - Get stored EORI data
 * - POST /v1/legal-entities/:legalentityid/eori/fetch - Fetch and validate EORI
 * - GET  /v1/eori/validate - Validate EORI without saving
 *
 * @module routes/v1/eori
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as eoriController from '../../controllers/eori.controller';

const router = Router();

/**
 * GET /v1/legal-entities/:legalentityid/eori-registry
 * Get stored EORI registry data for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/eori-registry',
  requireAuth,
  eoriController.getEoriRegistry
);

/**
 * POST /v1/legal-entities/:legalentityid/eori/fetch
 * Fetch and validate EORI from EU SOAP service
 * Optionally saves to database (save_to_database=true by default)
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/eori/fetch',
  requireAuth,
  eoriController.fetchEori
);

/**
 * GET /v1/eori/validate
 * Validate an EORI number without saving to database
 * Use for lookups and validation checks
 * Requires authentication
 */
router.get(
  '/v1/eori/validate',
  requireAuth,
  eoriController.validateEori
);

export default router;
