/**
 * Tasks Routes
 *
 * Routes for admin task operations.
 * Admin tasks track workflow items requiring administrator attention.
 *
 * Routes:
 * - GET  /v1/tasks - Get tasks with pagination and filtering
 * - GET  /v1/admin/tasks/list - Get admin tasks with advanced filtering
 * - PUT  /v1/admin/tasks/:taskId - Update an admin task
 *
 * @module routes/v1/tasks
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as tasksController from '../../controllers/tasks.controller';

const router = Router();

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * GET /v1/tasks
 * Get tasks with pagination and filtering
 * Supports query params: status, page, limit
 * Requires authentication
 */
router.get('/v1/tasks', requireAuth, tasksController.getTasks);

/**
 * GET /v1/admin/tasks/list
 * Get admin tasks with advanced filtering
 * Supports query params: status, priority, task_type, assigned_to, include_overdue, limit
 * Requires authentication
 */
router.get('/v1/admin/tasks/list', requireAuth, tasksController.getAdminTasksList);

/**
 * PUT /v1/admin/tasks/:taskId
 * Update an admin task
 * Requires authentication
 */
router.put('/v1/admin/tasks/:taskId', requireAuth, tasksController.updateAdminTask);

export default router;
