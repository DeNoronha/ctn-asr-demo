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

export async function UpdateMemberContact(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('UpdateMemberContact function triggered');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, body: JSON.stringify({ error: 'Missing or invalid authorization header' }) };
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userEmail = payload.email || payload.preferred_username || payload.upn;

    const contactId = request.params.contactId;
    if (!contactId) {
      return { status: 400, body: JSON.stringify({ error: 'Contact ID is required' }) };
    }

    // Verify this contact belongs to the user's organization
    const verifyResult = await pool.query(`
      SELECT c.legal_entity_id, m.org_id
      FROM legal_entity_contact c
      JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
      JOIN members m ON le.legal_entity_id = m.legal_entity_id
      JOIN legal_entity_contact uc ON m.legal_entity_id = uc.legal_entity_id
      WHERE c.legal_entity_contact_id = $1 AND uc.email = $2 AND uc.is_active = true
    `, [contactId, userEmail]);

    if (verifyResult.rows.length === 0) {
      return { status: 403, body: JSON.stringify({ error: 'Not authorized to update this contact' }) };
    }

    const { org_id } = verifyResult.rows[0];
    const updateData = await request.json() as any;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.full_name) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(updateData.full_name);
    }
    if (updateData.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(updateData.first_name);
    }
    if (updateData.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(updateData.last_name);
    }
    if (updateData.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(updateData.email);
    }
    if (updateData.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(updateData.phone);
    }
    if (updateData.mobile !== undefined) {
      updates.push(`mobile = $${paramIndex++}`);
      values.push(updateData.mobile);
    }
    if (updateData.job_title !== undefined) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(updateData.job_title);
    }
    if (updateData.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(updateData.department);
    }
    if (updateData.contact_type) {
      updates.push(`contact_type = $${paramIndex++}`);
      values.push(updateData.contact_type);
    }

    updates.push(`dt_modified = now()`);
    updates.push(`modified_by = $${paramIndex++}`);
    values.push(userEmail);
    values.push(contactId);

    await pool.query(`
      UPDATE legal_entity_contact 
      SET ${updates.join(', ')}
      WHERE legal_entity_contact_id = $${paramIndex}
    `, values);

    // Log audit event
    await pool.query(`
      INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
      VALUES ('CONTACT_UPDATE', $1, 'CONTACT', $2, 'UPDATE', 'SUCCESS', $3)
    `, [org_id, contactId, JSON.stringify({ updated_by: userEmail, changes: updateData })]);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Contact updated successfully' })
    };
  } catch (error) {
    context.error('Error updating contact:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to update contact' })
    };
  }
}

app.http('UpdateMemberContact', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/member/contacts/{contactId}',
  authLevel: 'anonymous',
  handler: UpdateMemberContact
});
