/**
 * Branding Routes
 *
 * Routes for legal entity branding CRUD operations.
 * Manages logo, colors, and theme preferences.
 *
 * Routes:
 * - GET /v1/legal-entities/:legalentityid/branding - Get branding data
 * - PUT /v1/legal-entities/:legalentityid/branding - Update branding
 *
 * @module routes/v1/branding
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as brandingController from '../../controllers/branding.controller';

const router = Router();

// ============================================================================
// BRANDING OPERATIONS
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/branding
 * Get branding data for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/branding',
  requireAuth,
  brandingController.getBranding
);

/**
 * PUT /v1/legal-entities/:legalentityid/branding
 * Update branding for a legal entity (creates if not exists)
 * Requires authentication
 */
router.put(
  '/v1/legal-entities/:legalentityid/branding',
  requireAuth,
  brandingController.updateBranding
);

export default router;
