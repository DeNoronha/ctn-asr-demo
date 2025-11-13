// ========================================
// Generate BVAD Endpoint
// ========================================
// Generates BDI Verifiable Assurance Document for a member
// Answers: "Can this member be trusted?"

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import { generateBvad, RegistryIdentifier } from '../services/bdiJwtService';
import { DEFAULTS } from '../config/constants';
import { handleError } from '../utils/errors';
import crypto from 'crypto';

interface GenerateBvadRequest {
  memberDomain?: string;
  kvk?: string;
  lei?: string;
  audience?: string;
  validityHours?: number;
}

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Generate BVAD endpoint called');

  try {
    const pool = getPool();

    // Parse request body
    const body = await request.json() as GenerateBvadRequest;
    const { memberDomain, kvk, lei, audience, validityHours } = body;

    if (!memberDomain && !kvk && !lei) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'invalid_request',
          error_description: 'Must provide memberDomain, kvk, or lei to identify member',
        }),
      };
    }

    // Find member by domain, KvK, or LEI
    let memberQuery = `
      SELECT
        m.org_id,
        m.legal_name,
        m.domain,
        m.kvk,
        m.lei,
        m.status,
        m.membership_level,
        m.created_at,
        m.legal_entity_id,
        le.kvk_verification_status,
        le.kvk_verified_at,
        le.metadata,
        (
          SELECT json_agg(json_build_object(
            'name', c.full_name,
            'email', c.email,
            'role', c.job_title,
            'phone', c.phone
          ))
          FROM legal_entity_contact c
          WHERE c.legal_entity_id = m.legal_entity_id
            AND c.is_primary = true
            AND c.is_active = true
            AND (c.is_deleted IS NULL OR c.is_deleted = false)
          LIMIT 1
        ) as admin_contacts,
        (
          SELECT endpoint_url
          FROM legal_entity_endpoint
          WHERE legal_entity_id = m.legal_entity_id
            AND endpoint_type = 'BDI_CONNECTOR'
            AND is_active = true
            AND (is_deleted IS NULL OR is_deleted = false)
          LIMIT 1
        ) as bdi_connector_uri,
        (
          SELECT json_agg(json_build_object(
            'identifier_type', len.identifier_type,
            'identifier_value', len.identifier_value,
            'country_code', len.country_code,
            'registry_name', len.registry_name,
            'registry_url', len.registry_url
          ) ORDER BY
            CASE
              WHEN len.identifier_type = 'KVK' THEN 1
              WHEN len.identifier_type = 'LEI' THEN 2
              WHEN len.identifier_type = 'EUID' THEN 3
              ELSE 4
            END
          )
          FROM legal_entity_number len
          WHERE len.legal_entity_id = m.legal_entity_id
            AND (len.is_deleted IS NULL OR len.is_deleted = false)
        ) as registry_identifiers_json
      FROM v_members_full m
      LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (memberDomain) {
      memberQuery += ` AND m.domain = $${paramIndex}`;
      queryParams.push(memberDomain);
      paramIndex++;
    } else if (kvk) {
      memberQuery += ` AND m.kvk = $${paramIndex}`;
      queryParams.push(kvk);
      paramIndex++;
    } else if (lei) {
      memberQuery += ` AND m.lei = $${paramIndex}`;
      queryParams.push(lei);
      paramIndex++;
    }

    memberQuery += ' LIMIT 1';

    const result = await pool.query(memberQuery, queryParams);

    if (result.rows.length === 0) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'member_not_found',
          error_description: 'No member found with provided identifier',
        }),
      };
    }

    const member = result.rows[0];

    // Process registry identifiers from the main query (optimized N+1 → 1)
    let registryIdentifiers: RegistryIdentifier[] = [];
    let primaryCountryCode: string | undefined;
    let euidValue: string | undefined;

    // Parse the JSON aggregated identifiers from the main query
    const identifiersData = member.registry_identifiers_json || [];

    if (identifiersData.length > 0) {
      // Extract primary country code from the first identifier
      primaryCountryCode = identifiersData[0].country_code;

      // Build registryIdentifiers array
      for (const row of identifiersData) {
        // Handle EUID separately
        if (row.identifier_type === 'EUID') {
          euidValue = row.identifier_value;
        }

        registryIdentifiers.push({
          type: row.identifier_type,
          value: row.identifier_value,
          countryCode: row.country_code,
          registryName: row.registry_name,
        });
      }
    }

    // Check if member is in good standing
    if (member.status !== 'ACTIVE' && member.status !== 'APPROVED') {
      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'member_not_active',
          error_description: `Member status is ${member.status}. BVAD can only be issued for ACTIVE members.`,
          member_status: member.status,
        }),
      };
    }

    // Determine compliance status
    const complianceChecked = member.kvk_verification_status === 'verified';
    const complianceLastChecked = member.kvk_verified_at
      ? new Date(member.kvk_verified_at)
      : undefined;

    // For MVP, we'll set ownerChecked based on KvK verification
    const ownerChecked = complianceChecked;
    const ownerLastChecked = complianceLastChecked;

    // Extract admin contact
    let adminContact;
    if (member.admin_contacts && member.admin_contacts.length > 0) {
      const contact = member.admin_contacts[0];
      adminContact = {
        name: contact.name,
        email: contact.email,
        role: contact.role || 'Administrator',
        phone: contact.phone,
      };
    }

    // Generate BVAD token with all registry identifiers
    const bvadToken = generateBvad({
      memberDomain: member.domain,
      legalName: member.legal_name,
      kvk: member.kvk,
      lei: member.lei,
      euid: euidValue,
      countryCode: primaryCountryCode,
      registryIdentifiers: registryIdentifiers.length > 0 ? registryIdentifiers : undefined,
      status: member.status,
      complianceChecked,
      complianceLastChecked,
      ownerChecked,
      ownerLastChecked,
      termsVersion: member.metadata?.termsVersion || DEFAULTS.TERMS_VERSION,
      termsAcceptedAt: member.created_at ? new Date(member.created_at) : undefined,
      adminContact,
      bdiConnectorUri: member.bdi_connector_uri,
      validityHours: validityHours || DEFAULTS.BVAD_VALIDITY_HOURS,
    });

    // Decode token to get jti and claims
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(bvadToken, { complete: true });
    const jti = decoded?.payload?.jti;
    const claims = decoded?.payload;

    // Store issued token in database for audit
    const tokenHash = crypto.createHash('sha256').update(bvadToken).digest('hex');

    await pool.query(
      `
      INSERT INTO bvad_issued_tokens (
        legal_entity_id,
        jti,
        token_hash,
        issuer,
        subject,
        audience,
        issued_at,
        expires_at,
        claims_snapshot,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), to_timestamp($8), $9, $10)
    `,
      [
        member.legal_entity_id,
        jti,
        tokenHash,
        claims.iss,
        claims.sub,
        audience ? [audience] : null,
        claims.iat,
        claims.exp,
        JSON.stringify(claims),
        request.userId || 'system',
      ]
    );

    context.log(`BVAD generated for member: ${member.domain} (jti: ${jti})`);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bvad_token: bvadToken,
        token_type: 'Bearer',
        expires_in: (validityHours || 24) * 3600,
        member: {
          domain: member.domain,
          legal_name: member.legal_name,
          kvk: member.kvk,
          lei: member.lei,
          euid: euidValue,
          country_code: primaryCountryCode,
          registry_identifiers: registryIdentifiers,
          status: member.status,
        },
        jti,
      }),
    };
  } catch (error: any) {
    return handleError(error, context);
  }
}

// Register endpoint
// Requires authentication - only authorized BDI systems can request BVADs
app.http('generateBvad', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/bdi/bvad/generate',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ALL_ENTITIES], // Requires admin or external system auth
  }),
});
