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

export async function UpdateMemberProfile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('UpdateMemberProfile function triggered');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      };
    }

    // Get user from token
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userEmail = payload.email || payload.preferred_username || payload.upn;

    if (!userEmail) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Unable to identify user from token' })
      };
    }

    // Get member's org_id
    const memberResult = await pool.query(`
      SELECT m.org_id, m.legal_entity_id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'Member not found' })
      };
    }

    const { org_id, legal_entity_id } = memberResult.rows[0];
    const updateData = await request.json() as any;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update member table
      if (updateData.domain || updateData.metadata) {
        const memberUpdates: string[] = [];
        const memberValues: any[] = [];
        let paramIndex = 1;

        if (updateData.domain) {
          memberUpdates.push(`domain = $${paramIndex++}`);
          memberValues.push(updateData.domain);
        }
        if (updateData.metadata) {
          memberUpdates.push(`metadata = $${paramIndex++}`);
          memberValues.push(JSON.stringify(updateData.metadata));
        }

        memberUpdates.push(`updated_at = now()`);
        memberValues.push(org_id);

        await pool.query(`
          UPDATE members 
          SET ${memberUpdates.join(', ')}
          WHERE org_id = $${paramIndex}
        `, memberValues);
      }

      // Update legal_entity table
      if (legal_entity_id && (updateData.address_line1 || updateData.postal_code || updateData.city || updateData.country_code)) {
        const leUpdates: string[] = [];
        const leValues: any[] = [];
        let paramIndex = 1;

        if (updateData.address_line1) {
          leUpdates.push(`address_line1 = $${paramIndex++}`);
          leValues.push(updateData.address_line1);
        }
        if (updateData.address_line2 !== undefined) {
          leUpdates.push(`address_line2 = $${paramIndex++}`);
          leValues.push(updateData.address_line2);
        }
        if (updateData.postal_code) {
          leUpdates.push(`postal_code = $${paramIndex++}`);
          leValues.push(updateData.postal_code);
        }
        if (updateData.city) {
          leUpdates.push(`city = $${paramIndex++}`);
          leValues.push(updateData.city);
        }
        if (updateData.province) {
          leUpdates.push(`province = $${paramIndex++}`);
          leValues.push(updateData.province);
        }
        if (updateData.country_code) {
          leUpdates.push(`country_code = $${paramIndex++}`);
          leValues.push(updateData.country_code);
        }

        leUpdates.push(`dt_modified = now()`);
        leUpdates.push(`modified_by = $${paramIndex++}`);
        leValues.push(userEmail);
        leValues.push(legal_entity_id);

        await pool.query(`
          UPDATE legal_entity 
          SET ${leUpdates.join(', ')}
          WHERE legal_entity_id = $${paramIndex}
        `, leValues);
      }

      // Log audit event
      await pool.query(`
        INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
        VALUES ('MEMBER_PROFILE_UPDATE', $1, 'MEMBER', $2, 'UPDATE', 'SUCCESS', $3)
      `, [org_id, org_id, JSON.stringify({ updated_by: userEmail, changes: updateData })]);

      await pool.query('COMMIT');

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Profile updated successfully' })
      };
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    context.error('Error updating member profile:', error);
    return {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('UpdateMemberProfile', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/member/profile',
  authLevel: 'anonymous',
  handler: UpdateMemberProfile
});
