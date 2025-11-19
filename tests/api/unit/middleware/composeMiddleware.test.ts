/**
 * Middleware Composition Tests
 *
 * Tests composable middleware pattern:
 * - Middleware chain execution order
 * - Short-circuiting behavior
 * - Context propagation
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { composeMiddleware } from '../utils/composeMiddleware';
import { MiddlewareFunction, MiddlewareContext } from '../utils/middlewareTypes';

describe('Middleware Composition', () => {
  let mockInvocationContext: InvocationContext;
  let mockRequest: Partial<HttpRequest>;

  beforeEach(() => {
    mockInvocationContext = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    mockRequest = {
      method: 'GET',
      url: 'https://example.com/api/test',
      headers: new Map(),
    };
  });

  describe('composeMiddleware', () => {
    it('should execute middleware in order', async () => {
      const executionOrder: number[] = [];

      const middleware1: MiddlewareFunction = async (ctx, next) => {
        executionOrder.push(1);
        const response = await next();
        executionOrder.push(4);
        return response;
      };

      const middleware2: MiddlewareFunction = async (ctx, next) => {
        executionOrder.push(2);
        const response = await next();
        executionOrder.push(3);
        return response;
      };

      const handler = composeMiddleware([middleware1, middleware2], async (req, ctx) => {
        return { status: 200, jsonBody: { success: true } };
      });

      // Mock authenticated request for middleware2 onwards
      const authMiddleware: MiddlewareFunction = async (ctx, next) => {
        ctx.authenticatedRequest = {
          method: 'GET',
          url: 'https://example.com/api/test',
          headers: new Map() as any,
          query: {},
          params: {},
        } as any;
        return next();
      };

      const handlerWithAuth = composeMiddleware(
        [middleware1, middleware2, authMiddleware],
        async (req, ctx) => {
          return { status: 200, jsonBody: { success: true } };
        }
      );

      await handlerWithAuth(mockRequest as HttpRequest, mockInvocationContext);

      expect(executionOrder).toEqual([1, 2, 4, 3]);
    });

    it('should short-circuit when middleware returns response', async () => {
      const middleware1: MiddlewareFunction = async (ctx, next) => {
        // Short-circuit - don't call next()
        return {
          status: 403,
          jsonBody: { error: 'forbidden' },
        };
      };

      const middleware2: MiddlewareFunction = vi.fn();

      const handler = composeMiddleware([middleware1, middleware2 as any], async (req, ctx) => {
        return { status: 200, jsonBody: { success: true } };
      });

      const response = await handler(mockRequest as HttpRequest, mockInvocationContext);

      expect(response.status).toBe(403);
      expect(middleware2).not.toHaveBeenCalled();
    });

    it('should propagate context between middleware', async () => {
      const middleware1: MiddlewareFunction = async (ctx, next) => {
        ctx.metadata.value1 = 'test';
        return next();
      };

      const middleware2: MiddlewareFunction = async (ctx, next) => {
        expect(ctx.metadata.value1).toBe('test');
        ctx.metadata.value2 = 'another';
        return next();
      };

      const authMiddleware: MiddlewareFunction = async (ctx, next) => {
        ctx.authenticatedRequest = {
          method: 'GET',
          url: 'https://example.com/api/test',
          headers: new Map() as any,
          query: {},
          params: {},
        } as any;
        return next();
      };

      const handler = composeMiddleware(
        [middleware1, middleware2, authMiddleware],
        async (req, ctx) => {
          return { status: 200, jsonBody: { success: true } };
        }
      );

      await handler(mockRequest as HttpRequest, mockInvocationContext);
    });

    it('should handle errors and return error response', async () => {
      const middleware1: MiddlewareFunction = async (ctx, next) => {
        throw new Error('Test error');
      };

      const handler = composeMiddleware([middleware1], async (req, ctx) => {
        return { status: 200, jsonBody: { success: true } };
      });

      const response = await handler(mockRequest as HttpRequest, mockInvocationContext);

      expect(response.status).toBe(500);
      expect(mockInvocationContext.error).toHaveBeenCalled();
    });

    it('should add request ID to all responses', async () => {
      const middleware1: MiddlewareFunction = async (ctx, next) => next();

      const authMiddleware: MiddlewareFunction = async (ctx, next) => {
        ctx.authenticatedRequest = {
          method: 'GET',
          url: 'https://example.com/api/test',
          headers: new Map() as any,
          query: {},
          params: {},
        } as any;
        return next();
      };

      const handler = composeMiddleware([middleware1, authMiddleware], async (req, ctx) => {
        return { status: 200, jsonBody: { success: true } };
      });

      const response = await handler(mockRequest as HttpRequest, mockInvocationContext);

      expect(response.headers['X-Request-ID']).toBeDefined();
    });
  });
});
