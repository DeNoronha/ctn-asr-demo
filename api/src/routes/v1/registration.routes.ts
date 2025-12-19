/**
 * Registration Routes
 *
 * Public routes for member registration with KvK document upload.
 * No authentication required.
 *
 * Routes:
 * - POST /v1/register-member - Register new member (with file upload)
 *
 * @module routes/v1/registration
 */

import { Router } from 'express';
import multer from 'multer';
import * as registrationController from '../../controllers/registration.controller';

const router = Router();

// Multer for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================================================
// PUBLIC REGISTRATION
// ============================================================================

/**
 * POST /v1/register-member
 * Public endpoint for member registration with KvK document upload
 * No authentication required - this is a public endpoint
 */
router.post(
  '/v1/register-member',
  upload.single('kvkDocument'),
  registrationController.registerMember
);

export default router;
