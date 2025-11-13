/**
 * Jest Test Setup
 *
 * Global test configuration and environment setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'asr_test';
process.env.POSTGRES_USER = 'test_user';
// Postgres password should be set in test environment or .env.test file

// Extend test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error
};
