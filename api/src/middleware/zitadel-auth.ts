// ========================================
// Zitadel JWT Authentication Middleware
// ========================================
// Validates Zitadel JWT tokens for M2M (machine-to-machine) authentication
// Supports OAuth2.0 client credentials grant flow
// Uses JWKS (JSON Web Key Set) for public key retrieval

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

// Zitadel configuration from environment
const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'http://localhost:8080';
const ZITADEL_PROJECT_ID = process.env.ZITADEL_PROJECT_ID || '';
const ZITADEL_API_CLIENT_ID = process.env.ZITADEL_API_CLIENT_ID || '';

// Validate required configuration on module load
if (!ZITADEL_PROJECT_ID) {
  console.warn('WARNING: ZITADEL_PROJECT_ID not configured. Zitadel authentication will fail.');
}
if (!ZITADEL_API_CLIENT_ID) {
  console.warn('WARNING: ZITADEL_API_CLIENT_ID not configured. Zitadel authentication will fail.');
}

// JWKS client for retrieving Zitadel public keys
const zitadelJwksClient = jwksClient({
  jwksUri: `${ZITADEL_ISSUER}/oauth/v2/keys`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Zitadel JWT payload interface
 * Extends base JwtPayload with Zitadel-specific claims
 * Omits 'aud' to redefine it with Zitadel's more flexible type
 */
export interface ZitadelJwtPayload extends Omit<JwtPayload, 'aud'> {
  sub: string; // Subject (service account ID)
  iss: string; // Issuer (Zitadel instance URL)
  aud: string | string[]; // Audience (project ID or client ID) - can be array in Zitadel
  exp: number; // Expiration time
  iat: number; // Issued at
  azp?: string; // Authorized party (client ID)
  client_id?: string; // Client ID (alternative claim)
  scope?: string; // Granted scopes (space-separated)

  // Zitadel organization claims
  'urn:zitadel:iam:org:id'?: string;
  'urn:zitadel:iam:org:domain'?: string;

  // Zitadel user metadata
  'urn:zitadel:iam:user:resourceowner:id'?: string;
  'urn:zitadel:iam:user:resourceowner:name'?: string;
  'urn:zitadel:iam:user:resourceowner:primary_domain'?: string;

  // Project and role claims
  'urn:zitadel:iam:org:project:roles'?: Record<string, Record<string, string>>;
}

/**
 * Get signing key from Zitadel JWKS endpoint
 */
function getZitadelKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  zitadelJwksClient.getSigningKey(header.kid!, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validate Zitadel JWT token with signature verification
 * @param token JWT token string
 * @param context Invocation context for logging
 * @returns Decoded Zitadel JWT payload
 */
export async function validateZitadelToken(
  token: string,
  context: InvocationContext
): Promise<ZitadelJwtPayload> {
  const logger = createLogger(context);
  const correlationId = uuidv4();

  return new Promise((resolve, reject) => {
    // Verify token with Zitadel public key
    jwt.verify(
      token,
      getZitadelKey,
      {
        issuer: ZITADEL_ISSUER,
        algorithms: ['RS256'],
        // Note: We skip audience validation here and do it manually
        // to support multiple audience formats
      },
      (err, decoded) => {
        if (err) {
          context.error('Zitadel JWT verification failed:', err.message);
          logSecurityEvent(logger, 'zitadel_token_validation_failed', correlationId, {
            error: err.message,
            token_prefix: token.substring(0, 20) + '...',
          });
          reject(new Error(`Invalid Zitadel token: ${err.message}`));
          return;
        }

        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Invalid Zitadel token payload'));
          return;
        }

        const payload = decoded as ZitadelJwtPayload;

        // Manual audience validation
        // Zitadel tokens can have audience as:
        // 1. Project ID (recommended for project-scoped tokens)
        // 2. API Client ID
        // 3. Array of audiences
        const audienceArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        const validAudiences = [
          ZITADEL_PROJECT_ID,
          ZITADEL_API_CLIENT_ID,
        ].filter(Boolean); // Remove empty strings

        const audienceValid = audienceArray.some(aud =>
          validAudiences.includes(aud)
        );

        if (!audienceValid) {
          context.error(
            `Zitadel audience validation failed. Expected one of: ${validAudiences.join(', ')}, got: ${JSON.stringify(payload.aud)}`
          );
          logSecurityEvent(logger, 'zitadel_invalid_audience', correlationId, {
            expected_audiences: validAudiences.join(', '),
            received_audience: JSON.stringify(payload.aud),
            issuer: payload.iss,
            subject: payload.sub,
          });
          reject(new Error(`Invalid audience. Expected project or API client ID.`));
          return;
        }

        // Validate required claims
        if (!payload.sub) {
          reject(new Error('Zitadel token missing subject (sub) claim'));
          return;
        }

        // Log successful validation
        const clientId = payload.azp || payload.client_id || payload.sub;
        context.log('Zitadel token validated successfully for client:', clientId);

        logAuthEvent(logger, true, correlationId, {
          event: 'zitadel_token_validated',
          client_id: clientId,
          subject: payload.sub,
          scopes: payload.scope,
          organization: payload['urn:zitadel:iam:org:domain'],
        });

        resolve(payload);
      }
    );
  });
}

/**
 * Resolve party ID from Zitadel service account
 * Maps Zitadel client ID to CTN ASR party record
 *
 * @param clientId Zitadel client ID (from azp or client_id claim)
 * @param context Invocation context for logging
 * @returns Party ID or null if not found
 */
export async function resolvePartyIdFromZitadel(
  clientId: string,
  context: InvocationContext
): Promise<string | null> {
  try {
    // Import database pool dynamically to avoid circular dependencies
    const { getPool } = await import('../utils/database');
    const pool = getPool();

    // Query for party associated with this Zitadel client
    // Assumes parties table has a 'zitadel_client_id' column
    // Adjust query based on actual schema
    const result = await pool.query(
      `SELECT party_id
       FROM ctn_m2m_credentials
       WHERE zitadel_client_id = $1
       AND is_active = true
       LIMIT 1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      context.warn(`No party found for Zitadel client ID: ${clientId}`);
      return null;
    }

    const partyId = result.rows[0].party_id;
    context.log(`Resolved Zitadel client ${clientId} to party ${partyId}`);
    return partyId;
  } catch (error) {
    context.error('Error resolving party ID from Zitadel client:', error);
    return null;
  }
}

/**
 * Middleware: Authenticate requests using Zitadel JWT tokens
 * Supports M2M authentication via OAuth2.0 client credentials grant
 *
 * @param request HTTP request
 * @param context Invocation context
 * @returns Authenticated request or error response
 */
export async function authenticateZitadel(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ request: AuthenticatedRequest } | HttpResponseInit> {
  const logger = createLogger(context);
  const correlationId = getOrCreateCorrelationId(request);

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      logSecurityEvent(logger, 'zitadel_missing_auth_header', correlationId, {
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
      logSecurityEvent(logger, 'zitadel_invalid_auth_format', correlationId, {
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
    const payload = await validateZitadelToken(token, context);

    // Extract client ID
    const clientId = payload.azp || payload.client_id || payload.sub;

    // Resolve party ID from Zitadel client
    const partyId = await resolvePartyIdFromZitadel(clientId, context);

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
      userId: payload.sub, // Service account ID
      userRoles: extractRolesFromZitadel(payload),
      partyId: partyId || undefined,
    };

    logAuthEvent(logger, true, correlationId, {
      event: 'zitadel_authentication_success',
      client_id: clientId,
      party_id: partyId,
      roles: (authenticatedRequest.userRoles || []).join(', '),
      organization: payload['urn:zitadel:iam:org:domain'],
    });

    return { request: authenticatedRequest };
  } catch (error: any) {
    context.error('Zitadel authentication failed:', error);

    logSecurityEvent(logger, 'zitadel_authentication_failed', correlationId, {
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
 * Extract roles from Zitadel token claims
 * Handles both scope-based and project role claims
 *
 * @param payload Zitadel JWT payload
 * @returns Array of role strings
 */
function extractRolesFromZitadel(payload: ZitadelJwtPayload): string[] {
  const roles: string[] = [];

  // Extract from scope claim (space-separated)
  if (payload.scope) {
    const scopes = payload.scope.split(' ');
    // Filter out standard OIDC scopes, keep custom roles
    const customScopes = scopes.filter(
      s => !['openid', 'profile', 'email', 'offline_access'].includes(s)
    );
    roles.push(...customScopes);
  }

  // Extract from Zitadel project roles claim
  const projectRoles = payload['urn:zitadel:iam:org:project:roles'];
  if (projectRoles && typeof projectRoles === 'object') {
    // Format: { "project_id": { "role_key": "role_display_name" } }
    Object.values(projectRoles).forEach(projectRoleMap => {
      if (typeof projectRoleMap === 'object') {
        roles.push(...Object.keys(projectRoleMap));
      }
    });
  }

  return [...new Set(roles)]; // Remove duplicates
}

/**
 * Check if a request has a specific role from Zitadel
 *
 * @param request Authenticated request
 * @param requiredRole Role to check
 * @returns True if user has the role
 */
export function hasZitadelRole(request: AuthenticatedRequest, requiredRole: string): boolean {
  if (!request.isM2M || !request.userRoles) {
    return false;
  }

  return request.userRoles.includes(requiredRole);
}

/**
 * Middleware: Require specific Zitadel role
 * Returns 403 if authenticated user doesn't have required role
 *
 * @param request Authenticated request
 * @param context Invocation context
 * @param requiredRole Role required to access endpoint
 * @returns Request or error response
 */
export function requireZitadelRole(
  request: AuthenticatedRequest,
  context: InvocationContext,
  requiredRole: string
): { request: AuthenticatedRequest } | HttpResponseInit {
  const logger = createLogger(context);
  const correlationId = uuidv4();

  if (!hasZitadelRole(request, requiredRole)) {
    logSecurityEvent(logger, 'zitadel_insufficient_permissions', correlationId, {
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
 * Dual authentication middleware: Azure AD or Zitadel
 * Attempts Azure AD first (for user authentication)
 * Falls back to Zitadel (for M2M authentication)
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
  // This is a simple heuristic - in production you might want more sophisticated detection
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
    if (payload.iss && payload.iss.includes('zitadel')) {
      context.log('Detected Zitadel token, using Zitadel authentication');
      return authenticateZitadel(request, context);
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
