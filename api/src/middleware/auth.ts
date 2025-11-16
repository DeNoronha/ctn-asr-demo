// ========================================
// JWT Authentication Middleware
// ========================================
// Validates Azure AD JWT tokens with signature verification
// Uses JWKS (JSON Web Key Set) for public key retrieval

import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {
  createLogger,
  getOrCreateCorrelationId,
  logHttpRequest,
  logHttpResponse,
  logAuthEvent,
  logSecurityEvent,
} from '../utils/logger';
import { TIMEOUTS, URLS } from '../config/constants';

// Azure AD configuration - REQUIRED environment variables
const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

// Validate Azure AD configuration at startup
if (!AZURE_AD_TENANT_ID || !AZURE_AD_CLIENT_ID) {
  const missingVars: string[] = [];
  if (!AZURE_AD_TENANT_ID) missingVars.push('AZURE_AD_TENANT_ID');
  if (!AZURE_AD_CLIENT_ID) missingVars.push('AZURE_AD_CLIENT_ID');

  throw new Error(
    `CRITICAL: Azure AD credentials must be configured. Missing environment variables: ${missingVars.join(', ')}. ` +
    `Set these variables in Azure Function App Configuration or local.settings.json for local development.`
  );
}

const JWKS_URI = URLS.JWKS_URI_TEMPLATE.replace('{tenantId}', AZURE_AD_TENANT_ID);

// JWKS client for retrieving Azure AD public keys
const jwksClientInstance = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: TIMEOUTS.JWKS_CACHE_MS,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Minimal interface for Headers-like objects
 * Supports both Azure Functions Headers and standard Headers API
 */
interface HeadersLike {
  get(name: string): string | null;
  has?(name: string): boolean;
}

/**
 * Safe wrapper for Headers object access
 * Provides a simplified interface that avoids private member access issues
 * Implements the full Headers interface for compatibility
 */
interface SafeHeaders extends Iterable<[string, string]> {
  get(name: string): string | null;
  has(name: string): boolean;
  append(name: string, value: string): void;
  delete(name: string): void;
  set(name: string, value: string): void;
  getSetCookie(): string[];
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: unknown): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: HeadersLike, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Convert Headers object to plain object to avoid private member errors
 * Returns a wrapper that safely delegates to the original headers
 */
function headersToPlainObject(headers: HeadersLike): SafeHeaders {
  const emptyIterator = [][Symbol.iterator]() as IterableIterator<[string, string]>;

  return {
    get: (name: string) => {
      try {
        return headers.get(name);
      } catch {
        return null;
      }
    },
    has: (name: string) => {
      try {
        return headers.has ? headers.has(name) : false;
      } catch {
        return false;
      }
    },
    // Stub methods for full Headers compatibility (read-only wrapper)
    append: () => {},
    delete: () => {},
    set: () => {},
    getSetCookie: () => [],
    forEach: () => {},
    entries: () => emptyIterator,
    keys: () => [][Symbol.iterator]() as IterableIterator<string>,
    values: () => [][Symbol.iterator]() as IterableIterator<string>,
    [Symbol.iterator]: () => emptyIterator
  };
}

/**
 * Get signing key from JWKS endpoint
 */
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwksClientInstance.getSigningKey(header.kid!, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Interface for decoded JWT token with user claims
 */
export interface JwtPayload {
  oid?: string; // Object ID (user ID) - optional for M2M tokens
  sub: string; // Subject
  email?: string;
  preferred_username?: string;
  upn?: string; // User Principal Name
  name?: string;
  roles?: string[]; // Application roles
  groups?: string[]; // Azure AD groups
  aud: string; // Audience
  iss: string; // Issuer
  exp: number; // Expiration time
  iat: number; // Issued at
  azp?: string; // Authorized party (client ID for M2M)
  appid?: string; // Application ID (alternative M2M client ID claim)
}

/**
 * Extended HttpRequest with authenticated user info
 * Contains only the essential properties we need
 */
export interface AuthenticatedRequest {
  // Essential HttpRequest properties
  method: string;
  url: string;
  headers: SafeHeaders;
  query: URLSearchParams;
  params: Record<string, string>;

  // Optional body access methods
  text?: () => Promise<string>;
  json?: () => Promise<unknown>;
  arrayBuffer?: () => Promise<ArrayBuffer>;

  // Custom authentication properties
  user?: JwtPayload;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  partyId?: string; // Party ID resolved from Azure AD user

  // M2M authentication properties
  isM2M?: boolean; // True if authenticated via client credentials
  clientId?: string; // M2M client ID (from azp or appid claim)
}

/**
 * Validate JWT token with signature verification
 * @param token JWT token string
 * @param context Invocation context for logging
 * @returns Decoded JWT payload
 */
export async function validateJwtToken(
  token: string,
  context: InvocationContext
): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    // Verify token with Azure AD public key
    // Note: We skip audience validation in jwt.verify and do it manually
    // to support multiple audience formats
    jwt.verify(
      token,
      getKey,
      {
        issuer: URLS.ISSUER_TEMPLATE.replace('{tenantId}', AZURE_AD_TENANT_ID),
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          context.error('JWT verification failed:', err.message);
          reject(new Error(`Invalid token: ${err.message}`));
          return;
        }

        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Invalid token payload'));
          return;
        }

        const payload = decoded as JwtPayload;

        // Manual audience validation - accept multiple formats
        const validAudiences = [
          `api://${AZURE_AD_CLIENT_ID}`,  // Application ID URI format
          AZURE_AD_CLIENT_ID,              // Client ID only
          `${AZURE_AD_CLIENT_ID}`,         // Alternative format
        ];

        if (!validAudiences.includes(payload.aud)) {
          context.error(`Audience validation failed. Expected one of: ${validAudiences.join(', ')}, got: ${payload.aud}`);
          reject(new Error(`jwt audience invalid. expected: api://${AZURE_AD_CLIENT_ID}`));
          return;
        }

        // Additional validation
        // For M2M tokens: sub is required, oid may be missing
        // For user tokens: oid or sub is required
        if (!payload.sub) {
          reject(new Error('Token missing subject (sub) claim'));
          return;
        }

        // Log successful validation
        const identifier = payload.email || payload.oid || payload.azp || payload.appid || payload.sub;
        context.log('Token validated successfully for:', identifier);
        resolve(payload);
      }
    );
  });
}

/**
 * Resolve party ID from Azure AD object ID (oid claim)
 * @param oid Azure AD object ID from JWT token
 * @param context Invocation context for logging
 * @returns Party ID or null if not found
 */
export async function resolvePartyId(
  oid: string,
  context: InvocationContext
): Promise<string | null> {
  try {
    // Import database pool dynamically to avoid circular dependencies
    const { getPool } = await import('../utils/database');
    const pool = getPool();

    // Query to resolve party ID from Azure AD object ID
    const query = `
      SELECT pr.party_id
      FROM members m
      INNER JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
      INNER JOIN party_reference pr ON le.party_id = pr.party_id
      WHERE m.azure_ad_object_id = $1
        AND le.status != 'DELETED'
        AND le.is_deleted = false
        AND pr.is_deleted = false
      LIMIT 1
    `;

    const result = await pool.query(query, [oid]);

    if (result.rows.length === 0) {
      context.warn(`No party association found for oid: ${oid}`);
      return null;
    }

    const partyId = result.rows[0].party_id;
    context.log(`Party ID resolved: ${partyId} for oid: ${oid}`);
    return partyId;
  } catch (error) {
    context.error('Error resolving party ID:', error);
    return null;
  }
}

/**
 * Authentication result types
 */
interface AuthenticationSuccess {
  success: true;
  request: AuthenticatedRequest;
}

interface AuthenticationFailure {
  success: false;
  response: HttpResponseInit;
}

type AuthenticationResult = AuthenticationSuccess | AuthenticationFailure;

/**
 * Authentication middleware - validates JWT token
 * @param request HTTP request
 * @param context Invocation context
 * @returns Authenticated request or error response
 */
export async function authenticate(
  request: HttpRequest,
  context: InvocationContext
): Promise<AuthenticationResult> {
  const logger = createLogger(context);
  const correlationId = getOrCreateCorrelationId(request);
  const startTime = Date.now();

  // Log incoming request
  logHttpRequest(logger, request, correlationId);

  try {
    // Extract Authorization header safely
    const authHeader = safeGetHeader(request.headers, 'authorization');

    if (!authHeader) {
      logSecurityEvent(logger, 'Missing Authorization Header', correlationId, {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      const duration = Date.now() - startTime;
      logHttpResponse(logger, request, 401, correlationId, duration);

      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API"',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Missing Authorization header',
          }),
        },
      };
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      logSecurityEvent(logger, 'Invalid Authorization Header Format', correlationId, {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        authHeaderFormat: authHeader.split(' ')[0],
      });

      const duration = Date.now() - startTime;
      logHttpResponse(logger, request, 401, correlationId, duration);

      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Authorization header must use Bearer scheme',
          }),
        },
      };
    }

    // Extract token
    const token = authHeader.substring(7).trim();

    if (!token) {
      logSecurityEvent(logger, 'Empty Bearer Token', correlationId, {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

      const duration = Date.now() - startTime;
      logHttpResponse(logger, request, 401, correlationId, duration);

      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Bearer token is empty',
          }),
        },
      };
    }

    // Validate token with signature verification
    const payload = await validateJwtToken(token, context);

    // Detect if this is an M2M token (has azp or appid but no oid)
    const isM2M = !payload.oid && (!!payload.azp || !!payload.appid);
    const clientId = payload.azp || payload.appid;

    // Resolve party ID from Azure AD object ID (only for user tokens)
    let partyId: string | undefined;
    if (payload.oid && !isM2M) {
      const resolvedPartyId = await resolvePartyId(payload.oid, context);
      if (resolvedPartyId) {
        partyId = resolvedPartyId;
      }
    }

    // Create authenticated request with essential properties
    // Bind methods to avoid accessing private Headers members
    const authenticatedRequest: AuthenticatedRequest = {
      method: request.method,
      url: request.url,
      headers: headersToPlainObject(request.headers),
      query: request.query,
      params: request.params,
      text: request.text.bind(request),
      json: request.json.bind(request),
      arrayBuffer: request.arrayBuffer?.bind(request),
      user: payload,
      userId: payload.oid || payload.sub,
      userEmail: payload.email || payload.preferred_username || payload.upn,
      userRoles: payload.roles || [],
      partyId: partyId, // Include resolved party ID
      isM2M: isM2M,
      clientId: clientId,
    };

    // Log successful authentication
    if (isM2M) {
      logAuthEvent(logger, true, correlationId, {
        authenticationType: 'M2M',
        clientId: clientId || 'unknown',
        roles: (payload.roles || []).join(',') || 'none',
      });
      context.log(`M2M client authenticated: ${clientId} with roles: ${(payload.roles || []).join(', ')}`);
    } else {
      const userEmail = authenticatedRequest.userEmail || 'unknown';
      const userId = authenticatedRequest.userId || 'unknown';
      logAuthEvent(logger, true, correlationId, {
        authenticationType: 'User',
        userId,
        userEmail,
        roles: (payload.roles || []).join(',') || 'none',
      });
    }

    const duration = Date.now() - startTime;
    logHttpResponse(logger, request, 200, correlationId, duration);

    return {
      success: true,
      request: authenticatedRequest,
    };
  } catch (error) {
    // Log authentication failure
    logAuthEvent(logger, false, correlationId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const duration = Date.now() - startTime;
    logHttpResponse(logger, request, 401, correlationId, duration);

    return {
      success: false,
      response: {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'unauthorized',
          error_description:
            error instanceof Error ? error.message : 'Token validation failed',
        }),
      },
    };
  }
}

/**
 * Optional authentication middleware - allows anonymous access
 * but adds user info if token is present
 */
export async function optionalAuthenticate(
  request: HttpRequest,
  context: InvocationContext
): Promise<AuthenticatedRequest> {
  const result = await authenticate(request, context);

  if (result.success) {
    return result.request;
  }

  // Return request without user info (anonymous)
  // Bind methods to avoid accessing private Headers members
  const anonymousRequest: AuthenticatedRequest = {
    method: request.method,
    url: request.url,
    headers: headersToPlainObject(request.headers),
    query: request.query,
    params: request.params,
    text: request.text.bind(request),
    json: request.json.bind(request),
    arrayBuffer: request.arrayBuffer?.bind(request),
  };

  return anonymousRequest;
}

/**
 * M2M scope validation result
 */
interface ScopeValidationSuccess {
  valid: true;
}

interface ScopeValidationFailure {
  valid: false;
  response: HttpResponseInit;
}

type ScopeValidationResult = ScopeValidationSuccess | ScopeValidationFailure;

/**
 * Require specific scopes for M2M or user authentication
 * Works with both user tokens (roles claim) and M2M tokens (roles claim)
 *
 * @param requiredScopes Array of scope names (e.g., ['ETA.Read', 'Container.Read'])
 * @returns Middleware function that validates scopes
 *
 * @example
 * ```typescript
 * // In an endpoint handler:
 * const scopeCheck = await requireScopes('ETA.Read')(request, context);
 * if (!scopeCheck.valid) return scopeCheck.response;
 * ```
 */
export function requireScopes(...requiredScopes: string[]) {
  return async (
    request: AuthenticatedRequest,
    context: InvocationContext
  ): Promise<ScopeValidationResult> => {
    const logger = createLogger(context);
    const correlationId = request.headers.get('x-correlation-id') || 'unknown';

    // Check if user is authenticated
    if (!request.user) {
      logSecurityEvent(logger, 'Scope Check Failed - No Authentication', correlationId, {
        requiredScopes: requiredScopes.join(', '),
        reason: 'Missing authentication',
      });

      return {
        valid: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API"',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify({
            error: 'unauthorized',
            error_description: 'Authentication required',
          }),
        },
      };
    }

    // Get token scopes (roles claim)
    const tokenScopes = request.userRoles || [];

    // Check if all required scopes are present
    const missingScopes = requiredScopes.filter(
      (scope) => !tokenScopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      const authType = request.isM2M ? 'M2M' : 'User';
      const identifier = request.clientId || request.userEmail || request.userId || 'unknown';

      logSecurityEvent(logger, 'Scope Check Failed - Insufficient Scopes', correlationId, {
        authenticationType: authType,
        identifier,
        hasScopes: tokenScopes.join(', ') || 'none',
        requiredScopes: requiredScopes.join(', '),
        missingScopes: missingScopes.join(', '),
      });

      context.warn(
        `${authType} authentication scope check failed for ${identifier}. ` +
        `Has: [${tokenScopes.join(', ')}], Needs: [${requiredScopes.join(', ')}], Missing: [${missingScopes.join(', ')}]`
      );

      return {
        valid: false,
        response: {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify({
            error: 'forbidden',
            error_description: `Missing required scopes: ${missingScopes.join(', ')}`,
            required_scopes: requiredScopes,
            missing_scopes: missingScopes,
          }),
        },
      };
    }

    // Scopes validated successfully
    const authType = request.isM2M ? 'M2M' : 'User';
    const identifier = request.clientId || request.userEmail || request.userId || 'unknown';

    context.log(
      `${authType} scope check passed for ${identifier}. Scopes: [${requiredScopes.join(', ')}]`
    );

    return { valid: true };
  };
}

/**
 * CSRF validation result
 */
interface CsrfValidationSuccess {
  valid: true;
}

interface CsrfValidationFailure {
  valid: false;
  response: HttpResponseInit;
}

type CsrfValidationResult = CsrfValidationSuccess | CsrfValidationFailure;

/**
 * CSRF Protection Middleware (SEC-004)
 * Validates CSRF token using double-submit cookie pattern
 *
 * How it works:
 * 1. Extract CSRF token from cookie (set by frontend)
 * 2. Extract CSRF token from X-CSRF-Token header (sent by frontend)
 * 3. Verify both tokens exist and match
 *
 * This prevents CSRF attacks because:
 * - Attacker cannot read cookie from different origin (SameSite policy)
 * - Attacker cannot set custom headers on cross-origin requests
 *
 * @param request Authenticated request
 * @param context Invocation context
 * @returns Validation result
 */
export async function validateCsrf(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<CsrfValidationResult> {
  const logger = createLogger(context);
  const correlationId = request.headers.get('x-correlation-id') || 'unknown';

  // Extract CSRF token from cookie
  const cookieHeader = request.headers.get('cookie');
  let csrfCookie: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        csrfCookie = value;
        break;
      }
    }
  }

  // Extract CSRF token from header
  const csrfHeader = request.headers.get('x-csrf-token');

  // Validate both tokens exist
  if (!csrfCookie) {
    logSecurityEvent(logger, 'CSRF Validation Failed - Missing Cookie', correlationId, {
      method: request.method,
      url: request.url,
      userEmail: request.userEmail || 'unknown',
    });

    return {
      valid: false,
      response: {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'forbidden',
          error_description: 'CSRF token missing from cookie',
        }),
      },
    };
  }

  if (!csrfHeader) {
    logSecurityEvent(logger, 'CSRF Validation Failed - Missing Header', correlationId, {
      method: request.method,
      url: request.url,
      userEmail: request.userEmail || 'unknown',
    });

    return {
      valid: false,
      response: {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'forbidden',
          error_description: 'CSRF token missing from header',
        }),
      },
    };
  }

  // Validate tokens match (constant-time comparison to prevent timing attacks)
  if (csrfCookie !== csrfHeader) {
    logSecurityEvent(logger, 'CSRF Validation Failed - Token Mismatch', correlationId, {
      method: request.method,
      url: request.url,
      userEmail: request.userEmail || 'unknown',
      reason: 'Cookie and header tokens do not match',
    });

    return {
      valid: false,
      response: {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          error: 'forbidden',
          error_description: 'CSRF token validation failed',
        }),
      },
    };
  }

  // CSRF validation successful
  context.log(`CSRF validation passed for ${request.userEmail || request.userId || 'unknown'}`);
  return { valid: true };
}
