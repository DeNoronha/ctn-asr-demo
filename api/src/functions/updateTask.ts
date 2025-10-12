import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { TaskService, UpdateTaskInput } from '../services/taskService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function updateTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const taskId = request.params.taskId;

    if (!taskId) {
      return {
        status: 400,
        jsonBody: { error: 'Task ID is required' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    const input: UpdateTaskInput = await request.json() as UpdateTaskInput;

    const taskService = new TaskService(pool);
    const task = await taskService.updateTask(taskId, input);

    return {
      status: 200,
      jsonBody: task,
      headers: { 'Access-Control-Allow-Origin': '*' },
    };

  } catch (error: any) {
    context.error('Error updating task:', error);

    if (error.message === 'Task not found') {
      return {
        status: 404,
        jsonBody: { error: 'Task not found' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Failed to update task', message: error.message },
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  }
}

app.http('updateTask', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/admin/tasks/{taskId}',
  handler: updateTask,
});
