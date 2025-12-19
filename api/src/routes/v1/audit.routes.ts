/**
 * Audit Routes
 *
 * Routes for audit log operations.
 * Audit logs track user actions, system events, and security events.
 *
 * Routes:
 * - GET  /v1/audit-logs - Get audit logs with pagination and filtering
 * - POST /v1/audit-logs - Create a new audit log entry
 *
 * @module routes/v1/audit
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as auditController from '../../controllers/audit.controller';

const router = Router();

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

/**
 * GET /v1/audit-logs
 * Get audit logs with pagination and filtering
 * Supports query params: page, limit, offset, entityId, action
 * Requires authentication
 */
router.get('/v1/audit-logs', requireAuth, auditController.getAuditLogs);

/**
 * POST /v1/audit-logs
 * Create a new audit log entry
 * Requires authentication
 */
router.post('/v1/audit-logs', requireAuth, auditController.createAuditLog);

export default router;
