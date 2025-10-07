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

export async function CreateMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any;
    
    // Validate required fields
    if (!body.org_id || !body.legal_name || !body.domain) {
      return {
        status: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: org_id, legal_name, domain' 
        })
      };
    }

    // Insert new member
    const result = await pool.query(
      `INSERT INTO members (org_id, legal_name, lei, kvk, domain, status, membership_level, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING org_id, legal_name, lei, kvk, domain, status, membership_level, created_at`,
      [
        body.org_id,
        body.legal_name,
        body.lei || null,
        body.kvk || null,
        body.domain,
        body.status || 'PENDING',
        body.membership_level || 'BASIC',
        body.metadata ? JSON.stringify(body.metadata) : null
      ]
    );

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error: any) {
    context.error('Error creating member:', error);
    
    // Handle duplicate org_id
    if (error.code === '23505') {
      return {
        status: 409,
        body: JSON.stringify({ error: 'Member with this org_id already exists' })
      };
    }
    
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create member' })
    };
  }
}

app.http('CreateMember', {
  methods: ['POST'],
  route: 'v1/members',
  authLevel: 'anonymous',
  handler: CreateMember
});
