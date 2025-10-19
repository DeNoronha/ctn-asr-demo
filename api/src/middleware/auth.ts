// ========================================
// JWT Authentication Middleware
// ========================================
// Validates Azure AD JWT tokens with signature verification
// Uses JWKS (JSON Web Key Set) for public key retrieval

import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Azure AD configuration
const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID || '598664e7-725c-4daa-bd1f-89c4ada717ff';
const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde';
const JWKS_URI = `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/discovery/v2.0/keys`;

// JWKS client for retrieving Azure AD public keys
const jwksClientInstance = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
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
  oid: string; // Object ID (user ID)
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
        issuer: `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/v2.0`,
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
        if (!payload.oid && !payload.sub) {
          reject(new Error('Token missing user identifier (oid/sub)'));
          return;
        }

        context.log('Token validated successfully for user:', payload.email || payload.oid);
        resolve(payload);
      }
    );
  });
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
  try {
    // Extract Authorization header safely
    const authHeader = safeGetHeader(request.headers, 'authorization');

    if (!authHeader) {
      context.warn('Missing Authorization header');
      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API"',
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
      context.warn('Invalid Authorization header format');
      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
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
      return {
        success: false,
        response: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
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
    };

    context.log(
      `User authenticated: ${authenticatedRequest.userEmail} (${authenticatedRequest.userId})`
    );

    return {
      success: true,
      request: authenticatedRequest,
    };
  } catch (error) {
    context.error('Authentication failed:', error);

    return {
      success: false,
      response: {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="CTN ASR API" error="invalid_token"',
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
