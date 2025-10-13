import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { TaskService, CreateTaskInput } from '../services/taskService';
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
    const input: CreateTaskInput = await request.json() as CreateTaskInput;

    // Validation
    if (!input.task_type || !input.title || !input.description) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required fields: task_type, title, description'
        },
      };
    }

    const taskService = new TaskService(pool);
    const task = await taskService.createTask(input);

    return {
      status: 201,
      jsonBody: task,
    };

  } catch (error: any) {
    context.error('Error creating task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create task', message: error.message },
    };
  }
}

app.http('createTask', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/admin/tasks',
  handler: adminEndpoint(handler),
});
