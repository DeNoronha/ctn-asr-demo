/**
 * CORS Validator Tests
 *
 * Tests CORS validation middleware functionality:
 * - Preflight request handling
 * - Origin validation
 * - CORS header application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { createCorsValidator, getCorsHeaders, applyCorsHeaders } from '../validators/corsValidator';
import { MiddlewareContext } from '../utils/middlewareTypes';

describe('CORS Validator', () => {
  let mockContext: MiddlewareContext;
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
      headers: new Map([['origin', 'https://allowed.com']]),
    };

    mockContext = {
      request: mockRequest as HttpRequest,
      invocationContext: mockInvocationContext,
      requestId: 'test-123',
      startTime: Date.now(),
      metadata: {},
    };
  });

  describe('getCorsHeaders', () => {
    it('should return CORS headers for allowed origin', () => {
      const headers = getCorsHeaders('https://allowed.com', ['https://allowed.com']);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://allowed.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
      expect(headers['Access-Control-Allow-Headers']).toBeDefined();
    });

    it('should not set origin for disallowed origin', () => {
      const headers = getCorsHeaders('https://evil.com', ['https://allowed.com']);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });

    it('should allow wildcard origin', () => {
      const headers = getCorsHeaders('https://anyone.com', ['*']);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('applyCorsHeaders', () => {
    it('should merge CORS headers with existing response headers', () => {
      const response = {
        status: 200,
        headers: { 'X-Custom': 'value' },
      };

      const result = applyCorsHeaders(response, 'https://allowed.com', ['https://allowed.com']);

      expect(result.headers['Access-Control-Allow-Origin']).toBe('https://allowed.com');
      expect(result.headers['X-Custom']).toBe('value');
    });
  });

  describe('createCorsValidator', () => {
    it('should handle OPTIONS preflight request', async () => {
      const validator = createCorsValidator({
        enabled: true,
        allowedOrigins: ['https://allowed.com'],
      });

      mockRequest.method = 'OPTIONS';
      const next = vi.fn();

      const response = await validator(mockContext, next);

      expect(response.status).toBe(204);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://allowed.com');
      expect(next).not.toHaveBeenCalled(); // Should short-circuit
    });

    it('should pass through non-preflight requests', async () => {
      const validator = createCorsValidator({
        enabled: true,
        allowedOrigins: ['https://allowed.com'],
      });

      const next = vi.fn().mockResolvedValue({
        status: 200,
        jsonBody: { success: true },
      });

      const response = await validator(mockContext, next);

      expect(next).toHaveBeenCalled();
      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://allowed.com');
    });

    it('should skip validation when disabled', async () => {
      const validator = createCorsValidator({ enabled: false });

      const next = vi.fn().mockResolvedValue({
        status: 200,
        jsonBody: { success: true },
      });

      const response = await validator(mockContext, next);

      expect(next).toHaveBeenCalled();
      expect(response.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });
});
