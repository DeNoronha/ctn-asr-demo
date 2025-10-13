import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

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
    const body = await request.json() as any;

    const result = await pool.query(
      `UPDATE legal_entity_contact
       SET contact_type = COALESCE($1, contact_type),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           mobile = COALESCE($6, mobile),
           job_title = COALESCE($7, job_title),
           department = COALESCE($8, department),
           is_primary = COALESCE($9, is_primary),
           dt_modified = CURRENT_TIMESTAMP,
           modified_by = $10
       WHERE legal_entity_contact_id = $11
       RETURNING *`,
      [
        body.contact_type,
        body.first_name,
        body.last_name,
        body.email,
        body.phone,
        body.mobile,
        body.job_title,
        body.department,
        body.is_primary,
        request.userEmail || 'system',
        contactId
      ]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    context.error('Error updating contact:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to update contact' })
    };
  }
}

app.http('UpdateContact', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/contacts/{contactId}',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
