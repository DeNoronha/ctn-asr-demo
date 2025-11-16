import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const contactId = request.params.contactId;

  if (!contactId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'contact_id parameter is required' })
    };
  }

  try {
    const pool = getPool();
    // Soft delete
    const result = await pool.query(
      `UPDATE legal_entity_contact
       SET is_deleted = TRUE, dt_modified = CURRENT_TIMESTAMP
       WHERE legal_entity_contact_id = $1
       RETURNING legal_entity_contact_id`,
      [contactId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    return {
      status: 204,
      body: ''
    };
  } catch (error) {
    context.error('Error deleting contact:', error);
    return handleError(error, context);
  }
}

app.http('DeleteContact', {
  methods: ['DELETE', 'OPTIONS'],
  route: 'v1/contacts/{contactId}',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
