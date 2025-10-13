import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { authenticatedEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: true }, // SSL validation enabled
});

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetAuthenticatedMember function triggered');

  try {
    // User info is already validated by middleware
    const userEmail = request.userEmail;
    const userId = request.userId;

    context.log(`Fetching member data for user: ${userEmail} (${userId})`);

    // Query member data based on user's email
    let result = await pool.query(
      `
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
    `,
      [userEmail]
    );

    // If no result, try matching by domain from email
    if (result.rows.length === 0 && userEmail) {
      const emailDomain = userEmail.split('@')[1];
      result = await pool.query(
        `
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
      `,
        [emailDomain]
      );
    }

    if (result.rows.length === 0) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'not_found',
          error_description: 'No member data found for this user',
          email: userEmail,
          userId: userId,
        }),
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    context.error('Error fetching authenticated member:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'internal_server_error',
        error_description: 'Failed to fetch member data',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

// Register the endpoint with authentication
app.http('GetAuthenticatedMember', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member',
  authLevel: 'anonymous',
  handler: authenticatedEndpoint(handler),
});
