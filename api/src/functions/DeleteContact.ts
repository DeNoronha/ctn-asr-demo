import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

export async function DeleteContact(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const contactId = request.params.contactId;
  
  if (!contactId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'contact_id parameter is required' })
    };
  }

  try {
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
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to delete contact' })
    };
  }
}

app.http('DeleteContact', {
  methods: ['DELETE'],
  route: 'v1/contacts/{contactId}',
  authLevel: 'anonymous',
  handler: DeleteContact
});
