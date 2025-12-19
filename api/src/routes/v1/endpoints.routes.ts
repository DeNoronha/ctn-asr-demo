/**
 * Endpoints Routes
 *
 * Routes for endpoint CRUD operations on legal entities.
 * Endpoints represent M2M communication endpoints (REST APIs, webhooks, etc.)
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/endpoints - Get endpoints for entity
 * - POST /v1/legal-entities/:legalentityid/endpoints - Create endpoint
 * - PUT  /v1/endpoints/:endpointId - Update endpoint
 * - DELETE /v1/endpoints/:endpointId - Delete endpoint
 * - POST /v1/endpoints/:endpointId/test - Test endpoint connection
 * - PATCH /v1/endpoints/:endpointId/toggle - Toggle endpoint active status
 * - GET  /v1/member-endpoints - Get endpoints for current user's entity
 *
 * @module routes/v1/endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { cacheMiddleware } from '../../middleware/cache';
import { CacheTTL } from '../../utils/cache';
import * as endpointsController from '../../controllers/endpoints.controller';

const router = Router();

// ============================================================================
// ENDPOINTS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/endpoints
 * Get all endpoints for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/endpoints',
  requireAuth,
  endpointsController.getEndpointsByLegalEntity
);

/**
 * POST /v1/legal-entities/:legalentityid/endpoints
 * Create a new endpoint for a legal entity
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/endpoints',
  requireAuth,
  endpointsController.createEndpointForLegalEntity
);

// ============================================================================
// STANDALONE ENDPOINT OPERATIONS
// ============================================================================

/**
 * PUT /v1/endpoints/:endpointId
 * Update an endpoint
 * Requires authentication
 */
router.put('/v1/endpoints/:endpointId', requireAuth, endpointsController.updateEndpoint);

/**
 * DELETE /v1/endpoints/:endpointId
 * Soft-delete an endpoint
 * Requires authentication
 */
router.delete('/v1/endpoints/:endpointId', requireAuth, endpointsController.deleteEndpoint);

/**
 * POST /v1/endpoints/:endpointId/test
 * Test endpoint connection
 * Includes SSRF protection (SEC-005) and IDOR protection (SEC-006)
 * Requires authentication
 */
router.post('/v1/endpoints/:endpointId/test', requireAuth, endpointsController.testEndpoint);

/**
 * PATCH /v1/endpoints/:endpointId/toggle
 * Toggle endpoint active status
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.patch('/v1/endpoints/:endpointId/toggle', requireAuth, endpointsController.toggleEndpoint);

// ============================================================================
// MEMBER ENDPOINTS (Self-service)
// ============================================================================

/**
 * GET /v1/member-endpoints
 * Get endpoints for the current user's legal entity
 * Includes caching for performance
 * Requires authentication
 */
router.get(
  '/v1/member-endpoints',
  requireAuth,
  cacheMiddleware(CacheTTL.ENDPOINTS),
  endpointsController.getMemberEndpoints
);

export default router;
