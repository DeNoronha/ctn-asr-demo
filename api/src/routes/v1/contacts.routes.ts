/**
 * Contacts Routes
 *
 * Routes for contact CRUD operations on legal entities.
 * Contacts are people associated with a legal entity (PRIMARY, BILLING, TECHNICAL, ADMIN).
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalentityid/contacts - Get contacts for entity
 * - POST /v1/legal-entities/:legalentityid/contacts - Create contact for entity
 * - PUT  /v1/legal-entities/:legalentityid/contacts/:contactId - Update contact
 * - DELETE /v1/legal-entities/:legalentityid/contacts/:contactId - Delete contact
 * - GET  /v1/contacts/:contactId - Get single contact
 * - POST /v1/contacts - Create contact (standalone)
 * - PUT  /v1/contacts/:contactId - Update contact (standalone)
 * - DELETE /v1/contacts/:contactId - Delete contact (standalone)
 * - GET  /v1/member-contacts - Get contacts for current user's entity
 *
 * @module routes/v1/contacts
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { cacheMiddleware } from '../../middleware/cache';
import { CacheTTL } from '../../utils/cache';
import * as contactsController from '../../controllers/contacts.controller';

const router = Router();

// ============================================================================
// CONTACTS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/contacts
 * Get all contacts for a legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalentityid/contacts',
  requireAuth,
  contactsController.getContactsByLegalEntity
);

/**
 * POST /v1/legal-entities/:legalentityid/contacts
 * Create a new contact for a legal entity
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/contacts',
  requireAuth,
  contactsController.createContactForLegalEntity
);

/**
 * PUT /v1/legal-entities/:legalentityid/contacts/:contactId
 * Update a contact for a legal entity
 * Requires authentication
 */
router.put(
  '/v1/legal-entities/:legalentityid/contacts/:contactId',
  requireAuth,
  contactsController.updateContactForLegalEntity
);

/**
 * DELETE /v1/legal-entities/:legalentityid/contacts/:contactId
 * Soft-delete a contact for a legal entity
 * Requires authentication
 */
router.delete(
  '/v1/legal-entities/:legalentityid/contacts/:contactId',
  requireAuth,
  contactsController.deleteContactForLegalEntity
);

// ============================================================================
// STANDALONE CONTACT ENDPOINTS
// ============================================================================

/**
 * GET /v1/contacts/:contactId
 * Get a single contact by ID
 * Requires authentication
 */
router.get('/v1/contacts/:contactId', requireAuth, contactsController.getContactById);

/**
 * POST /v1/contacts
 * Create a new contact (standalone endpoint)
 * Requires legal_entity_id in body
 * Requires authentication
 */
router.post('/v1/contacts', requireAuth, contactsController.createContact);

/**
 * PUT /v1/contacts/:contactId
 * Update a contact (standalone endpoint)
 * Requires authentication
 */
router.put('/v1/contacts/:contactId', requireAuth, contactsController.updateContact);

/**
 * DELETE /v1/contacts/:contactId
 * Soft-delete a contact (standalone endpoint)
 * Requires authentication
 */
router.delete('/v1/contacts/:contactId', requireAuth, contactsController.deleteContact);

// ============================================================================
// MEMBER PORTAL SELF-SERVICE
// ============================================================================

/**
 * GET /v1/member-contacts
 * Get contacts for the current user's legal entity
 * Includes caching for performance
 * Requires authentication
 */
router.get(
  '/v1/member-contacts',
  requireAuth,
  cacheMiddleware(CacheTTL.CONTACTS),
  contactsController.getMemberContacts
);

export default router;
