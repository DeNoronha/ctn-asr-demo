/**
 * Tasks Controller
 *
 * Handles admin task operations.
 * Admin tasks track workflow items requiring administrator attention.
 *
 * @module controllers/tasks
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * GET /v1/tasks
 * Get tasks with pagination and filtering
 */
export async function getTasks(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { status, page = '1', limit = '50' } = req.query;

    let query = `SELECT * FROM admin_tasks WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM admin_tasks WHERE 1=1`;
    const countParams: any[] = [];
    if (status) {
      countQuery += ` AND status = $1`;
      countParams.push(status);
    }
    const { rows: countRows } = await pool.query(countQuery, countParams);

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countRows[0].count),
        totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

/**
 * GET /v1/admin/tasks/list
 * Get admin tasks with advanced filtering
 * Supports status, priority, task_type, assigned_to, and overdue filters
 */
export async function getAdminTasksList(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const taskType = req.query.task_type as string;
    const assignedTo = req.query.assigned_to as string;
    const includeOverdue = req.query.include_overdue === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    let sql = `
      SELECT *
      FROM admin_tasks
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND priority = $${params.length}`;
    }
    if (taskType) {
      params.push(taskType);
      sql += ` AND task_type = $${params.length}`;
    }
    if (assignedTo) {
      params.push(assignedTo);
      sql += ` AND assigned_to = $${params.length}`;
    }
    if (includeOverdue) {
      sql += ` AND due_date < NOW() AND status != 'completed'`;
    }

    params.push(limit);
    sql += ` ORDER BY priority DESC, due_date ASC LIMIT $${params.length}`;

    const { rows } = await pool.query(sql, params);

    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching admin tasks:', error);
    res.status(500).json({ error: 'Failed to fetch admin tasks' });
  }
}

/**
 * PUT /v1/admin/tasks/:taskId
 * Update an admin task
 */
export async function updateAdminTask(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { taskId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.status !== undefined) {
      paramCount++;
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      paramCount++;
      fields.push(`priority = $${paramCount}`);
      values.push(updates.priority);
    }
    if (updates.assigned_to !== undefined) {
      paramCount++;
      fields.push(`assigned_to = $${paramCount}`);
      values.push(updates.assigned_to);
    }
    if (updates.due_date !== undefined) {
      paramCount++;
      fields.push(`due_date = $${paramCount}`);
      values.push(updates.due_date);
    }
    if (updates.notes !== undefined) {
      paramCount++;
      fields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    paramCount++;
    fields.push(`dt_modified = NOW()`);
    values.push(taskId);

    const sql = `UPDATE admin_tasks SET ${fields.join(', ')} WHERE task_id = $${paramCount} RETURNING *`;

    const { rows, rowCount } = await pool.query(sql, values);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating admin task:', error);
    res.status(500).json({ error: 'Failed to update admin task' });
  }
}
