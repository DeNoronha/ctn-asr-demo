/**
 * Applications Routes
 *
 * Routes for membership application operations.
 * Applications track the membership request workflow from submission to approval/rejection.
 *
 * Routes:
 * - GET  /v1/applications - Get applications with pagination and filtering
 * - POST /v1/applications/:id/approve - Approve application and create member
 * - POST /v1/applications/:id/reject - Reject application with reason
 *
 * @module routes/v1/applications
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as applicationsController from '../../controllers/applications.controller';

const router = Router();

// ============================================================================
// APPLICATION OPERATIONS
// ============================================================================

/**
 * GET /v1/applications
 * Get applications with pagination and filtering
 * Supports query params: status, page, limit
 * Requires authentication
 */
router.get('/v1/applications', requireAuth, applicationsController.getApplications);

/**
 * POST /v1/applications/:id/approve
 * Approve an application and create member entities
 * Uses transaction to ensure atomicity
 * Requires authentication
 */
router.post('/v1/applications/:id/approve', requireAuth, applicationsController.approveApplication);

/**
 * POST /v1/applications/:id/reject
 * Reject an application with a reason
 * Requires authentication
 */
router.post('/v1/applications/:id/reject', requireAuth, applicationsController.rejectApplication);

export default router;
