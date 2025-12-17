/**
 * System Routes
 *
 * Public system endpoints for version info and JWKS discovery.
 * These routes do not require authentication.
 *
 * Routes:
 * - GET /v1/version - API version information
 * - GET /.well-known/jwks - JWKS public key discovery (BDI)
 *
 * @module routes/v1/system
 */

import { Router, Request, Response } from 'express';
import * as systemController from '../../controllers/system.controller';

const router = Router();

/**
 * GET /v1/version
 * Returns API version and environment information
 * Public endpoint - no authentication required
 */
router.get('/v1/version', systemController.getVersion);

/**
 * GET /.well-known/jwks
 * JWKS Discovery Endpoint for BDI signature verification
 * Public endpoint - no authentication required
 */
router.get('/.well-known/jwks', systemController.getJwks);

export default router;
