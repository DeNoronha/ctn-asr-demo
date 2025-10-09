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

export async function CreateContact(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any;
    
    if (!body.legal_entity_id || !body.email) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'legal_entity_id and email are required' })
      };
    }

    const result = await pool.query(
      `INSERT INTO legal_entity_contact 
       (legal_entity_id, contact_type, first_name, last_name, email, phone, mobile, 
        job_title, department, is_primary, created_by, dt_created, dt_modified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        body.legal_entity_id,
        body.contact_type || 'Primary',
        body.first_name,
        body.last_name,
        body.email,
        body.phone,
        body.mobile,
        body.job_title,
        body.department,
        body.is_primary || false,
        body.created_by || 'system'
      ]
    );

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    context.error('Error creating contact:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create contact' })
    };
  }
}

app.http('CreateContact', {
  methods: ['POST'],
  route: 'v1/contacts',
  authLevel: 'anonymous',
  handler: CreateContact
});
