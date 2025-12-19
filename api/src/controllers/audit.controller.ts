/**
 * Audit Controller
 *
 * Handles audit log operations.
 * Audit logs track user actions, system events, and security events.
 *
 * @module controllers/audit
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

/**
 * GET /v1/audit-logs
 * Get audit logs with pagination and filtering
 * Supports both page-based and offset-based pagination for backward compatibility
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();

    // Support both pagination styles
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '100');
    const offset = req.query.offset
      ? parseInt(req.query.offset as string)
      : (page - 1) * limit;

    const entityId = req.query.entityId as string;
    const action = req.query.action as string;

    let sql = `
      SELECT *
      FROM audit_log
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (entityId) {
      params.push(entityId);
      sql += ` AND entity_id = $${params.length}`;
    }
    if (action) {
      params.push(action);
      sql += ` AND action = $${params.length}`;
    }

    sql += ` ORDER BY dt_created DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) FROM audit_log WHERE 1=1';
    const countParams: (string | number)[] = [];

    if (entityId) {
      countParams.push(entityId);
      countSql += ` AND entity_id = $${countParams.length}`;
    }
    if (action) {
      countParams.push(action);
      countSql += ` AND action = $${countParams.length}`;
    }

    const { rows: countRows } = await pool.query(countSql, countParams);
    const total = parseInt(countRows[0].count);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

/**
 * POST /v1/audit-logs
 * Create a new audit log entry
 */
export async function createAuditLog(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { entityId, entityType, action, details, userId } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO audit_log (
        event_type, severity, result, user_id, resource_type, resource_id,
        action, details, request_path, request_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'USER_ACTION',           // event_type (required NOT NULL)
      'INFO',                  // severity (required NOT NULL)
      'SUCCESS',               // result (required NOT NULL)
      userId,
      entityType,              // resource_type (was entity_type)
      entityId,                // resource_id (was entity_id)
      action,
      JSON.stringify(details),
      req.path,                // request_path
      req.method               // request_method
    ]);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
}
