import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TaskService, UpdateTaskInput } from '../services/taskService';
import { adminEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {

  try {
    const pool = getPool();
    const taskId = request.params.taskId;

    if (!taskId) {
      return {
        status: 400,
        jsonBody: { error: 'Task ID is required' },
      };
    }

    const input: UpdateTaskInput = await request.json() as UpdateTaskInput;

    const taskService = new TaskService(pool);
    const task = await taskService.updateTask(taskId, input);

    return {
      status: 200,
      jsonBody: task,
    };

  } catch (error: any) {
    // Check for known business logic errors
    if (error.message === 'Task not found') {
      return {
        status: 404,
        jsonBody: { error: 'Task not found' },
      };
    }

    return handleError(error, context);
  }
}

app.http('updateTask', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/admin/tasks/{taskId}',
  handler: adminEndpoint(handler),
});
