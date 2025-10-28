import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMemberContacts function triggered');

  try {
    const pool = getPool();
    const { partyId } = request;

    // SECURITY: Require partyId from JWT token (prevent IDOR)
    if (!partyId) {
      context.warn('GetMemberContacts: Missing partyId in JWT token', { userEmail: request.userEmail });
      return { status: 403, body: JSON.stringify({ error: 'Forbidden: Missing party association' }) };
    }

    // Get member's legal_entity_id using partyId (NOT email)
    const memberResult = await pool.query(`
      SELECT le.legal_entity_id
      FROM legal_entity le
      WHERE le.party_id = $1
      LIMIT 1
    `, [partyId]);

    if (memberResult.rows.length === 0) {
      context.warn('GetMemberContacts: Legal entity not found for partyId', { partyId });
      return { status: 404, body: JSON.stringify({ error: 'Member not found' }) };
    }

    const { legal_entity_id } = memberResult.rows[0];

    // Get all contacts for this member's legal entity
    const result = await pool.query(`
      SELECT
        legal_entity_contact_id,
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
        dt_created,
        dt_modified
      FROM legal_entity_contact
      WHERE legal_entity_id = $1
      ORDER BY is_primary DESC, full_name ASC
    `, [legal_entity_id]);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: result.rows
      })
    };
  } catch (error) {
    context.error('Error getting contacts:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to get contacts' })
    };
  }
}

app.http('GetMemberContacts', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member-contacts',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
