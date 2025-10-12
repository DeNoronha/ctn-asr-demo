import { Pool } from 'pg';

export type TaskType =
  | 'kvk_verification'
  | 'member_approval'
  | 'document_review'
  | 'support_ticket'
  | 'token_renewal'
  | 'billing_issue'
  | 'compliance_check'
  | 'manual_review'
  | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface AdminTask {
  task_id: string;
  task_type: TaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  assigned_to_email?: string;
  assigned_at?: string;
  related_entity_id?: string;
  related_subscription_id?: string;
  related_newsletter_id?: string;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  resolution?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  tags?: string[];
  metadata?: any;
}

export interface CreateTaskInput {
  task_type: TaskType;
  title: string;
  description: string;
  priority?: TaskPriority;
  assigned_to?: string;
  assigned_to_email?: string;
  related_entity_id?: string;
  related_subscription_id?: string;
  related_newsletter_id?: string;
  due_date?: string;
  created_by?: string;
  tags?: string[];
  metadata?: any;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigned_to?: string;
  assigned_to_email?: string;
  due_date?: string;
  resolution?: string;
  resolution_notes?: string;
  tags?: string[];
  metadata?: any;
}

export interface TaskDashboardStats {
  total_tasks: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  by_type: Record<TaskType, number>;
}

export class TaskService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all tasks with filters
   */
  async getAllTasks(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    task_type?: TaskType;
    assigned_to?: string;
    related_entity_id?: string;
    include_overdue?: boolean;
    limit?: number;
  }): Promise<AdminTask[]> {
    let query = `
      SELECT
        t.*,
        le.legal_name as related_entity_name,
        le.org_id as related_entity_org_id
      FROM admin_tasks t
      LEFT JOIN legal_entity le ON t.related_entity_id = le.legal_entity_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.priority) {
      query += ` AND t.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters?.task_type) {
      query += ` AND t.task_type = $${paramIndex}`;
      params.push(filters.task_type);
      paramIndex++;
    }

    if (filters?.assigned_to) {
      query += ` AND t.assigned_to = $${paramIndex}`;
      params.push(filters.assigned_to);
      paramIndex++;
    }

    if (filters?.related_entity_id) {
      query += ` AND t.related_entity_id = $${paramIndex}`;
      params.push(filters.related_entity_id);
      paramIndex++;
    }

    if (filters?.include_overdue) {
      query += ` AND t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled')`;
    }

    query += ` ORDER BY
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    `;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<AdminTask | null> {
    const result = await this.pool.query(
      `SELECT
        t.*,
        le.legal_name as related_entity_name,
        le.org_id as related_entity_org_id,
        le.primary_contact_email as related_entity_email
      FROM admin_tasks t
      LEFT JOIN legal_entity le ON t.related_entity_id = le.legal_entity_id
      WHERE t.task_id = $1`,
      [taskId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create new task
   */
  async createTask(input: CreateTaskInput): Promise<AdminTask> {
    const result = await this.pool.query(
      `INSERT INTO admin_tasks (
        task_type,
        title,
        description,
        priority,
        assigned_to,
        assigned_to_email,
        related_entity_id,
        related_subscription_id,
        related_newsletter_id,
        due_date,
        created_by,
        tags,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        input.task_type,
        input.title,
        input.description,
        input.priority || 'medium',
        input.assigned_to,
        input.assigned_to_email,
        input.related_entity_id,
        input.related_subscription_id,
        input.related_newsletter_id,
        input.due_date,
        input.created_by,
        input.tags,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );

    // If assigned, update assigned_at timestamp
    if (input.assigned_to || input.assigned_to_email) {
      await this.pool.query(
        `UPDATE admin_tasks SET assigned_at = NOW() WHERE task_id = $1`,
        [result.rows[0].task_id]
      );
    }

    return result.rows[0];
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<AdminTask> {
    const current = await this.getTaskById(taskId);
    if (!current) {
      throw new Error('Task not found');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(input.priority);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);

      // If completing, set completed_at
      if (input.status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }
    if (input.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(input.assigned_to);
      updates.push(`assigned_at = NOW()`);
    }
    if (input.assigned_to_email !== undefined) {
      updates.push(`assigned_to_email = $${paramIndex++}`);
      params.push(input.assigned_to_email);
    }
    if (input.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      params.push(input.due_date);
    }
    if (input.resolution !== undefined) {
      updates.push(`resolution = $${paramIndex++}`);
      params.push(input.resolution);
    }
    if (input.resolution_notes !== undefined) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      params.push(input.resolution_notes);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(input.tags);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return current;
    }

    params.push(taskId);
    const result = await this.pool.query(
      `UPDATE admin_tasks
       SET ${updates.join(', ')}
       WHERE task_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM admin_tasks WHERE task_id = $1`,
      [taskId]
    );
  }

  /**
   * Assign task to user
   */
  async assignTask(
    taskId: string,
    assignedTo: string,
    assignedToEmail?: string
  ): Promise<AdminTask> {
    const result = await this.pool.query(
      `UPDATE admin_tasks
       SET assigned_to = $1,
           assigned_to_email = $2,
           assigned_at = NOW(),
           status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END
       WHERE task_id = $3
       RETURNING *`,
      [assignedTo, assignedToEmail, taskId]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    return result.rows[0];
  }

  /**
   * Complete task
   */
  async completeTask(
    taskId: string,
    completedBy: string,
    resolution?: string,
    resolutionNotes?: string
  ): Promise<AdminTask> {
    const result = await this.pool.query(
      `UPDATE admin_tasks
       SET status = 'completed',
           completed_at = NOW(),
           completed_by = $1,
           resolution = $2,
           resolution_notes = $3
       WHERE task_id = $4
       RETURNING *`,
      [completedBy, resolution, resolutionNotes, taskId]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    return result.rows[0];
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(): Promise<TaskDashboardStats> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue,
        COUNT(*) FILTER (WHERE due_date < NOW() + INTERVAL '24 hours' AND due_date > NOW() AND status NOT IN ('completed', 'cancelled')) as due_soon,
        COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
        COUNT(*) FILTER (WHERE priority = 'medium') as priority_medium,
        COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
        COUNT(*) FILTER (WHERE priority = 'urgent') as priority_urgent,
        COUNT(*) FILTER (WHERE task_type = 'kvk_verification') as type_kvk_verification,
        COUNT(*) FILTER (WHERE task_type = 'member_approval') as type_member_approval,
        COUNT(*) FILTER (WHERE task_type = 'document_review') as type_document_review,
        COUNT(*) FILTER (WHERE task_type = 'support_ticket') as type_support_ticket,
        COUNT(*) FILTER (WHERE task_type = 'token_renewal') as type_token_renewal,
        COUNT(*) FILTER (WHERE task_type = 'billing_issue') as type_billing_issue,
        COUNT(*) FILTER (WHERE task_type = 'compliance_check') as type_compliance_check,
        COUNT(*) FILTER (WHERE task_type = 'manual_review') as type_manual_review,
        COUNT(*) FILTER (WHERE task_type = 'other') as type_other
      FROM admin_tasks
    `);

    const row = result.rows[0];

    return {
      total_tasks: parseInt(row.total_tasks),
      pending: parseInt(row.pending),
      in_progress: parseInt(row.in_progress),
      completed: parseInt(row.completed),
      overdue: parseInt(row.overdue),
      due_soon: parseInt(row.due_soon),
      by_priority: {
        low: parseInt(row.priority_low),
        medium: parseInt(row.priority_medium),
        high: parseInt(row.priority_high),
        urgent: parseInt(row.priority_urgent)
      },
      by_type: {
        kvk_verification: parseInt(row.type_kvk_verification),
        member_approval: parseInt(row.type_member_approval),
        document_review: parseInt(row.type_document_review),
        support_ticket: parseInt(row.type_support_ticket),
        token_renewal: parseInt(row.type_token_renewal),
        billing_issue: parseInt(row.type_billing_issue),
        compliance_check: parseInt(row.type_compliance_check),
        manual_review: parseInt(row.type_manual_review),
        other: parseInt(row.type_other)
      }
    };
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<AdminTask[]> {
    return this.getAllTasks({ include_overdue: true });
  }

  /**
   * Get tasks by entity
   */
  async getTasksByEntity(legalEntityId: string): Promise<AdminTask[]> {
    return this.getAllTasks({ related_entity_id: legalEntityId });
  }

  /**
   * Get my tasks (assigned to specific user)
   */
  async getMyTasks(userId: string): Promise<AdminTask[]> {
    return this.getAllTasks({ assigned_to: userId });
  }

  /**
   * Create task from KvK verification
   */
  async createKvkVerificationTask(legalEntityId: string, flags: string[]): Promise<AdminTask> {
    return this.createTask({
      task_type: 'kvk_verification',
      title: 'Review KvK Document Verification',
      description: `KvK document verification flagged with: ${flags.join(', ')}. Manual review required.`,
      priority: 'high',
      related_entity_id: legalEntityId,
      due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Due in 48 hours
      tags: ['kvk', 'verification', 'flagged'],
      metadata: { flags }
    });
  }
}
