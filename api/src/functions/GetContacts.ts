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

export async function GetContacts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;
  
  if (!legalEntityId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'legal_entity_id parameter is required' })
    };
  }

  try {
    const result = await pool.query(
      `SELECT legal_entity_contact_id, legal_entity_id, dt_created, dt_modified, 
              created_by, modified_by, is_deleted, contact_type, first_name, last_name,
              email, phone, mobile, job_title, department, is_primary,
              CONCAT(first_name, ' ', last_name) as full_name
       FROM legal_entity_contact 
       WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)
       ORDER BY is_primary DESC, last_name, first_name`,
      [legalEntityId]
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows)
    };
  } catch (error) {
    context.error('Error fetching contacts:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch contacts' })
    };
  }
}

app.http('GetContacts', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legalEntityId}/contacts',
  authLevel: 'anonymous',
  handler: GetContacts
});
