/**
 * Members Routes
 *
 * Routes for member listing and legal entity CRUD operations.
 * Members are represented as legal entities in the database.
 *
 * Routes:
 * - GET  /v1/members - List all members with pagination
 * - GET  /v1/all-members - Alias for /v1/members (admin portal)
 * - PUT  /v1/members/:legalEntityId/status - Update member status
 * - PATCH /v1/members/:legalEntityId/status - Update member status (alias)
 * - GET  /v1/legal-entities - List all legal entities
 * - GET  /v1/legal-entities/:legalentityid - Get single legal entity
 * - POST /v1/legal-entities - Create legal entity
 * - PUT  /v1/legal-entities/:legalentityid - Update legal entity
 * - DELETE /v1/legal-entities/:legalentityid - Delete legal entity
 *
 * @module routes/v1/members
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as membersController from '../../controllers/members.controller';

const router = Router();

// ============================================================================
// MEMBERS (View layer - uses vw_legal_entities)
// ============================================================================

/**
 * GET /v1/members
 * List all members with pagination and search
 * Uses vw_legal_entities view for enriched data
 * Requires authentication
 */
router.get('/v1/members', requireAuth, membersController.getMembers);

/**
 * GET /v1/all-members
 * Alias for /v1/members - used by admin portal
 * Uses page_size instead of limit parameter
 * Requires authentication
 */
router.get('/v1/all-members', requireAuth, membersController.getAllMembers);

/**
 * PUT /v1/members/:legalEntityId/status
 * Update member status with audit logging
 * Requires authentication
 */
router.put('/v1/members/:legalEntityId/status', requireAuth, membersController.updateMemberStatus);

/**
 * PATCH /v1/members/:legalEntityId/status
 * Alias for PUT - backward compatibility
 * Requires authentication
 */
router.patch('/v1/members/:legalEntityId/status', requireAuth, membersController.updateMemberStatus);

// ============================================================================
// LEGAL ENTITIES (Direct entity operations)
// ============================================================================

/**
 * GET /v1/legal-entities
 * List all legal entities with pagination
 * Uses legal_entity table directly
 * Requires authentication
 */
router.get('/v1/legal-entities', requireAuth, membersController.getLegalEntities);

/**
 * GET /v1/legal-entities/:legalentityid
 * Get a single legal entity by ID
 * Requires authentication
 */
router.get('/v1/legal-entities/:legalentityid', requireAuth, membersController.getLegalEntityById);

/**
 * POST /v1/legal-entities
 * Create a new legal entity
 * Also creates party_reference record
 * Requires authentication
 */
router.post('/v1/legal-entities', requireAuth, membersController.createLegalEntity);

/**
 * PUT /v1/legal-entities/:legalentityid
 * Update an existing legal entity
 * Requires authentication
 */
router.put('/v1/legal-entities/:legalentityid', requireAuth, membersController.updateLegalEntity);

/**
 * DELETE /v1/legal-entities/:legalentityid
 * Soft-delete a legal entity and cascade to related records
 * Deletes: contacts, identifiers, endpoints, KvK registry data
 * Requires authentication
 */
router.delete('/v1/legal-entities/:legalentityid', requireAuth, membersController.deleteLegalEntity);

export default router;
