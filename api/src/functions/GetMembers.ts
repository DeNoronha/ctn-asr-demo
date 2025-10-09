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

export async function GetMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GetMembers function triggered');

  try {
    const result = await pool.query(
      'SELECT org_id, legal_name, lei, kvk, domain, status, membership_level, created_at, legal_entity_id FROM members ORDER BY created_at DESC'
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: result.rows,
        count: result.rows.length
      })
    };
  } catch (error) {
    context.error('Error fetching members:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch members' })
    };
  }
}

app.http('GetMembers', {
  methods: ['GET'],
  route: 'v1/members',
  authLevel: 'anonymous',
  handler: GetMembers
});
