import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { TaskService } from '../services/taskService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const taskService = new TaskService(pool);

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as any || undefined;
    const priority = url.searchParams.get('priority') as any || undefined;
    const taskType = url.searchParams.get('task_type') as any || undefined;
    const assignedTo = url.searchParams.get('assigned_to') || undefined;
    const includeOverdue = url.searchParams.get('include_overdue') === 'true';
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

    const tasks = await taskService.getAllTasks({
      status,
      priority,
      task_type: taskType,
      assigned_to: assignedTo,
      include_overdue: includeOverdue,
      limit
    });

    return {
      status: 200,
      jsonBody: tasks,
    };

  } catch (error: any) {
    context.error('Error fetching tasks:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch tasks', message: error.message },
    };
  }
}

app.http('getTasks', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/admin/tasks',
  handler: adminEndpoint(handler),
});
