/**
 * Tiers Routes
 *
 * Routes for authentication tier management and authorization logging.
 * Three-tier authentication system: Basic (email), Standard (DNS/KvK), Enhanced (eHerkenning)
 *
 * Routes:
 * - GET  /v1/entities/:legalentityid/tier - Get tier info for entity
 * - PUT  /v1/entities/:legalentityid/tier - Update tier info
 * - GET  /v1/tiers/requirements - Get tier requirements (public)
 * - GET  /v1/authorization-log - Get authorization decision logs
 *
 * @module routes/v1/tiers
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as tiersController from '../../controllers/tiers.controller';

const router = Router();

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

/**
 * GET /v1/entities/:legalentityid/tier
 * Get tier information for a legal entity
 * Requires authentication
 */
router.get('/v1/entities/:legalentityid/tier', requireAuth, tiersController.getTier);

/**
 * PUT /v1/entities/:legalentityid/tier
 * Update tier information for a legal entity
 * Requires authentication
 */
router.put('/v1/entities/:legalentityid/tier', requireAuth, tiersController.updateTier);

/**
 * GET /v1/tiers/requirements
 * Get tier requirements (public endpoint, no auth required)
 */
router.get('/v1/tiers/requirements', tiersController.getTierRequirements);

// ============================================================================
// AUTHORIZATION LOG
// ============================================================================

/**
 * GET /v1/authorization-log
 * Get authorization decision logs
 * Supports query params: legalEntityId, limit, offset
 * Requires authentication
 */
router.get('/v1/authorization-log', requireAuth, tiersController.getAuthorizationLog);

export default router;
