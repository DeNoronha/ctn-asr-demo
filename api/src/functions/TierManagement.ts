import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { adminEndpoint, memberEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { tierService, AuthenticationTier, AuthenticationMethod } from '../services/tierService';
import { dnsVerificationService } from '../services/dnsVerificationService';

// ===================================
// GET Tier Info
// ===================================
async function getTierInfo(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legalEntityId parameter is required' },
    };
  }

  try {
    const tierInfo = await tierService.getTierInfo(legalEntityId);

    if (!tierInfo) {
      return {
        status: 404,
        jsonBody: { error: 'Legal entity not found' },
      };
    }

    return {
      status: 200,
      jsonBody: {
        tier: tierInfo.tier,
        method: tierInfo.method,
        verifiedAt: tierInfo.verifiedAt,
        reverificationDue: tierInfo.reverificationDue,
        eherkenningLevel: tierInfo.eherkenningLevel,
      },
    };
  } catch (error) {
    context.error('Error fetching tier info', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch tier information' },
    };
  }
}

app.http('GetTierInfo', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/entities/{legalEntityId}/tier',
  authLevel: 'anonymous',
  handler: memberEndpoint(getTierInfo),
});

// ===================================
// Update Tier (Admin Only)
// ===================================
async function updateTier(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legalEntityId parameter is required' },
    };
  }

  try {
    const body = (await request.json()) as { tier?: number; method?: string; dnsVerifiedDomain?: string; eherkenningIdentifier?: string; eherkenningLevel?: string };
    const { tier, method, dnsVerifiedDomain, eherkenningIdentifier, eherkenningLevel } = body;

    if (!tier || !method) {
      return {
        status: 400,
        jsonBody: { error: 'tier and method are required' },
      };
    }

    await tierService.updateTier(legalEntityId, tier, method as AuthenticationMethod, {
      dnsVerifiedDomain,
      dnsVerifiedAt: dnsVerifiedDomain ? new Date() : undefined,
      eherkenningIdentifier,
      eherkenningLevel: eherkenningLevel as 'EH3' | 'EH4' | undefined,
    });

    context.log('Tier updated by admin', {
      legalEntityId,
      tier,
      method,
    });

    return {
      status: 200,
      jsonBody: { message: 'Tier updated successfully' },
    };
  } catch (error) {
    context.error('Error updating tier', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to update tier' },
    };
  }
}

app.http('UpdateTier', {
  methods: ['PUT', 'OPTIONS'],
  route: 'v1/entities/{legalEntityId}/tier',
  authLevel: 'anonymous',
  handler: adminEndpoint(updateTier),
});

// ===================================
// Generate DNS Token
// ===================================
async function generateDnsToken(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legalEntityId parameter is required' },
    };
  }

  try {
    const body = (await request.json()) as { domain?: string };
    const { domain } = body;

    if (!domain) {
      return {
        status: 400,
        jsonBody: { error: 'domain is required' },
      };
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid domain format' },
      };
    }

    const token = await dnsVerificationService.generateToken(legalEntityId, domain);
    const instructions = dnsVerificationService.getDnsSetupInstructions(token);

    context.log('DNS token generated', legalEntityId, domain, token.tokenId);

    return {
      status: 200,
      jsonBody: {
        tokenId: token.tokenId,
        domain: token.domain,
        token: token.token,
        recordName: token.recordName,
        expiresAt: token.expiresAt,
        instructions,
      },
    };
  } catch (error) {
    context.error('Error generating DNS token', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to generate DNS token' },
    };
  }
}

app.http('GenerateDnsToken', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/entities/{legalEntityId}/dns/token',
  authLevel: 'anonymous',
  handler: memberEndpoint(generateDnsToken),
});

// ===================================
// Verify DNS Token
// ===================================
async function verifyDnsToken(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const tokenId = request.params.tokenId;

  if (!tokenId) {
    return {
      status: 400,
      jsonBody: { error: 'tokenId parameter is required' },
    };
  }

  try {
    const result = await dnsVerificationService.verifyToken(tokenId);

    context.log('DNS token verification attempted', tokenId, result.verified);

    return {
      status: 200,
      jsonBody: {
        verified: result.verified,
        details: result.details,
        resolverResults: result.resolverResults,
      },
    };
  } catch (error) {
    context.error('Error verifying DNS token', error, { tokenId });
    return {
      status: 500,
      jsonBody: { error: 'Failed to verify DNS token' },
    };
  }
}

app.http('VerifyDnsToken', {
  methods: ['POST', 'OPTIONS'],
  route: 'v1/dns/verify/{tokenId}',
  authLevel: 'anonymous',
  handler: memberEndpoint(verifyDnsToken),
});

// ===================================
// Get Pending DNS Tokens
// ===================================
async function getPendingDnsTokens(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'legalEntityId parameter is required' },
    };
  }

  try {
    const tokens = await dnsVerificationService.getPendingTokens(legalEntityId);

    return {
      status: 200,
      jsonBody: {
        tokens: tokens.map(token => ({
          tokenId: token.tokenId,
          domain: token.domain,
          token: token.token,
          recordName: token.recordName,
          expiresAt: token.expiresAt,
          status: token.status,
        })),
      },
    };
  } catch (error) {
    context.error('Error fetching pending DNS tokens', error, { legalEntityId });
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch pending DNS tokens' },
    };
  }
}

app.http('GetPendingDnsTokens', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/entities/{legalEntityId}/dns/tokens',
  authLevel: 'anonymous',
  handler: memberEndpoint(getPendingDnsTokens),
});

// ===================================
// Get Tier Requirements (Public)
// ===================================
async function getTierRequirements(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const requirements = tierService.getTierRequirements();

    return {
      status: 200,
      jsonBody: { requirements },
    };
  } catch (error) {
    context.log('Error fetching tier requirements', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch tier requirements' },
    };
  }
}

app.http('GetTierRequirements', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/tiers/requirements',
  authLevel: 'anonymous',
  handler: getTierRequirements,
});

// ===================================
// Get Authorization Log (Admin Only)
// ===================================
async function getAuthorizationLog(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.query.get('legalEntityId');
  const limit = parseInt(request.query.get('limit') || '100');
  const offset = parseInt(request.query.get('offset') || '0');

  try {
    const { query: dbQuery } = await import('../utils/database');

    let sql = `
      SELECT
        log_id,
        legal_entity_id,
        user_identifier,
        requested_resource,
        requested_action,
        required_tier,
        user_tier,
        authorization_result,
        denial_reason,
        request_ip_address,
        created_at
      FROM authorization_log
    `;

    const params: (string | number)[] = [];
    if (legalEntityId) {
      sql += ' WHERE legal_entity_id = $1';
      params.push(legalEntityId);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await dbQuery(sql, params);

    return {
      status: 200,
      jsonBody: {
        data: result.rows,
        pagination: {
          limit,
          offset,
          total: result.rowCount,
        },
      },
    };
  } catch (error) {
    context.error('Error fetching authorization log', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch authorization log' },
    };
  }
}

app.http('GetAuthorizationLog', {
  methods: ['GET', 'OPTIONS'],
  route: 'v1/authorization-log',
  authLevel: 'anonymous',
  handler: adminEndpoint(getAuthorizationLog),
});
