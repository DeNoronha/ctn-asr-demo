/**
 * Main Route Aggregator
 *
 * Imports all route modules and exports a unified router.
 * This file serves as the single entry point for all API routes.
 *
 * @module routes
 */

import { Router } from 'express';
import v1Routes from './v1';

const router = Router();

// Mount v1 API routes
router.use(v1Routes);

// Named export for compatibility with server.ts
export { router };
export default router;
