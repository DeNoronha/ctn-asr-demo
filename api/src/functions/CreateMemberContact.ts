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

export async function CreateMemberContact(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('CreateMemberContact function triggered');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, body: JSON.stringify({ error: 'Missing or invalid authorization header' }) };
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userEmail = payload.email || payload.preferred_username || payload.upn;

    // Get member's legal_entity_id and org_id
    const memberResult = await pool.query(`
      SELECT m.org_id, m.legal_entity_id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return { status: 404, body: JSON.stringify({ error: 'Member not found' }) };
    }

    const { org_id, legal_entity_id } = memberResult.rows[0];
    const contactData = await request.json() as any;

    // Insert new contact
    const result = await pool.query(`
      INSERT INTO legal_entity_contact (
        legal_entity_id,
        contact_type,
        full_name,
        first_name,
        last_name,
        email,
        phone,
        mobile,
        job_title,
        department,
        preferred_language,
        preferred_contact_method,
        is_primary,
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING legal_entity_contact_id
    `, [
      legal_entity_id,
      contactData.contact_type || 'TECHNICAL',
      contactData.full_name,
      contactData.first_name,
      contactData.last_name,
      contactData.email,
      contactData.phone,
      contactData.mobile,
      contactData.job_title,
      contactData.department,
      contactData.preferred_language || 'en',
      contactData.preferred_contact_method || 'EMAIL',
      contactData.is_primary || false,
      true,
      userEmail
    ]);

    // Log audit event
    await pool.query(`
      INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
      VALUES ('CONTACT_CREATE', $1, 'CONTACT', $2, 'CREATE', 'SUCCESS', $3)
    `, [org_id, result.rows[0].legal_entity_contact_id, JSON.stringify({ created_by: userEmail, contact_email: contactData.email })]);

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Contact created successfully',
        contactId: result.rows[0].legal_entity_contact_id
      })
    };
  } catch (error) {
    context.error('Error creating contact:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to create contact' })
    };
  }
}

app.http('CreateMemberContact', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/member/contacts',
  authLevel: 'anonymous',
  handler: CreateMemberContact
});
