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
 * Registration Workflow Routes:
 * - POST /v1/entities/:legalEntityId/endpoints/register - Initiate registration
 * - POST /v1/endpoints/:endpointId/send-verification - Send verification email
 * - POST /v1/endpoints/:endpointId/verify-token - Verify email token
 * - POST /v1/endpoints/:endpointId/activate - Activate endpoint
 *
 * @module routes/v1/endpoints
 */

import { Router } from "express";
import * as endpointsController from "../../controllers/endpoints.controller";
import { cacheMiddleware } from "../../middleware/cache";
import { CacheTTL } from "../../utils/cache";
import { requireAuth } from "../middleware/requireAuth";

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
	"/v1/legal-entities/:legalentityid/endpoints",
	requireAuth,
	endpointsController.getEndpointsByLegalEntity,
);

/**
 * POST /v1/legal-entities/:legalentityid/endpoints
 * Create a new endpoint for a legal entity
 * Requires authentication
 */
router.post(
	"/v1/legal-entities/:legalentityid/endpoints",
	requireAuth,
	endpointsController.createEndpointForLegalEntity,
);

// ============================================================================
// STANDALONE ENDPOINT OPERATIONS
// ============================================================================

/**
 * PUT /v1/endpoints/:endpointId
 * Update an endpoint
 * Requires authentication
 */
router.put(
	"/v1/endpoints/:endpointId",
	requireAuth,
	endpointsController.updateEndpoint,
);

/**
 * DELETE /v1/endpoints/:endpointId
 * Soft-delete an endpoint
 * Requires authentication
 */
router.delete(
	"/v1/endpoints/:endpointId",
	requireAuth,
	endpointsController.deleteEndpoint,
);

/**
 * POST /v1/endpoints/:endpointId/test
 * Test endpoint connection
 * Includes SSRF protection (SEC-005) and IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/test",
	requireAuth,
	endpointsController.testEndpoint,
);

/**
 * PATCH /v1/endpoints/:endpointId/toggle
 * Toggle endpoint active status
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.patch(
	"/v1/endpoints/:endpointId/toggle",
	requireAuth,
	endpointsController.toggleEndpoint,
);

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
	"/v1/member-endpoints",
	requireAuth,
	cacheMiddleware(CacheTTL.ENDPOINTS),
	endpointsController.getMemberEndpoints,
);

// ============================================================================
// ENDPOINT REGISTRATION WORKFLOW
// ============================================================================

/**
 * POST /v1/entities/:legalEntityId/endpoints/register
 * Step 1: Initiate endpoint registration
 * Creates endpoint with PENDING verification status
 * Requires authentication
 */
router.post(
	"/v1/entities/:legalEntityId/endpoints/register",
	requireAuth,
	endpointsController.initiateRegistration,
);

/**
 * POST /v1/endpoints/:endpointId/send-verification
 * Step 2: Callback Challenge-Response Verification
 *
 * Sends a challenge to the endpoint URL:
 * - POST { "type": "ctn_endpoint_verification", "challenge": "abc123" }
 * - Expects response: { "challenge": "abc123" }
 * - If challenge matches → endpoint verified immediately
 *
 * This proves the registrant actually controls the endpoint.
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/send-verification",
	requireAuth,
	endpointsController.sendVerificationEmail,
);

/**
 * POST /v1/endpoints/:endpointId/verify-token
 * Step 3: Check verification status (callback handles verification automatically)
 * Serves as status check or manual token verification fallback
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/verify-token",
	requireAuth,
	endpointsController.verifyToken,
);

/**
 * POST /v1/endpoints/:endpointId/activate
 * Step 5: Activate endpoint after successful testing
 * Sets is_active=true and activation_date
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/activate",
	requireAuth,
	endpointsController.activateEndpoint,
);

export default router;
