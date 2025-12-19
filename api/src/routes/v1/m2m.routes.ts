/**
 * M2M Routes
 *
 * Routes for Machine-to-Machine (M2M) client operations.
 * M2M clients enable automated system-to-system authentication.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legal_entity_id/m2m-clients - Get all M2M clients
 * - POST /v1/legal-entities/:legal_entity_id/m2m-clients - Create M2M client
 * - POST /v1/m2m-clients/:m2m_client_id/generate-secret - Generate new secret
 * - PATCH /v1/m2m-clients/:m2m_client_id/scopes - Update client scopes
 * - DELETE /v1/m2m-clients/:m2m_client_id - Delete M2M client
 *
 * @module routes/v1/m2m
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { cacheMiddleware } from '../../middleware/cache';
import { CacheTTL } from '../../utils/cache';
import * as m2mController from '../../controllers/m2m.controller';

const router = Router();

// ============================================================================
// M2M CLIENT OPERATIONS
// ============================================================================

/**
 * GET /v1/legal-entities/:legal_entity_id/m2m-clients
 * Get all M2M clients for a legal entity
 * Includes caching for performance
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legal_entity_id/m2m-clients',
  requireAuth,
  cacheMiddleware(CacheTTL.M2M_CLIENTS),
  m2mController.getM2mClients
);

/**
 * POST /v1/legal-entities/:legal_entity_id/m2m-clients
 * Create a new M2M client for a legal entity
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legal_entity_id/m2m-clients',
  requireAuth,
  m2mController.createM2mClient
);

/**
 * POST /v1/m2m-clients/:m2m_client_id/generate-secret
 * Generate a new secret for an M2M client
 * Requires authentication
 */
router.post('/v1/m2m-clients/:m2m_client_id/generate-secret', requireAuth, m2mController.generateM2mSecret);

/**
 * PATCH /v1/m2m-clients/:m2m_client_id/scopes
 * Update scopes for an M2M client
 * Requires authentication
 */
router.patch('/v1/m2m-clients/:m2m_client_id/scopes', requireAuth, m2mController.updateM2mScopes);

/**
 * DELETE /v1/m2m-clients/:m2m_client_id
 * Soft-delete an M2M client
 * Requires authentication
 */
router.delete('/v1/m2m-clients/:m2m_client_id', requireAuth, m2mController.deleteM2mClient);

export default router;
