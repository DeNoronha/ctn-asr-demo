import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticatedEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetAuthenticatedMember function triggered');

  try {
    const pool = getPool();
    // User info is already validated by middleware
    const userEmail = request.userEmail;
    const userId = request.userId;

    context.log(`Fetching member data for user: ${userEmail} (${userId})`);

    // Query member data with identifiers in a single query (optimized N+1 → 1)
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
        m.legal_entity_id as "legalEntityId",
        c.full_name as "contactName",
        c.email,
        c.job_title as "jobTitle",
        COALESCE(
          json_agg(
            json_build_object(
              'identifierType', len.identifier_type,
              'identifierValue', len.identifier_value,
              'countryCode', len.country_code,
              'registryName', len.registry_name,
              'registryUrl', len.registry_url,
              'validationStatus', len.validation_status
            )
            ORDER BY
              CASE len.identifier_type
                WHEN 'LEI' THEN 1
                WHEN 'EUID' THEN 2
                WHEN 'KVK' THEN 3
                ELSE 4
              END,
              len.identifier_type
          ) FILTER (WHERE len.identifier_type IS NOT NULL),
          '[]'::json
        ) as "registryIdentifiers"
      FROM v_members_full m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
        AND (len.is_deleted = false OR len.is_deleted IS NULL)
      WHERE c.email = $1 AND c.is_active = true
      GROUP BY m.org_id, m.legal_name, m.lei, m.kvk, m.domain, m.status,
               m.membership_level, m.created_at, le.primary_legal_name,
               le.entity_legal_form, m.legal_entity_id, c.full_name, c.email, c.job_title
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
          le.entity_legal_form as "entityType",
          m.legal_entity_id as "legalEntityId",
          COALESCE(
            json_agg(
              json_build_object(
                'identifierType', len.identifier_type,
                'identifierValue', len.identifier_value,
                'countryCode', len.country_code,
                'registryName', len.registry_name,
                'registryUrl', len.registry_url,
                'validationStatus', len.validation_status
              )
              ORDER BY
                CASE len.identifier_type
                  WHEN 'LEI' THEN 1
                  WHEN 'EUID' THEN 2
                  WHEN 'KVK' THEN 3
                  ELSE 4
                END,
                len.identifier_type
            ) FILTER (WHERE len.identifier_type IS NOT NULL),
            '[]'::json
          ) as "registryIdentifiers"
        FROM v_members_full m
        LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
        LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
          AND (len.is_deleted = false OR len.is_deleted IS NULL)
        WHERE m.domain = $1
        GROUP BY m.org_id, m.legal_name, m.lei, m.kvk, m.domain, m.status,
                 m.membership_level, m.created_at, le.primary_legal_name,
                 le.entity_legal_form, m.legal_entity_id
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
  } catch (error: any) {
    return handleError(error, context);
  }
}

// Register the endpoint with authentication
app.http('GetAuthenticatedMember', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/member',
  authLevel: 'anonymous',
  handler: authenticatedEndpoint(handler),
});
