// ========================================
// Circuit Breaker Unit Tests
// ========================================
// Tests for circuit breaker state transitions and error handling

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InvocationContext } from '@azure/functions';
import {
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerConfig,
} from '../circuitBreaker';

// Mock InvocationContext
function createMockContext(): InvocationContext {
  return {
    invocationId: 'test-invocation-id',
    functionName: 'TestFunction',
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  } as any;
}

describe('CircuitBreaker', () => {
  let context: InvocationContext;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    context = createMockContext();
    config = {
      errorThreshold: 3,
      openDuration: 1000, // 1 second
      halfOpenMaxRequests: 2,
      monitorWindow: 5000,
      name: 'TestCircuitBreaker',
    };
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker(config, context);
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition to OPEN after error threshold exceeded', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Trigger 3 failures (error threshold = 3)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('should block requests when circuit is OPEN', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      // Circuit should be open now
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next request should be blocked
      await expect(
        breaker.execute(async () => {
          return 'success';
        })
      ).rejects.toThrow('Circuit breaker TestCircuitBreaker is OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for openDuration to pass
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Next request should transition to HALF_OPEN
      try {
        await breaker.execute(async () => {
          return 'success';
        });
      } catch (error) {
        // May succeed or fail
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED); // Should close on success
    });

    it('should transition to CLOSED on successful request in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Successful request should close circuit
      const result = await breaker.execute(async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should limit requests in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // First request transitions to HALF_OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch (error) {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      // Second request (within halfOpenMaxRequests = 2)
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch (error) {
        // Expected
      }

      // Third request should be rejected (exceeds halfOpenMaxRequests)
      await expect(
        breaker.execute(async () => {
          return 'success';
        })
      ).rejects.toThrow('HALF_OPEN limit exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should reset failure count on successful request', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Trigger 2 failures (below threshold)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(2);

      // Successful request should reset count
      await breaker.execute(async () => {
        return 'success';
      });

      const statsAfter = breaker.getStats();
      expect(statsAfter.failureCount).toBe(0);
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should track errors within monitoring window', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Trigger error
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.recentErrorsInWindow).toBe(1);
    });
  });

  describe('Manual Reset', () => {
    it('should reset circuit breaker state manually', async () => {
      const breaker = new CircuitBreaker(config, context);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Manual reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.recentErrorsInWindow).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide circuit breaker statistics', async () => {
      const breaker = new CircuitBreaker(config, context);

      const stats = breaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('recentErrorsInWindow');
      expect(stats).toHaveProperty('lastFailureTime');
      expect(stats).toHaveProperty('halfOpenRequests');
      expect(stats).toHaveProperty('config');

      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
    });
  });
});
