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

export async function GetAuthenticatedMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GetAuthenticatedMember function triggered');

  try {
    // Extract user identity from Azure AD token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      };
    }

    // Parse the JWT token to get user claims
    const token = authHeader.substring(7);
    const tokenParts = token.split('.');
    
    if (tokenParts.length !== 3) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Invalid token format' })
      };
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const userObjectId = payload.oid || payload.sub;
    const userEmail = payload.email || payload.preferred_username || payload.upn;

    if (!userObjectId && !userEmail) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Unable to identify user from token' })
      };
    }

    context.log(`Authenticated user: ${userEmail} (${userObjectId})`);

    // Query member data based on user's email
    let result = await pool.query(`
      SELECT DISTINCT
        m.org_id as "organizationId",
        m.legal_name as "legalName",
        m.lei,
        m.kvk,
        m.domain,
        m.status,
        m.membership_level as "membershipLevel",
        m.created_at as "createdAt",
        le.primary_legal_name as "entityName",
        le.entity_legal_form as "entityType",
        c.full_name as "contactName",
        c.email,
        c.job_title as "jobTitle"
      FROM members m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    // If no result, try matching by domain from email
    if (result.rows.length === 0 && userEmail) {
      const emailDomain = userEmail.split('@')[1];
      result = await pool.query(`
        SELECT 
          m.org_id as "organizationId",
          m.legal_name as "legalName",
          m.lei,
          m.kvk,
          m.domain,
          m.status,
          m.membership_level as "membershipLevel",
          m.created_at as "createdAt",
          le.primary_legal_name as "entityName",
          le.entity_legal_form as "entityType"
        FROM members m
        LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
        WHERE m.domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ 
          error: 'No member data found for this user',
          email: userEmail,
          objectId: userObjectId
        })
      };
    }

    return {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    context.error('Error fetching authenticated member:', error);
    return {
      status: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch member data',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('GetAuthenticatedMember', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member',
  authLevel: 'anonymous',
  handler: GetAuthenticatedMember
});
