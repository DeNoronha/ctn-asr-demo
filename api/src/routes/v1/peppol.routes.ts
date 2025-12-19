/**
 * Peppol Routes
 *
 * Routes for Peppol (Pan-European Public Procurement OnLine) operations.
 * Peppol enables cross-border e-invoicing and procurement across Europe.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/peppol-registry - Get stored Peppol data
 * - POST /v1/legal-entities/:legalentityid/peppol/fetch - Fetch from Peppol Directory
 * - GET  /v1/peppol/search - Search Peppol Directory without saving
 *
 * @module routes/v1/peppol
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as peppolController from '../../controllers/peppol.controller';

const router = Router();

/**
 * GET /v1/legal-entities/:legalentityid/peppol-registry
 * Get stored Peppol registry data for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/peppol-registry',
  requireAuth,
  peppolController.getPeppolRegistry
);

/**
 * POST /v1/legal-entities/:legalentityid/peppol/fetch
 * Fetch Peppol data from Peppol Directory
 * Can search by identifier (identifier_type + identifier_value) or by name (company_name + country_code)
 * Optionally saves to database (save_to_database=true by default)
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/peppol/fetch',
  requireAuth,
  peppolController.fetchPeppol
);

/**
 * GET /v1/peppol/search
 * Search Peppol Directory without saving to database
 * Use for lookups and validation checks
 * Query params: scheme+value OR name+country
 * Requires authentication
 */
router.get(
  '/v1/peppol/search',
  requireAuth,
  peppolController.searchPeppol
);

export default router;
