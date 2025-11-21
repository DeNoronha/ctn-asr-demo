import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

export async function IssueToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const pool = getPool();
    const body = await request.json() as any;
    
    // Simple validation (in production, validate client credentials properly)
    if (!body.org_id) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'org_id is required' })
      };
    }

    // Get member details
    const memberResult = await pool.query(
      'SELECT * FROM members WHERE org_id = $1 AND status = $2',
      [body.org_id, 'ACTIVE']
    );

    if (memberResult.rows.length === 0) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Invalid credentials or inactive member' })
      };
    }

    const member = memberResult.rows[0];
    const jti = `bvad-${uuidv4()}`;
    const expiresIn = 3600; // 1 hour
    const now = Math.floor(Date.now() / 1000);

    // Create BVAD token payload (from technical specs)
    const payload = {
      iss: process.env.JWT_ISSUER,
      sub: member.org_id,
      aud: 'ctn:network',
      exp: now + expiresIn,
      iat: now,
      jti: jti,
      type: 'BVAD',
      org: {
        id: member.org_id,
        name: member.legal_name,
        lei: member.lei,
        kvk: member.kvk,
        domain: member.domain
      },
      membership: {
        level: member.membership_level,
        status: member.status,
        joined: member.created_at
      }
    };

    // Sign the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      context.error('JWT_SECRET environment variable is not configured');
      return {
        status: 500,
        body: JSON.stringify({ error: 'Server configuration error: JWT secret not configured' })
      };
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: 'HS256'
    });

    // Record token issuance
    await pool.query(
      'INSERT INTO issued_tokens (jti, token_type, member_id, expires_at) VALUES ($1, $2, $3, to_timestamp($4))',
      [jti, 'BVAD', member.id, now + expiresIn]
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: 'ctn:read ctn:write'
      })
    };
  } catch (error) {
    context.error('Error issuing token:', error);
    return handleError(error, context);
  }
}

app.http('IssueToken', {
  methods: ['POST'],
  route: 'v1/oauth/token',
  authLevel: 'anonymous',
  handler: IssueToken
});
