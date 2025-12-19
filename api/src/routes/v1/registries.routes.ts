/**
 * Registries Routes
 *
 * Routes for country-specific business registry operations.
 * Supports LEI (GLEIF), KVK (Netherlands), German Handelsregister, and Belgian KBO.
 *
 * Routes:
 * - GET /v1/legal-entities/:legalentityid/lei-registry - Get GLEIF registry data
 * - GET /v1/legal-entities/:legalentityid/kvk-registry - Get Dutch KvK registry data
 * - GET /v1/legal-entities/:legalentityid/german-registry - Get German Handelsregister data
 * - GET /v1/legal-entities/:legalentityid/belgium-registry - Get Belgian KBO registry data
 *
 * @module routes/v1/registries
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as registriesController from '../../controllers/registries.controller';

const router = Router();

/**
 * GET /v1/legal-entities/:legalentityid/lei-registry
 * Get GLEIF (Global Legal Entity Identifier Foundation) registry data
 * Auto-fetches from GLEIF API if LEI exists but registry data is missing
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/lei-registry',
  requireAuth,
  registriesController.getLeiRegistry
);

/**
 * GET /v1/legal-entities/:legalentityid/kvk-registry
 * Get Dutch Chamber of Commerce (KvK) registry data
 * Primary source is kvk_registry_data table
 * Falls back to identifier_verification_history if needed
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/kvk-registry',
  requireAuth,
  registriesController.getKvkRegistry
);

/**
 * GET /v1/legal-entities/:legalentityid/german-registry
 * Get German Handelsregister (HRB/HRA) registry data
 * Only available for entities with country_code = 'DE'
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/german-registry',
  requireAuth,
  registriesController.getGermanRegistry
);

/**
 * GET /v1/legal-entities/:legalentityid/belgium-registry
 * Get Belgian KBO (Kruispuntbank van Ondernemingen) registry data
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/belgium-registry',
  requireAuth,
  registriesController.getBelgiumRegistry
);

export default router;
