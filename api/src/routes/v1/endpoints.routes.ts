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
 * Lifecycle Routes (CTN 6-phase model):
 * - POST /v1/endpoints/:endpointId/publish - Publish endpoint to directory
 * - POST /v1/endpoints/:endpointId/unpublish - Remove from directory
 * - GET  /v1/endpoint-directory - Consumer discovery of published endpoints
 * - POST /v1/endpoints/:endpointId/request-access - Consumer requests access
 * - GET  /v1/endpoints/:endpointId/access-requests - Provider views requests
 * - POST /v1/access-requests/:requestId/approve - Approve access request
 * - POST /v1/access-requests/:requestId/deny - Deny access request
 * - GET  /v1/my-access-grants - Consumer views their granted accesses
 * - POST /v1/grants/:grantId/revoke - Revoke an access grant
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

// ============================================================================
// ENDPOINT LIFECYCLE - PUBLICATION (Phase 3)
// ============================================================================

/**
 * POST /v1/endpoints/:endpointId/publish
 * Publish endpoint to CTN directory (makes it discoverable)
 * Requires endpoint to be VERIFIED
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/publish",
	requireAuth,
	endpointsController.publishEndpoint,
);

/**
 * POST /v1/endpoints/:endpointId/unpublish
 * Remove endpoint from CTN directory
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/unpublish",
	requireAuth,
	endpointsController.unpublishEndpoint,
);

// ============================================================================
// ENDPOINT DIRECTORY - CONSUMER DISCOVERY (Phase 4)
// ============================================================================

/**
 * GET /v1/endpoint-directory
 * Get published endpoints for consumer discovery
 * Excludes consumer's own endpoints
 * Requires authentication
 */
router.get(
	"/v1/endpoint-directory",
	requireAuth,
	cacheMiddleware(CacheTTL.ENDPOINTS),
	endpointsController.getPublishedEndpoints,
);

// ============================================================================
// ACCESS REQUEST WORKFLOW (Phase 4-5)
// ============================================================================

/**
 * POST /v1/endpoints/:endpointId/request-access
 * Consumer requests access to an endpoint
 * Auto-approves for 'open' access model
 * Creates pending request for 'restricted'/'private'
 * Requires authentication
 */
router.post(
	"/v1/endpoints/:endpointId/request-access",
	requireAuth,
	endpointsController.requestAccess,
);

/**
 * GET /v1/endpoints/:endpointId/access-requests
 * Provider views access requests for their endpoint
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.get(
	"/v1/endpoints/:endpointId/access-requests",
	requireAuth,
	endpointsController.getAccessRequests,
);

/**
 * POST /v1/access-requests/:requestId/approve
 * Provider approves an access request
 * Creates grant for consumer
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/access-requests/:requestId/approve",
	requireAuth,
	endpointsController.approveAccessRequest,
);

/**
 * POST /v1/access-requests/:requestId/deny
 * Provider denies an access request
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/access-requests/:requestId/deny",
	requireAuth,
	endpointsController.denyAccessRequest,
);

/**
 * GET /v1/my-access-grants
 * Consumer views their granted endpoint accesses
 * Requires authentication
 */
router.get(
	"/v1/my-access-grants",
	requireAuth,
	endpointsController.getMyAccessGrants,
);

/**
 * POST /v1/grants/:grantId/revoke
 * Revoke an access grant
 * Can be done by provider (endpoint owner) or consumer (grant holder)
 * Includes IDOR protection (SEC-006)
 * Requires authentication
 */
router.post(
	"/v1/grants/:grantId/revoke",
	requireAuth,
	endpointsController.revokeGrant,
);

export default router;
