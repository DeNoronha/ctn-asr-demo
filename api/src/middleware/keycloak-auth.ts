// ========================================
// Keycloak JWT Authentication Middleware
// ========================================
// Validates Keycloak JWT tokens for M2M (machine-to-machine) authentication
// Supports OAuth2.0 client credentials grant flow
// Uses JWKS (JSON Web Key Set) for public key retrieval
// Compatible with Cloud IAM (France) managed Keycloak hosting

import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { v4 as uuidv4 } from 'uuid';
import {
  createLogger,
  getOrCreateCorrelationId,
  logAuthEvent,
  logSecurityEvent,
} from '../utils/logger';
import { AuthenticatedRequest, JwtPayload } from './auth';

// Keycloak configuration from environment
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'ctn-asr-m2m';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || '';

// Validate required configuration on module load
if (!KEYCLOAK_REALM) {
  console.warn('WARNING: KEYCLOAK_REALM not configured. Keycloak authentication will fail.');
}
if (!KEYCLOAK_CLIENT_ID) {
  console.warn('WARNING: KEYCLOAK_CLIENT_ID not configured. Keycloak authentication will fail.');
}

// Construct full issuer URL
const FULL_ISSUER = `${KEYCLOAK_ISSUER}/realms/${KEYCLOAK_REALM}`;

// JWKS client for retrieving Keycloak public keys
const keycloakJwksClient = jwksClient({
  jwksUri: `${FULL_ISSUER}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Keycloak JWT payload interface
 * Extends base JwtPayload with Keycloak-specific claims
 * Omits 'aud' to redefine it with Keycloak's more flexible type
 */
export interface KeycloakJwtPayload extends Omit<JwtPayload, 'aud'> {
  sub: string; // Subject (service account ID or user ID)
  iss: string; // Issuer (Keycloak realm URL)
  aud: string | string[]; // Audience (client ID) - can be array
  exp: number; // Expiration time
  iat: number; // Issued at
  azp?: string; // Authorized party (client ID)
  scope?: string; // Granted scopes (space-separated)
  typ?: string; // Token type (usually "Bearer")

  // Keycloak-specific claims
  preferred_username?: string; // Username
  email?: string; // Email address
  email_verified?: boolean;
  name?: string; // Full name
  given_name?: string;
  family_name?: string;

  // Service account claims (M2M)
  clientId?: string; // Service account client ID
  clientHost?: string; // Client host
  clientAddress?: string; // Client IP address

  // Realm and resource access
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };

  // Groups
  groups?: string[];
}

/**
 * Get signing key from Keycloak JWKS endpoint
 */
function getKeycloakKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  keycloakJwksClient.getSigningKey(header.kid!, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validate Keycloak JWT token with signature verification
 * @param token JWT token string
 * @param context Invocation context for logging
 * @returns Decoded Keycloak JWT payload
 */
export async function validateKeycloakToken(
  token: string,
  context: InvocationContext
): Promise<KeycloakJwtPayload> {
  const logger = createLogger(context);
  const correlationId = uuidv4();

  return new Promise((resolve, reject) => {
    // Verify token with Keycloak public key
    jwt.verify(
      token,
      getKeycloakKey,
      {
        issuer: FULL_ISSUER,
        algorithms: ['RS256'],
        // Note: We skip audience validation here and do it manually
        // to support multiple audience formats
      },
      (err, decoded) => {
        if (err) {
          context.error('Keycloak JWT verification failed:', err.message);
          logSecurityEvent(logger, 'keycloak_token_validation_failed', correlationId, {
            error: err.message,
            token_prefix: token.substring(0, 20) + '...',
          });
          reject(new Error(`Invalid Keycloak token: ${err.message}`));
          return;
        }

        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Invalid Keycloak token payload'));
          return;
        }

        const payload = decoded as KeycloakJwtPayload;

        // Manual audience validation
        // Keycloak tokens can have audience as:
        // 1. Client ID (our API client)
        // 2. Array of audiences (multiple clients)
        const audienceArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        const validAudiences = [
          KEYCLOAK_CLIENT_ID,
          'account', // Keycloak default client
        ].filter(Boolean); // Remove empty strings

        const audienceValid = audienceArray.some(aud =>
          validAudiences.includes(aud)
        );

        if (!audienceValid) {
          context.error(
            `Keycloak audience validation failed. Expected one of: ${validAudiences.join(', ')}, got: ${JSON.stringify(payload.aud)}`
          );
          logSecurityEvent(logger, 'keycloak_invalid_audience', correlationId, {
            expected_audiences: validAudiences.join(', '),
            received_audience: JSON.stringify(payload.aud),
            issuer: payload.iss,
            subject: payload.sub,
          });
          reject(new Error(`Invalid audience. Expected API client ID.`));
          return;
        }

        // Validate required claims
        if (!payload.sub) {
          reject(new Error('Keycloak token missing subject (sub) claim'));
          return;
        }

        // Log successful validation
        const clientId = payload.azp || payload.clientId || payload.preferred_username || payload.sub;
        context.log('Keycloak token validated successfully for client:', clientId);

        logAuthEvent(logger, true, correlationId, {
          event: 'keycloak_token_validated',
          client_id: clientId,
          subject: payload.sub,
          scopes: payload.scope,
          username: payload.preferred_username,
          email: payload.email,
        });

        resolve(payload);
      }
    );
  });
}

/**
 * Resolve party ID from Keycloak service account
 * Maps Keycloak client ID to CTN ASR party record
 *
 * @param clientId Keycloak client ID (from azp or clientId claim)
 * @param context Invocation context for logging
 * @returns Party ID or null if not found
 */
export async function resolvePartyIdFromKeycloak(
  clientId: string,
  context: InvocationContext
): Promise<string | null> {
  try {
    // Import database pool dynamically to avoid circular dependencies
    const { getPool } = await import('../utils/database');
    const pool = getPool();

    // Query for party associated with this Keycloak client
    // Uses generic m2m_client_id column (renamed from zitadel_client_id)
    const result = await pool.query(
      `SELECT party_id
       FROM ctn_m2m_credentials
       WHERE m2m_client_id = $1
       AND is_active = true
       AND is_deleted = false
       LIMIT 1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      context.warn(`No party found for Keycloak client ID: ${clientId}`);
      return null;
    }

    const partyId = result.rows[0].party_id;
    context.log(`Resolved Keycloak client ${clientId} to party ${partyId}`);

    // Update last_used_at timestamp
    await pool.query(
      `UPDATE ctn_m2m_credentials
       SET last_used_at = NOW(),
           total_requests = total_requests + 1
       WHERE m2m_client_id = $1`,
      [clientId]
    );

    return partyId;
  } catch (error) {
    context.error('Error resolving party ID from Keycloak client:', error);
    return null;
  }
}

/**
 * Middleware: Authenticate requests using Keycloak JWT tokens
 * Supports M2M authentication via OAuth2.0 client credentials grant
 *
 * @param request HTTP request
 * @param context Invocation context
 * @returns Authenticated request or error response
 */
export async function authenticateKeycloak(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ request: AuthenticatedRequest } | HttpResponseInit> {
  const logger = createLogger(context);
  const correlationId = getOrCreateCorrelationId(request);

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      logSecurityEvent(logger, 'keycloak_missing_auth_header', correlationId, {
        url: request.url,
        method: request.method,
      });
      return {
        status: 401,
        jsonBody: {
          error: 'unauthorized',
          message: 'Missing Authorization header',
        },
      };
    }

    // Validate Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logSecurityEvent(logger, 'keycloak_invalid_auth_format', correlationId, {
        auth_header_prefix: authHeader.substring(0, 20),
      });
      return {
        status: 401,
        jsonBody: {
          error: 'unauthorized',
          message: 'Invalid Authorization header format. Expected: Bearer <token>',
        },
      };
    }

    const token = parts[1];

    // Validate JWT token
    const payload = await validateKeycloakToken(token, context);

    // Extract client ID (for service accounts)
    const clientId = payload.azp || payload.clientId || payload.preferred_username || payload.sub;

    // Resolve party ID from Keycloak client
    const partyId = await resolvePartyIdFromKeycloak(clientId, context);

    // Create authenticated request object
    const authenticatedRequest: AuthenticatedRequest = {
      method: request.method,
      url: request.url,
      headers: request.headers as any,
      query: request.query,
      params: request.params,
      text: request.text?.bind(request),
      json: request.json?.bind(request),
      arrayBuffer: request.arrayBuffer?.bind(request),

      // M2M authentication metadata
      user: payload as JwtPayload,
      isM2M: true,
      clientId: clientId,
      userId: payload.sub, // Service account ID or user ID
      userRoles: extractRolesFromKeycloak(payload),
      partyId: partyId || undefined,
    };

    logAuthEvent(logger, true, correlationId, {
      event: 'keycloak_authentication_success',
      client_id: clientId,
      party_id: partyId,
      roles: (authenticatedRequest.userRoles || []).join(', '),
      username: payload.preferred_username,
      email: payload.email,
    });

    return { request: authenticatedRequest };
  } catch (error: any) {
    context.error('Keycloak authentication failed:', error);

    logSecurityEvent(logger, 'keycloak_authentication_failed', correlationId, {
      error: error.message,
      url: request.url,
      method: request.method,
    });

    return {
      status: 401,
      jsonBody: {
        error: 'unauthorized',
        message: error.message || 'Authentication failed',
      },
    };
  }
}

/**
 * Extract roles from Keycloak token claims
 * Handles both scope-based and realm/resource access claims
 *
 * @param payload Keycloak JWT payload
 * @returns Array of role strings
 */
function extractRolesFromKeycloak(payload: KeycloakJwtPayload): string[] {
  const roles: string[] = [];

  // Extract from scope claim (space-separated)
  if (payload.scope) {
    const scopes = payload.scope.split(' ');
    // Filter out standard OIDC scopes, keep custom roles
    const customScopes = scopes.filter(
      s => !['openid', 'profile', 'email', 'offline_access', 'address', 'phone'].includes(s)
    );
    roles.push(...customScopes);
  }

  // Extract from realm_access roles
  if (payload.realm_access?.roles) {
    roles.push(...payload.realm_access.roles);
  }

  // Extract from resource_access roles (client-specific)
  if (payload.resource_access) {
    Object.values(payload.resource_access).forEach(clientAccess => {
      if (clientAccess.roles) {
        roles.push(...clientAccess.roles);
      }
    });
  }

  // Extract from groups
  if (payload.groups) {
    roles.push(...payload.groups);
  }

  return [...new Set(roles)]; // Remove duplicates
}

/**
 * Check if a request has a specific role from Keycloak
 *
 * @param request Authenticated request
 * @param requiredRole Role to check
 * @returns True if user has the role
 */
export function hasKeycloakRole(request: AuthenticatedRequest, requiredRole: string): boolean {
  if (!request.userRoles) {
    return false;
  }

  return request.userRoles.includes(requiredRole);
}

/**
 * Middleware: Require specific Keycloak role
 * Returns 403 if authenticated user doesn't have required role
 *
 * @param request Authenticated request
 * @param context Invocation context
 * @param requiredRole Role required to access endpoint
 * @returns Request or error response
 */
export function requireKeycloakRole(
  request: AuthenticatedRequest,
  context: InvocationContext,
  requiredRole: string
): { request: AuthenticatedRequest } | HttpResponseInit {
  const logger = createLogger(context);
  const correlationId = uuidv4();

  if (!hasKeycloakRole(request, requiredRole)) {
    logSecurityEvent(logger, 'keycloak_insufficient_permissions', correlationId, {
      client_id: request.clientId,
      required_role: requiredRole,
      user_roles: (request.userRoles || []).join(', '),
    });

    return {
      status: 403,
      jsonBody: {
        error: 'forbidden',
        message: `Insufficient permissions. Required role: ${requiredRole}`,
      },
    };
  }

  return { request };
}

/**
 * Dual authentication middleware: Azure AD or Keycloak
 * Attempts Azure AD first (for user authentication)
 * Falls back to Keycloak (for M2M authentication)
 *
 * @param request HTTP request
 * @param context Invocation context
 * @returns Authenticated request or error response
 */
export async function authenticateDual(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ request: AuthenticatedRequest } | HttpResponseInit> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return {
      status: 401,
      jsonBody: {
        error: 'unauthorized',
        message: 'Missing Authorization header',
      },
    };
  }

  // Try to detect which IDP issued the token by inspecting the token
  const token = authHeader.split(' ')[1];

  if (!token) {
    return {
      status: 401,
      jsonBody: {
        error: 'unauthorized',
        message: 'Invalid Authorization header format',
      },
    };
  }

  try {
    // Decode token header to check issuer (without verification)
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return {
        status: 401,
        jsonBody: {
          error: 'unauthorized',
          message: 'Invalid token format',
        },
      };
    }

    const payload = decoded.payload as any;

    // Check issuer to determine authentication provider
    if (payload.iss && (payload.iss.includes('cloud-iam.com') || payload.iss.includes('keycloak'))) {
      context.log('Detected Keycloak token, using Keycloak authentication');
      return authenticateKeycloak(request, context);
    } else if (payload.iss && payload.iss.includes('microsoftonline.com')) {
      context.log('Detected Azure AD token, using Azure AD authentication');
      // Import Azure AD auth dynamically to avoid circular dependencies
      const { authenticate } = await import('./auth');
      const result = await authenticate(request, context);
      // Transform AuthenticationResult to match expected return type
      if ('success' in result && result.success === true) {
        return { request: result.request };
      } else if ('success' in result && result.success === false) {
        return result.response;
      }
      // Fallback (should never reach here)
      return {
        status: 500,
        jsonBody: { error: 'Authentication failed with unexpected result' }
      };
    } else {
      context.error('Unknown token issuer:', payload.iss);
      return {
        status: 401,
        jsonBody: {
          error: 'unauthorized',
          message: 'Unknown authentication provider',
        },
      };
    }
  } catch (error: any) {
    context.error('Dual authentication error:', error);
    return {
      status: 401,
      jsonBody: {
        error: 'unauthorized',
        message: 'Authentication failed',
      },
    };
  }
}
