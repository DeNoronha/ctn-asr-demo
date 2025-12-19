/**
 * Member Portal Routes
 *
 * Routes for member portal self-service operations.
 * These routes are used by authenticated members to manage their own organization data.
 *
 * Routes:
 * - GET  /v1/member - Get current member's organization profile
 * - GET  /v1/member/tokens - Get all API tokens
 * - POST /v1/member/tokens - Create a new API token
 * - DELETE /v1/member/tokens/:tokenId - Revoke an API token
 * - GET  /v1/member/contacts - Get all contacts
 * - PUT  /v1/member/contacts/:contactId - Update a contact
 *
 * @module routes/v1/member-portal
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as memberPortalController from '../../controllers/member-portal.controller';

const router = Router();

// ============================================================================
// MEMBER PROFILE
// ============================================================================

/**
 * GET /v1/member
 * Get current member's organization profile with identifiers
 * Requires authentication
 */
router.get('/v1/member', requireAuth, memberPortalController.getMemberProfile);

// ============================================================================
// MEMBER API TOKENS
// ============================================================================

/**
 * GET /v1/member/tokens
 * Get all API tokens for the current member's organization
 * Requires authentication
 */
router.get('/v1/member/tokens', requireAuth, memberPortalController.getMemberTokens);

/**
 * POST /v1/member/tokens
 * Create a new API token for the current member's organization
 * Requires authentication
 */
router.post('/v1/member/tokens', requireAuth, memberPortalController.createMemberToken);

/**
 * DELETE /v1/member/tokens/:tokenId
 * Revoke an API token for the current member's organization
 * Requires authentication
 */
router.delete('/v1/member/tokens/:tokenId', requireAuth, memberPortalController.revokeMemberToken);

// ============================================================================
// MEMBER CONTACTS (Self-service)
// ============================================================================

/**
 * GET /v1/member/contacts
 * Get all contacts for the current member's organization
 * Requires authentication
 */
router.get('/v1/member/contacts', requireAuth, memberPortalController.getMemberOrgContacts);

/**
 * PUT /v1/member/contacts/:contactId
 * Update a contact for the current member's organization
 * Requires authentication
 */
router.put('/v1/member/contacts/:contactId', requireAuth, memberPortalController.updateMemberOrgContact);

export default router;
