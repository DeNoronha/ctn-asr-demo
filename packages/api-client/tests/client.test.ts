import { AsrApiClient } from '../src/client';
import { AsrApiError } from '../src/utils/error';

describe('AsrApiClient', () => {
  let mockGetAccessToken: jest.Mock;
  let client: AsrApiClient;

  beforeEach(() => {
    mockGetAccessToken = jest.fn().mockResolvedValue('test-token');
    client = new AsrApiClient({
      baseURL: 'https://test-api.example.com/api/v1',
      getAccessToken: mockGetAccessToken
    });
  });

  describe('constructor', () => {
    it('should throw error if baseURL is not provided', () => {
      expect(() => {
        new AsrApiClient({
          baseURL: '',
          getAccessToken: mockGetAccessToken
        });
      }).toThrow('baseURL is required in ApiClientConfig');
    });

    it('should throw error if getAccessToken is not provided', () => {
      expect(() => {
        new AsrApiClient({
          baseURL: 'https://test-api.example.com',
          getAccessToken: null as any
        });
      }).toThrow('getAccessToken is required in ApiClientConfig');
    });

    it('should initialize all endpoints', () => {
      expect(client.members).toBeDefined();
      expect(client.legalEntities).toBeDefined();
      expect(client.contacts).toBeDefined();
      expect(client.identifiers).toBeDefined();
      expect(client.endpoints).toBeDefined();
      expect(client.auditLogs).toBeDefined();
      expect(client.orchestrations).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should provide access to raw axios instance', () => {
      expect(client.axios).toBeDefined();
      expect(client.axios.defaults.baseURL).toBe('https://test-api.example.com/api/v1');
    });
  });

  describe('configuration', () => {
    it('should use default timeout if not provided', () => {
      expect(client.axios.defaults.timeout).toBe(30000);
    });

    it('should use custom timeout if provided', () => {
      const customClient = new AsrApiClient({
        baseURL: 'https://test-api.example.com/api/v1',
        getAccessToken: mockGetAccessToken,
        timeout: 60000
      });

      expect(customClient.axios.defaults.timeout).toBe(60000);
    });

    it('should set default headers', () => {
      expect(client.axios.defaults.headers['Content-Type']).toBe('application/json');
    });
  });
});

describe('AsrApiError', () => {
  describe('fromAxiosError', () => {
    it('should handle response errors', () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            error: 'Resource not found',
            code: 'NOT_FOUND',
            details: { resource_id: '123' }
          }
        }
      };

      const apiError = AsrApiError.fromAxiosError(axiosError as any);

      expect(apiError.message).toBe('Resource not found');
      expect(apiError.status).toBe(404);
      expect(apiError.code).toBe('NOT_FOUND');
      expect(apiError.details).toEqual({ resource_id: '123' });
    });

    it('should handle network errors', () => {
      const axiosError = {
        request: {},
        message: 'Network error'
      };

      const apiError = AsrApiError.fromAxiosError(axiosError as any);

      expect(apiError.message).toBe('No response from server');
      expect(apiError.status).toBe(0);
      expect(apiError.code).toBe('NETWORK_ERROR');
    });

    it('should handle unknown errors', () => {
      const axiosError = {
        message: 'Unknown error occurred'
      };

      const apiError = AsrApiError.fromAxiosError(axiosError as any);

      expect(apiError.message).toBe('Unknown error occurred');
      expect(apiError.status).toBe(0);
      expect(apiError.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('helper methods', () => {
    it('isAuthError should return true for 401 and 403', () => {
      const error401 = new AsrApiError('Unauthorized', 401);
      const error403 = new AsrApiError('Forbidden', 403);
      const error404 = new AsrApiError('Not found', 404);

      expect(error401.isAuthError()).toBe(true);
      expect(error403.isAuthError()).toBe(true);
      expect(error404.isAuthError()).toBe(false);
    });

    it('isNotFoundError should return true for 404', () => {
      const error404 = new AsrApiError('Not found', 404);
      const error500 = new AsrApiError('Server error', 500);

      expect(error404.isNotFoundError()).toBe(true);
      expect(error500.isNotFoundError()).toBe(false);
    });

    it('isValidationError should return true for 400', () => {
      const error400 = new AsrApiError('Bad request', 400);
      const error500 = new AsrApiError('Server error', 500);

      expect(error400.isValidationError()).toBe(true);
      expect(error500.isValidationError()).toBe(false);
    });

    it('isServerError should return true for 5xx errors', () => {
      const error500 = new AsrApiError('Server error', 500);
      const error503 = new AsrApiError('Service unavailable', 503);
      const error400 = new AsrApiError('Bad request', 400);

      expect(error500.isServerError()).toBe(true);
      expect(error503.isServerError()).toBe(true);
      expect(error400.isServerError()).toBe(false);
    });
  });
});
