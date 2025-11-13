/**
 * Error Handling Utilities Tests
 */

import { handleError, ApiError, ErrorCodes } from '../errors';
import { createMockContext } from '../../__tests__/helpers';

describe('ApiError', () => {
  it('should create API error with status code and message', () => {
    const error = new ApiError(404, 'Resource not found', ErrorCodes.NOT_FOUND);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(error.name).toBe('ApiError');
  });

  it('should include optional details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new ApiError(400, 'Validation failed', ErrorCodes.VALIDATION_ERROR, details);

    expect(error.details).toEqual(details);
  });
});

describe('handleError', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockContext();
  });

  it('should handle ApiError with correct status code', () => {
    const apiError = new ApiError(404, 'Not found', ErrorCodes.NOT_FOUND);
    const response = handleError(apiError, mockContext);

    expect(response.status).toBe(404);
    expect(mockContext.error).toHaveBeenCalled();
  });

  it('should handle database unique violation (23505)', () => {
    const dbError: any = new Error('Duplicate key');
    dbError.code = '23505';

    const response = handleError(dbError, mockContext);

    expect(response.status).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Resource already exists');
    expect(body.code).toBe(ErrorCodes.DUPLICATE);
  });

  it('should handle database foreign key violation (23503)', () => {
    const dbError: any = new Error('Foreign key violation');
    dbError.code = '23503';

    const response = handleError(dbError, mockContext);

    expect(response.status).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Referenced resource not found');
  });

  it('should handle database not null violation (23502)', () => {
    const dbError: any = new Error('Not null violation');
    dbError.code = '23502';

    const response = handleError(dbError, mockContext);

    expect(response.status).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Required field is missing');
    expect(body.code).toBe(ErrorCodes.MISSING_FIELD);
  });

  it('should handle JWT errors', () => {
    const jwtError: any = new Error('Invalid token');
    jwtError.name = 'JsonWebTokenError';

    const response = handleError(jwtError, mockContext);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid authentication token');
    expect(body.code).toBe(ErrorCodes.INVALID_TOKEN);
  });

  it('should handle expired token errors', () => {
    const expiredError: any = new Error('Token expired');
    expiredError.name = 'TokenExpiredError';

    const response = handleError(expiredError, mockContext);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Authentication token has expired');
    expect(body.code).toBe(ErrorCodes.TOKEN_EXPIRED);
  });

  it('should include request ID when provided', () => {
    const error = new Error('Test error');
    const requestId = 'test-request-123';

    const response = handleError(error, mockContext, requestId);

    expect(response.headers?.['X-Request-ID']).toBe(requestId);
    const body = JSON.parse(response.body);
    expect(body.requestId).toBe(requestId);
  });

  it('should return 500 for generic errors', () => {
    const error = new Error('Unexpected error');

    const response = handleError(error, mockContext);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('An internal error occurred');
    expect(body.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it('should log error details to context', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    handleError(error, mockContext, 'req-123');

    expect(mockContext.error).toHaveBeenCalledWith('API Error:', expect.objectContaining({
      message: 'Test error',
      stack: 'Error stack trace',
      requestId: 'req-123'
    }));
  });
});

describe('ErrorCodes', () => {
  it('should have standard error codes', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.DUPLICATE).toBe('DUPLICATE');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.AUTH_FAILED).toBe('AUTH_FAILED');
  });
});
