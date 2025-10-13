// ========================================
// Validate BVOD Endpoint
// ========================================
// Validates BDI Verifiable Orchestration Document
// Answers: "Is this member involved in this orchestration?"

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import { validateBvodToken, extractOrchestrationDetails } from '../services/bdiJwtService';

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Validate BVOD endpoint called');
  const startTime = Date.now();

  try {
    const pool = getPool();

    // Parse request body
    const body = await request.json();
    const { bvod_token, member_domain, check_role } = body;

    if (!bvod_token) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'invalid_request',
          error_description: 'bvod_token is required',
        }),
      };
    }

    if (!member_domain) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'invalid_request',
          error_description: 'member_domain is required to check involvement',
        }),
      };
    }

    // Step 1: Validate BVOD token signature and format
    const validationResult = await validateBvodToken(bvod_token);

    if (!validationResult.valid || !validationResult.claims) {
      // Log validation attempt
      await pool.query(
        `
        INSERT INTO bvod_validation_log (
          bvod_jti,
          bvod_issuer,
          bvod_subject,
          requested_by,
          request_ip_address,
          request_user_agent,
          validation_result,
          validation_reason,
          member_domain_checked,
          signature_valid,
          token_expired,
          token_not_yet_valid,
          validation_duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
        [
          null,
          null,
          null,
          request.userId || 'anonymous',
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          request.headers.get('user-agent'),
          'invalid',
          validationResult.reason,
          member_domain,
          validationResult.signatureValid || false,
          validationResult.expired || false,
          validationResult.notYetValid || false,
          Date.now() - startTime,
        ]
      );

      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: false,
          reason: validationResult.reason,
          validation: {
            signature_valid: validationResult.signatureValid,
            expired: validationResult.expired,
            not_yet_valid: validationResult.notYetValid,
          },
        }),
      };
    }

    const claims = validationResult.claims;

    // Step 2: Extract orchestration details from BVOD
    const orchestrationDetails = extractOrchestrationDetails(claims);

    // Step 3: Check if this orchestration exists in our database
    let orchestrationId: string | null = null;

    if (orchestrationDetails.internalOrderId) {
      const orchestrationResult = await pool.query(
        `
        SELECT orchestration_id
        FROM bdi_orchestrations
        WHERE internal_order_identifier = $1
          AND orchestrator_domain = $2
          AND (is_deleted IS NULL OR is_deleted = false)
        LIMIT 1
      `,
        [orchestrationDetails.internalOrderId, claims.iss.replace(/^https?:\/\//, '')]
      );

      if (orchestrationResult.rows.length > 0) {
        orchestrationId = orchestrationResult.rows[0].orchestration_id;
      }
    }

    // Step 4: Check if member is involved in orchestration
    let memberFoundInOrchestration = false;
    let memberRole: string | null = null;

    if (orchestrationId) {
      const participantResult = await pool.query(
        `
        SELECT participant_role, participant_status
        FROM bdi_orchestration_participants
        WHERE orchestration_id = $1
          AND participant_domain = $2
          AND participant_status = 'active'
          AND (is_deleted IS NULL OR is_deleted = false)
        LIMIT 1
      `,
        [orchestrationId, member_domain]
      );

      if (participantResult.rows.length > 0) {
        memberFoundInOrchestration = true;
        memberRole = participantResult.rows[0].participant_role;
      }
    } else {
      // Orchestration not in our database
      // Check if member domain appears in BVOD audience or subject company
      const normalizedMemberDomain = member_domain.toLowerCase().replace(/^https?:\/\//, '');

      // Check audience
      const participants = orchestrationDetails.participants || [];
      memberFoundInOrchestration = participants.some(
        (p) => p.toLowerCase().replace(/^https?:\/\//, '') === normalizedMemberDomain
      );

      // Check subject company
      if (!memberFoundInOrchestration && orchestrationDetails.subjectCompany) {
        const subjectDomain = orchestrationDetails.subjectCompany.domain
          ?.toLowerCase()
          .replace(/^https?:\/\//, '');
        if (subjectDomain === normalizedMemberDomain) {
          memberFoundInOrchestration = true;
          memberRole = orchestrationDetails.subjectCompany.role;
        }
      }

      // Check orchestrator
      if (!memberFoundInOrchestration && orchestrationDetails.orchestrator) {
        const orchestratorDomain = orchestrationDetails.orchestrator.domain
          ?.toLowerCase()
          .replace(/^https?:\/\//, '');
        if (orchestratorDomain === normalizedMemberDomain) {
          memberFoundInOrchestration = true;
          memberRole = 'Orchestrator';
        }
      }

      // Check customer
      if (!memberFoundInOrchestration && orchestrationDetails.customer) {
        const customerDomain = orchestrationDetails.customer.domain
          ?.toLowerCase()
          .replace(/^https?:\/\//, '');
        if (customerDomain === normalizedMemberDomain) {
          memberFoundInOrchestration = true;
          memberRole = 'Customer';
        }
      }
    }

    // Step 5: Check role if requested
    let roleMatches = true;
    if (check_role && memberRole) {
      roleMatches = memberRole.toLowerCase() === check_role.toLowerCase();
    }

    // Step 6: Log validation attempt
    await pool.query(
      `
      INSERT INTO bvod_validation_log (
        orchestration_id,
        bvod_jti,
        bvod_issuer,
        bvod_subject,
        requested_by,
        request_ip_address,
        request_user_agent,
        validation_result,
        validation_reason,
        member_domain_checked,
        member_found_in_orchestration,
        member_role_in_orchestration,
        token_claims,
        signature_valid,
        token_expired,
        token_not_yet_valid,
        validation_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `,
      [
        orchestrationId,
        claims.jti,
        claims.iss,
        claims.sub,
        request.userId || 'anonymous',
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        request.headers.get('user-agent'),
        memberFoundInOrchestration && roleMatches ? 'valid' : 'not_found',
        memberFoundInOrchestration
          ? roleMatches
            ? 'Member found in orchestration'
            : 'Member found but role mismatch'
          : 'Member not found in orchestration',
        member_domain,
        memberFoundInOrchestration,
        memberRole,
        JSON.stringify(orchestrationDetails),
        true,
        false,
        false,
        Date.now() - startTime,
      ]
    );

    // Step 7: Return validation result
    const finalResult = memberFoundInOrchestration && roleMatches;

    context.log(
      `BVOD validation: ${finalResult ? 'VALID' : 'INVALID'} - Member: ${member_domain}, Role: ${memberRole || 'N/A'}`
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valid: finalResult,
        member_involved: memberFoundInOrchestration,
        member_domain,
        member_role: memberRole,
        role_matches: roleMatches,
        orchestration: orchestrationId
          ? {
              orchestration_id: orchestrationId,
              in_database: true,
            }
          : {
              in_database: false,
              internal_order_id: orchestrationDetails.internalOrderId,
              orchestrator: orchestrationDetails.orchestrator?.domain,
            },
        token_validation: {
          signature_valid: true,
          expired: false,
          not_yet_valid: false,
        },
        validation_duration_ms: Date.now() - startTime,
      }),
    };
  } catch (error) {
    context.error('Error validating BVOD:', error);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'internal_server_error',
        error_description: 'Failed to validate BVOD token',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

// Register endpoint
// Requires authentication - only authorized BDI systems can validate BVODs
app.http('validateBvod', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/bdi/bvod/validate',
  authLevel: 'anonymous',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_ALL_ENTITIES], // Requires admin or external system auth
  }),
});
