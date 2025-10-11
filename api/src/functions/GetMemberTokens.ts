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

export async function GetMemberTokens(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GetMemberTokens function triggered');

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, body: JSON.stringify({ error: 'Missing or invalid authorization header' }) };
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userEmail = payload.email || payload.preferred_username || payload.upn;

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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ tokens: tokensResult.rows })
    };
  } catch (error) {
    context.error('Error fetching tokens:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch tokens' })
    };
  }
}

app.http('GetMemberTokens', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member/tokens',
  authLevel: 'anonymous',
  handler: GetMemberTokens
});
