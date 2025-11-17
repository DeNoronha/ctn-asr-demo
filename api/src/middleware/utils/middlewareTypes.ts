/**
 * Middleware Type Definitions
 *
 * Provides type-safe interfaces for composable middleware pattern.
 * Enables clean separation of concerns and testability.
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from '../auth';

/**
 * Middleware context that flows through the middleware chain
 */
export interface MiddlewareContext {
  /** Original HTTP request */
  request: HttpRequest;

  /** Azure Functions invocation context */
  invocationContext: InvocationContext;

  /** Request ID for tracking */
  requestId: string;

  /** Start time for performance tracking */
  startTime: number;

  /** Authenticated request (populated after auth middleware) */
  authenticatedRequest?: AuthenticatedRequest;

  /** CSRF token to set in response cookie (populated after auth) */
  csrfTokenToSet?: string;

  /** Rate limit information (populated after rate limit middleware) */
  rateLimit?: {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  };

  /** Metadata that middleware can use to pass data */
  metadata: Record<string, any>;
}

/**
 * Middleware function signature
 *
 * A middleware can either:
 * 1. Return a response (short-circuit the chain)
 * 2. Call next() to continue to the next middleware
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<HttpResponseInit>
) => Promise<HttpResponseInit>;

/**
 * Business logic handler signature (receives authenticated request)
 */
export type BusinessLogicHandler = (
  request: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

/**
 * Middleware validation result
 * Used by validators to return success/failure states
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Response to return if validation failed */
  response?: HttpResponseInit;

  /** Error message (for logging) */
  error?: string;

  /** Error code (for structured logging) */
  errorCode?: string;
}

/**
 * Middleware execution result
 * Internal type used by composition utility
 */
export interface MiddlewareExecutionResult {
  /** Whether to continue to next middleware */
  continue: boolean;

  /** Response (if short-circuiting) */
  response?: HttpResponseInit;
}

/**
 * Helper to create a short-circuit response
 */
export function shortCircuit(response: HttpResponseInit): never {
  throw new ShortCircuitError(response);
}

/**
 * Short-circuit error (internal use by composition utility)
 */
export class ShortCircuitError extends Error {
  constructor(public readonly response: HttpResponseInit) {
    super('Middleware short-circuit');
    this.name = 'ShortCircuitError';
  }
}
