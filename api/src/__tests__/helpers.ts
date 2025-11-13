/**
 * Test Helper Utilities
 *
 * Common utilities for testing Azure Functions and API logic
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from '../middleware/endpointWrapper';

/**
 * Create a mock InvocationContext for testing
 */
export function createMockContext(): InvocationContext {
  return {
    invocationId: 'test-invocation-id',
    functionName: 'TestFunction',
    extraInputs: {
      get: jest.fn(),
      set: jest.fn()
    },
    extraOutputs: {
      get: jest.fn(),
      set: jest.fn()
    },
    retryContext: {
      retryCount: 0,
      maxRetryCount: 3
    },
    traceContext: {
      traceparent: 'test-trace-parent',
      tracestate: 'test-trace-state',
      attributes: {}
    },
    triggerMetadata: {},
    options: {
      trigger: {
        type: 'httpTrigger',
        name: 'req'
      },
      return: {
        type: 'http',
        name: '$return'
      }
    },
    log: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as any;
}

/**
 * Create a mock HttpRequest for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}): HttpRequest {
  const {
    method = 'GET',
    url = 'http://localhost:7071/api/test',
    body = null,
    params = {},
    query = {},
    headers = {}
  } = options;

  const headerMap = new Map(Object.entries(headers));

  return {
    method,
    url,
    params,
    query: {
      get: (key: string) => query[key] || null,
      has: (key: string) => key in query,
      getAll: (key: string) => query[key] ? [query[key]] : [],
      keys: () => Object.keys(query)[Symbol.iterator](),
      values: () => Object.values(query)[Symbol.iterator](),
      entries: () => Object.entries(query)[Symbol.iterator](),
      forEach: (callback: any) => Object.entries(query).forEach(([k, v]) => callback(v, k)),
      [Symbol.iterator]: () => Object.entries(query)[Symbol.iterator](),
      append: jest.fn(),
      delete: jest.fn(),
      set: jest.fn()
    },
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) || null,
      has: (key: string) => headerMap.has(key.toLowerCase()),
      set: (key: string, value: string) => headerMap.set(key.toLowerCase(), value),
      delete: (key: string) => headerMap.delete(key.toLowerCase()),
      keys: () => headerMap.keys(),
      values: () => headerMap.values(),
      entries: () => headerMap.entries(),
      forEach: (callback: any) => headerMap.forEach((value, key) => callback(value, key)),
      [Symbol.iterator]: () => headerMap.entries(),
      append: jest.fn(),
      getSetCookie: jest.fn(() => [])
    },
    body: body ? { string: JSON.stringify(body) } : undefined,
    json: async () => body,
    text: async () => body ? JSON.stringify(body) : '',
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    blob: async () => new Blob(),
    user: null,
    bodyUsed: false,
    clone: jest.fn()
  } as any;
}

/**
 * Create a mock AuthenticatedRequest for testing authenticated endpoints
 */
export function createMockAuthenticatedRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
}): AuthenticatedRequest {
  const {
    userId = 'test-user-id',
    userEmail = 'test@example.com',
    userRoles = ['SystemAdmin'],
    ...requestOptions
  } = options;

  const mockRequest = createMockRequest(requestOptions);

  return {
    ...mockRequest,
    userId,
    userEmail,
    userRoles
  } as unknown as AuthenticatedRequest;
}

/**
 * Mock database pool for testing
 */
export function createMockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  };
}

/**
 * Helper to assert HTTP response structure
 */
export function assertValidResponse(response: any) {
  expect(response).toBeDefined();
  expect(response.status).toBeDefined();
  expect(typeof response.status).toBe('number');
}

/**
 * Helper to assert error response structure
 */
export function assertErrorResponse(response: any, expectedStatus: number) {
  assertValidResponse(response);
  expect(response.status).toBe(expectedStatus);
  expect(response.jsonBody || response.body).toBeDefined();
  const body = typeof (response.jsonBody || response.body) === 'string'
    ? JSON.parse(response.jsonBody || response.body)
    : (response.jsonBody || response.body);
  expect(body.error).toBeDefined();
}

/**
 * Helper to assert success response structure
 */
export function assertSuccessResponse(response: any, expectedStatus = 200) {
  assertValidResponse(response);
  expect(response.status).toBe(expectedStatus);
}
