import { app, HttpResponseInit, InvocationContext } from "@azure/functions";
import { memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetMemberTokens function triggered');

  try {
    const pool = getPool();
    const userEmail = request.userEmail;

    // Get member's ID
    const memberResult = await pool.query(`
      SELECT m.id, m.org_id
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    if (memberResult.rows.length === 0) {
      return { status: 404, body: JSON.stringify({ error: 'Member not found' }) };
    }

    const { id: memberId } = memberResult.rows[0];

    // Get all tokens
    const tokensResult = await pool.query(`
      SELECT
        jti,
        token_type,
        issued_at,
        expires_at,
        revoked,
        metadata
      FROM issued_tokens
      WHERE member_id = $1
      ORDER BY issued_at DESC
      LIMIT 50
    `, [memberId]);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokens: tokensResult.rows })
    };
  } catch (error) {
    context.error('Error fetching tokens:', error);
    return handleError(error, context);
  }
}

app.http('GetMemberTokens', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member/tokens',
  authLevel: 'anonymous',
  handler: memberEndpoint(handler)
});
