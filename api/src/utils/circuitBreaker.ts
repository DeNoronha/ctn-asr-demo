// ========================================
// Circuit Breaker Pattern Implementation
// ========================================
// Prevents cascading failures and implements fail-closed behavior
// for rate limiting when Redis or other dependencies are unavailable.
//
// **Security Rationale:**
// Without circuit breaker, rate limiter fails OPEN (allows unlimited requests)
// when errors occur. This creates a DoS vulnerability where attackers can
// exploit error conditions to bypass rate limiting entirely.
//
// **Circuit Breaker States:**
// - CLOSED: Normal operation, all requests pass through
// - OPEN: After N consecutive failures, block all requests (fail-closed)
// - HALF_OPEN: After timeout, allow limited test requests to check recovery
//
// **CVSS 3.1: 6.5 (MEDIUM) - CWE-755: Improper Handling of Exceptional Conditions**
// Impact: Availability protection (prevents DoS when dependencies fail)

import { InvocationContext } from '@azure/functions';
import { createLogger } from './logger';

/**
 * Circuit breaker state enumeration
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Blocking all requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  errorThreshold: number;

  /** Duration to keep circuit open (milliseconds) */
  openDuration: number;

  /** Maximum test requests allowed in half-open state */
  halfOpenMaxRequests: number;

  /** Time window for tracking errors (milliseconds) */
  monitorWindow: number;

  /** Human-readable name for logging */
  name: string;
}

/**
 * Default circuit breaker configuration
 * Optimized for rate limiter use case
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  errorThreshold: 5,          // Open after 5 consecutive failures
  openDuration: 60000,        // Stay open for 60 seconds
  halfOpenMaxRequests: 3,     // Allow 3 test requests in half-open
  monitorWindow: 300000,      // Track errors over 5 minutes
  name: 'RateLimiterCircuitBreaker',
};

/**
 * Circuit Breaker Implementation
 *
 * Wraps unreliable operations (e.g., Redis calls) and prevents
 * cascading failures by failing fast when error threshold is exceeded.
 *
 * **Usage Example:**
 * ```typescript
 * const breaker = new CircuitBreaker(config, context);
 *
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await redisClient.get('key');
 *   });
 * } catch (error) {
 *   // Circuit is OPEN or operation failed
 *   // Implement fallback behavior (e.g., fail closed for rate limiter)
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private halfOpenRequests: number = 0;
  private config: CircuitBreakerConfig;
  private context: InvocationContext;

  // Track errors within monitoring window
  private recentErrors: number[] = [];

  constructor(config: CircuitBreakerConfig, context: InvocationContext) {
    this.config = config;
    this.context = context;

    this.context.log(`[Circuit Breaker] Initialized ${config.name}`, {
      errorThreshold: config.errorThreshold,
      openDuration: config.openDuration,
      halfOpenMaxRequests: config.halfOpenMaxRequests,
      monitorWindow: config.monitorWindow,
    });
  }

  /**
   * Execute an operation with circuit breaker protection
   *
   * @param operation Async operation to execute
   * @returns Operation result
   * @throws Error if circuit is OPEN or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.context.warn(`[Circuit Breaker] ${this.config.name} is OPEN, blocking request`);
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      }
    }

    // In HALF_OPEN state, limit number of test requests
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        this.context.warn(
          `[Circuit Breaker] ${this.config.name} HALF_OPEN limit reached (${this.halfOpenRequests}/${this.config.halfOpenMaxRequests})`
        );
        throw new Error(`Circuit breaker ${this.config.name} HALF_OPEN limit exceeded`);
      }
      this.halfOpenRequests++;
    }

    // Execute the operation
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   * Resets failure count and closes circuit if in HALF_OPEN state
   */
  private onSuccess(): void {
    // Clear failure tracking
    this.failureCount = 0;
    this.recentErrors = [];

    // If in HALF_OPEN, transition back to CLOSED
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToClosed();
    }
  }

  /**
   * Handle failed operation
   * Increments failure count and opens circuit if threshold exceeded
   */
  private onFailure(error: any): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.recentErrors.push(now);

    // Clean up old errors outside monitoring window
    this.recentErrors = this.recentErrors.filter(
      (timestamp) => now - timestamp <= this.config.monitorWindow
    );

    this.context.error(`[Circuit Breaker] ${this.config.name} failure (${this.failureCount}/${this.config.errorThreshold})`, error);

    // Track failure metric in Application Insights
    const logger = createLogger(this.context);
    logger.trackMetric(`${this.config.name}_FailureCount`, this.failureCount, {
      state: this.state,
      recentErrorsInWindow: this.recentErrors.length.toString(),
    });

    // Check if we should open the circuit
    if (this.failureCount >= this.config.errorThreshold) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition circuit to OPEN state
   * Blocks all requests until timeout expires
   */
  private transitionToOpen(): void {
    if (this.state === CircuitBreakerState.OPEN) {
      return; // Already open
    }

    const previousState = this.state;
    this.state = CircuitBreakerState.OPEN;
    this.halfOpenRequests = 0;

    this.context.error(
      `[Circuit Breaker] ${this.config.name} transitioned to OPEN (threshold: ${this.config.errorThreshold}, failures: ${this.failureCount})`
    );

    // Track state transition in Application Insights
    const logger = createLogger(this.context);
    logger.trackEvent('CircuitBreakerOpened', {
      name: this.config.name,
      previousState,
      failureCount: this.failureCount.toString(),
      errorThreshold: this.config.errorThreshold.toString(),
      openDuration: this.config.openDuration.toString(),
      recentErrorsInWindow: this.recentErrors.length.toString(),
    });
  }

  /**
   * Transition circuit to HALF_OPEN state
   * Allows limited test requests to check if service recovered
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenRequests = 0;

    this.context.warn(
      `[Circuit Breaker] ${this.config.name} transitioned to HALF_OPEN (allowing ${this.config.halfOpenMaxRequests} test requests)`
    );

    // Track state transition in Application Insights
    const logger = createLogger(this.context);
    logger.trackEvent('CircuitBreakerHalfOpen', {
      name: this.config.name,
      halfOpenMaxRequests: this.config.halfOpenMaxRequests.toString(),
      timeSinceOpen: this.lastFailureTime
        ? (Date.now() - this.lastFailureTime).toString()
        : 'unknown',
    });
  }

  /**
   * Transition circuit to CLOSED state
   * Resumes normal operation
   */
  private transitionToClosed(): void {
    if (this.state === CircuitBreakerState.CLOSED) {
      return; // Already closed
    }

    const previousState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.halfOpenRequests = 0;
    this.recentErrors = [];

    this.context.log(`[Circuit Breaker] ${this.config.name} transitioned to CLOSED (recovered)`);

    // Track state transition in Application Insights
    const logger = createLogger(this.context);
    logger.trackEvent('CircuitBreakerClosed', {
      name: this.config.name,
      previousState,
      recoveryTime: this.lastFailureTime
        ? (Date.now() - this.lastFailureTime).toString()
        : 'unknown',
    });
  }

  /**
   * Check if circuit should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.openDuration;
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  public getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      recentErrorsInWindow: this.recentErrors.length,
      lastFailureTime: this.lastFailureTime,
      halfOpenRequests: this.halfOpenRequests,
      config: this.config,
    };
  }

  /**
   * Manually reset circuit breaker (for testing/admin operations)
   * WARNING: Use with caution in production
   */
  public reset(): void {
    this.context.warn(`[Circuit Breaker] ${this.config.name} manually reset`);
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.halfOpenRequests = 0;
    this.recentErrors = [];
    this.lastFailureTime = null;
  }
}
