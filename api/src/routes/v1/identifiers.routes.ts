/**
 * Identifiers Routes
 *
 * Routes for identifier CRUD operations on legal entities.
 * Identifiers include KvK, LEI, EORI, VAT, DUNS, RSIN, EUID, etc.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/identifiers - Get identifiers for entity
 * - GET  /v1/entities/:legalentityid/identifiers - Alias (admin portal)
 * - POST /v1/legal-entities/:legalentityid/identifiers - Create identifier
 * - POST /v1/entities/:legalentityid/identifiers - Alias (admin portal)
 * - GET  /v1/identifiers/:identifierId - Get single identifier
 * - PUT  /v1/identifiers/:identifierId - Update identifier
 * - DELETE /v1/identifiers/:identifierId - Delete identifier
 * - POST /v1/identifiers/:identifierId/validate - Validate identifier format
 * - GET  /v1/legal-entities/:legalentityid/verifications - Get verification history
 *
 * @module routes/v1/identifiers
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { cacheMiddleware } from '../../middleware/cache';
import { CacheTTL } from '../../utils/cache';
import * as identifiersController from '../../controllers/identifiers.controller';

const router = Router();

// ============================================================================
// IDENTIFIERS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/identifiers
 * Get all identifiers for a legal entity
 * Includes caching for performance
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/identifiers',
  requireAuth,
  cacheMiddleware(CacheTTL.IDENTIFIERS),
  identifiersController.getIdentifiersByLegalEntity
);

/**
 * GET /v1/entities/:legalentityid/identifiers
 * Alias for /v1/legal-entities/:legalentityid/identifiers (admin portal)
 * Requires authentication
 */
router.get(
  '/v1/entities/:legalentityid/identifiers',
  requireAuth,
  identifiersController.getIdentifiersByLegalEntity
);

/**
 * POST /v1/legal-entities/:legalentityid/identifiers
 * Create a new identifier for a legal entity
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/identifiers',
  requireAuth,
  identifiersController.createIdentifierForLegalEntity
);

/**
 * POST /v1/entities/:legalentityid/identifiers
 * Alias for POST /v1/legal-entities/:legalentityid/identifiers (admin portal)
 * Requires authentication
 */
router.post(
  '/v1/entities/:legalentityid/identifiers',
  requireAuth,
  identifiersController.createIdentifierForLegalEntity
);

// ============================================================================
// STANDALONE IDENTIFIER ENDPOINTS
// ============================================================================

/**
 * GET /v1/identifiers/:identifierId
 * Get a single identifier by ID
 * Requires authentication
 */
router.get('/v1/identifiers/:identifierId', requireAuth, identifiersController.getIdentifierById);

/**
 * PUT /v1/identifiers/:identifierId
 * Update an identifier
 * Requires authentication
 */
router.put('/v1/identifiers/:identifierId', requireAuth, identifiersController.updateIdentifier);

/**
 * DELETE /v1/identifiers/:identifierId
 * Soft-delete an identifier
 * Requires authentication
 */
router.delete('/v1/identifiers/:identifierId', requireAuth, identifiersController.deleteIdentifier);

/**
 * POST /v1/identifiers/:identifierId/validate
 * Validate identifier against format rules
 * Updates validation_status in database
 * Requires authentication
 */
router.post('/v1/identifiers/:identifierId/validate', requireAuth, identifiersController.validateIdentifier);

// ============================================================================
// VERIFICATION HISTORY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/verifications
 * Get verification history for a legal entity
 * Returns documents with SAS URLs for secure access
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/verifications',
  requireAuth,
  identifiersController.getVerificationHistory
);

export default router;
