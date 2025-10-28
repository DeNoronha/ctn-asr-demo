// ========================================
// Tier-Based Authorization Middleware
// ========================================
// Enforces authentication tier requirements on API endpoints
// Tier 1 (eHerkenning): Full access
// Tier 2 (DNS): Sensitive data read + webhooks
// Tier 3 (Email): Public data only

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from './auth';
import { AuthenticationTier, tierService } from '../services/tierService';
import { createLogger } from '../utils/logger';

const logger = createLogger('TierAuthz');

/**
 * Extended request type with tier information
 */
export interface TierAuthenticatedRequest extends AuthenticatedRequest {
  tier?: AuthenticationTier;
  tierInfo?: {
    tier: AuthenticationTier;
    method: string;
    verifiedAt?: Date;
    reverificationDue?: Date;
  };
}

/**
 * Middleware to enforce minimum tier requirement
 * @param requiredTier - Minimum tier required (1 = most privileged, 3 = least)
 * @returns Middleware function
 */
export function requireTier(requiredTier: AuthenticationTier) {
  return async (
    request: TierAuthenticatedRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit | null> => {
    // Skip tier check for admin portal users (they use Azure AD, not member tiers)
    if (request.userRoles?.some(role => role.includes('Admin'))) {
      logger.info('Skipping tier check for admin user', {
        userId: request.user?.userId,
        roles: request.userRoles,
      });
      return null; // Pass through
    }

    // Get legal entity ID from request
    const legalEntityId = extractLegalEntityId(request);

    if (!legalEntityId) {
      logger.warn('Tier check failed: no legal entity ID found', {
        userId: request.user?.userId,
        path: request.url,
      });

      return {
        status: 403,
        jsonBody: {
          error: 'Forbidden',
          message: 'Legal entity ID is required for tier-based authorization',
          code: 'TIER_AUTH_NO_ENTITY',
        },
      };
    }

    try {
      // Check authorization
      const authCheck = await tierService.checkAuthorization(legalEntityId, requiredTier);

      if (!authCheck.granted) {
        // Log denial
        await tierService.logAuthorizationAttempt(
          legalEntityId,
          request.user?.userId || 'unknown',
          request.url || 'unknown',
          request.method || 'unknown',
          authCheck,
          {
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            requestPath: request.url,
          }
        );

        logger.warn('Tier authorization denied', {
          legalEntityId,
          userId: request.user?.userId,
          requiredTier,
          userTier: authCheck.userTier,
          reason: authCheck.denialReason,
          path: request.url,
        });

        return {
          status: 403,
          jsonBody: {
            error: 'Forbidden',
            message: authCheck.denialReason || 'Insufficient authentication tier',
            code: 'TIER_AUTH_INSUFFICIENT',
            details: {
              requiredTier: getTierName(requiredTier),
              yourTier: getTierName(authCheck.userTier),
              upgradeUrl: '/member/authentication/upgrade',
            },
          },
        };
      }

      // Attach tier info to request for downstream use
      const tierInfo = await tierService.getTierInfo(legalEntityId);
      if (tierInfo) {
        request.tier = tierInfo.tier;
        request.tierInfo = {
          tier: tierInfo.tier,
          method: tierInfo.method,
          verifiedAt: tierInfo.verifiedAt,
          reverificationDue: tierInfo.reverificationDue,
        };
      }

      logger.info('Tier authorization granted', {
        legalEntityId,
        userId: request.user?.userId,
        requiredTier,
        userTier: authCheck.userTier,
        path: request.url,
      });

      // Log successful authorization (for audit trail)
      await tierService.logAuthorizationAttempt(
        legalEntityId,
        request.user?.userId || 'unknown',
        request.url || 'unknown',
        request.method || 'unknown',
        authCheck,
        {
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          requestPath: request.url,
        }
      );

      return null; // Pass through
    } catch (error) {
      logger.error('Tier authorization error', error, {
        legalEntityId,
        userId: request.user?.userId,
        requiredTier,
        path: request.url,
      });

      return {
        status: 500,
        jsonBody: {
          error: 'Internal Server Error',
          message: 'Failed to check authentication tier',
          code: 'TIER_AUTH_ERROR',
        },
      };
    }
  };
}

/**
 * Extract legal entity ID from request
 * Checks in order: URL params, query params, body, user context
 */
function extractLegalEntityId(request: TierAuthenticatedRequest): string | null {
  // 1. Try URL parameters (e.g., /entities/{legalEntityId})
  const urlMatch = request.url?.match(/\/entities\/([a-f0-9-]{36})/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // 2. Try query parameters
  const url = new URL(request.url || '', 'http://localhost');
  const queryParam = url.searchParams.get('legalEntityId') || url.searchParams.get('legal_entity_id');
  if (queryParam) {
    return queryParam;
  }

  // 3. Try request body (if present)
  // Note: This assumes body is already parsed
  if (typeof request.body === 'object' && request.body !== null) {
    const body = request.body as Record<string, unknown>;
    if (typeof body.legalEntityId === 'string') {
      return body.legalEntityId;
    }
    if (typeof body.legal_entity_id === 'string') {
      return body.legal_entity_id;
    }
  }

  // 4. Try user context (for member portal requests)
  if (request.user?.legalEntityId) {
    return request.user.legalEntityId;
  }

  return null;
}

/**
 * Get human-readable tier name
 */
function getTierName(tier: AuthenticationTier): string {
  switch (tier) {
    case AuthenticationTier.TIER_1_EHERKENNING:
      return 'Tier 1 (eHerkenning)';
    case AuthenticationTier.TIER_2_DNS:
      return 'Tier 2 (DNS Verification)';
    case AuthenticationTier.TIER_3_EMAIL:
      return 'Tier 3 (Email Verification)';
    default:
      return 'Unknown';
  }
}

/**
 * Convenience middleware presets
 */
export const requireTier1 = requireTier(AuthenticationTier.TIER_1_EHERKENNING);
export const requireTier2 = requireTier(AuthenticationTier.TIER_2_DNS);
export const requireTier3 = requireTier(AuthenticationTier.TIER_3_EMAIL);

/**
 * Middleware to add tier info to request without enforcing
 * Useful for endpoints that want to know the tier but don't block
 */
export async function attachTierInfo(
  request: TierAuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit | null> {
  const legalEntityId = extractLegalEntityId(request);

  if (legalEntityId) {
    try {
      const tierInfo = await tierService.getTierInfo(legalEntityId);
      if (tierInfo) {
        request.tier = tierInfo.tier;
        request.tierInfo = {
          tier: tierInfo.tier,
          method: tierInfo.method,
          verifiedAt: tierInfo.verifiedAt,
          reverificationDue: tierInfo.reverificationDue,
        };
      }
    } catch (error) {
      logger.warn('Failed to attach tier info', error, { legalEntityId });
    }
  }

  return null; // Always pass through
}
