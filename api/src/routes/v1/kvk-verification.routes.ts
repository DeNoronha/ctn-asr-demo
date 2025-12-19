/**
 * KVK Verification Routes
 *
 * Routes for KvK (Kamer van Koophandel) document verification operations.
 * Part of the identity verification workflow for Dutch companies.
 *
 * Routes:
 * - GET  /v1/legal-entities/:legalEntityId/kvk-verification - Get KvK verification status
 * - GET  /v1/kvk-verification/flagged - Get all flagged entities
 * - POST /v1/kvk-verification/:legalentityid/review - Review and approve/reject
 * - POST /v1/legal-entities/:legalentityid/kvk-document - Upload KvK document
 * - POST /v1/legal-entities/:legalentityid/kvk-document/verify - Trigger verification
 * - POST /v1/legal-entities/:legalentityid/refresh-address-from-kvk - Refresh address
 * - POST /v1/admin/refresh-all-addresses-from-kvk - Bulk refresh addresses
 *
 * @module routes/v1/kvk-verification
 */

import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth';
import * as kvkVerificationController from '../../controllers/kvk-verification.controller';

// Multer for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const router = Router();

// ============================================================================
// KVK VERIFICATION OPERATIONS
// ============================================================================

/**
 * GET /v1/legal-entities/:legalEntityId/kvk-verification
 * Get KvK verification status and document for a specific legal entity
 * Requires authentication
 */
router.get(
  '/v1/legal-entities/:legalEntityId/kvk-verification',
  requireAuth,
  kvkVerificationController.getKvkVerificationStatus
);

/**
 * GET /v1/kvk-verification/flagged
 * Get all legal entities with flagged KvK verification status
 * Requires authentication
 */
router.get(
  '/v1/kvk-verification/flagged',
  requireAuth,
  kvkVerificationController.getFlaggedKvkEntities
);

/**
 * POST /v1/kvk-verification/:legalentityid/review
 * Review and approve/reject KvK verification for a legal entity
 * Requires authentication
 */
router.post(
  '/v1/kvk-verification/:legalentityid/review',
  requireAuth,
  kvkVerificationController.reviewKvkVerification
);

// ============================================================================
// KVK DOCUMENT UPLOAD & VERIFICATION
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/kvk-document
 * Upload KvK document for verification (Member Portal)
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/kvk-document',
  requireAuth,
  upload.single('file'),
  kvkVerificationController.uploadKvkDocument
);

/**
 * POST /v1/legal-entities/:legalentityid/kvk-document/verify
 * Manually trigger verification for existing KvK document
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/kvk-document/verify',
  requireAuth,
  kvkVerificationController.triggerKvkVerification
);

// ============================================================================
// ADDRESS REFRESH FROM KVK
// ============================================================================

/**
 * POST /v1/legal-entities/:legalentityid/refresh-address-from-kvk
 * Refresh address from existing KVK registry data
 * Requires authentication
 */
router.post(
  '/v1/legal-entities/:legalentityid/refresh-address-from-kvk',
  requireAuth,
  kvkVerificationController.refreshAddressFromKvk
);

/**
 * POST /v1/admin/refresh-all-addresses-from-kvk
 * Bulk refresh addresses from KVK data for entities with empty addresses
 * Requires authentication (admin only)
 */
router.post(
  '/v1/admin/refresh-all-addresses-from-kvk',
  requireAuth,
  kvkVerificationController.bulkRefreshAddressesFromKvk
);

export default router;
