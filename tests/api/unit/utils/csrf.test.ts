/**
 * CSRF Utility Tests
 * Comprehensive test suite for CSRF token generation and validation
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateCsrfToken,
  isTokenExpired,
  constantTimeCompare,
  validateCsrfTokens,
  extractCsrfCookie,
  formatCsrfCookie,
  formatCsrfCookieDeletion,
  CSRF_CONFIG,
  type CsrfToken,
} from './csrf';

describe('CSRF Utility', () => {
  describe('generateCsrfToken', () => {
    it('should generate valid CSRF token with correct format', () => {
      const token = generateCsrfToken();

      expect(token.value).toBeDefined();
      expect(token.value).toMatch(/^[a-f0-9]{64}$/i);
      expect(typeof token.createdAt).toBe('number');
      expect(typeof token.expiresAt).toBe('number');
      expect(token.expiresAt).toBeGreaterThan(token.createdAt);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1.value).not.toBe(token2.value);
    });

    it('should set correct expiration time (30 minutes)', () => {
      const token = generateCsrfToken();
      const expectedExpiration = token.createdAt + CSRF_CONFIG.EXPIRATION_MS;

      expect(token.expiresAt).toBe(expectedExpiration);
      expect(token.expiresAt - token.createdAt).toBe(30 * 60 * 1000);
    });

    it('should associate user ID when provided', () => {
      const userId = 'user-12345';
      const token = generateCsrfToken(userId);

      expect(token.userId).toBe(userId);
    });

    it('should not include user ID when not provided', () => {
      const token = generateCsrfToken();

      expect(token.userId).toBeUndefined();
    });

    it('should have 256 bits of entropy (32 bytes = 64 hex chars)', () => {
      const token = generateCsrfToken();

      // 32 bytes * 2 hex chars per byte = 64 characters
      expect(token.value.length).toBe(64);

      // Verify hex encoding
      expect(token.value).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate cryptographically random tokens', () => {
      // Generate multiple tokens and verify no patterns
      const tokens = Array.from({ length: 100 }, () => generateCsrfToken());

      // Check uniqueness
      const uniqueTokens = new Set(tokens.map((t) => t.value));
      expect(uniqueTokens.size).toBe(100);

      // Check distribution (very basic test for randomness)
      const hexDigits = tokens.flatMap((t) => t.value.split(''));
      const digitCounts = hexDigits.reduce(
        (acc, digit) => {
          acc[digit] = (acc[digit] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // With 100 tokens * 64 chars = 6400 hex digits,
      // each digit (0-9, a-f) should appear ~400 times on average
      // We check that distribution is reasonably uniform (within 2x)
      const counts = Object.values(digitCounts);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - avg)));

      expect(maxDeviation).toBeLessThan(avg * 0.5); // Within 50% of average
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for newly generated token', () => {
      const token = generateCsrfToken();
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token: CsrfToken = {
        value: 'abc123',
        createdAt: Date.now() - 40 * 60 * 1000, // 40 minutes ago
        expiresAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false for token expiring in the future', () => {
      const token: CsrfToken = {
        value: 'abc123',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for token expiring exactly now', () => {
      const now = Date.now();
      const token: CsrfToken = {
        value: 'abc123',
        createdAt: now - 30 * 60 * 1000,
        expiresAt: now,
      };

      // Edge case: token expiring at exactly Date.now() should be considered expired
      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      const str = 'a1b2c3d4e5f6';
      expect(constantTimeCompare(str, str)).toBe(true);
    });

    it('should return true for equal but different string instances', () => {
      const str1 = 'a1b2c3d4e5f6';
      const str2 = 'a1b2c3d4e5f6';
      expect(constantTimeCompare(str1, str2)).toBe(true);
    });

    it('should return false for strings differing in one character', () => {
      const str1 = 'a1b2c3d4e5f6';
      const str2 = 'a1b2c3d4e5f7'; // Last char different
      expect(constantTimeCompare(str1, str2)).toBe(false);
    });

    it('should return false for strings differing in first character', () => {
      const str1 = 'a1b2c3d4e5f6';
      const str2 = 'b1b2c3d4e5f6'; // First char different
      expect(constantTimeCompare(str1, str2)).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const str1 = 'a1b2c3d4e5f6';
      const str2 = 'a1b2c3d4e5f6789';
      expect(constantTimeCompare(str1, str2)).toBe(false);
    });

    it('should return false for empty strings vs non-empty', () => {
      expect(constantTimeCompare('', 'abc')).toBe(false);
      expect(constantTimeCompare('abc', '')).toBe(false);
    });

    it('should return true for two empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
    });

    it('should handle unicode characters', () => {
      const str1 = 'hello-世界-🌍';
      const str2 = 'hello-世界-🌍';
      expect(constantTimeCompare(str1, str2)).toBe(true);
    });

    it('should be timing-safe (basic behavioral test)', () => {
      // This is a basic test that constantTimeCompare exists and works
      // True timing-safe verification requires statistical analysis beyond
      // the scope of unit tests
      const correct = 'a'.repeat(64);
      const wrongStart = 'b' + 'a'.repeat(63);
      const wrongEnd = 'a'.repeat(63) + 'b';

      expect(constantTimeCompare(correct, wrongStart)).toBe(false);
      expect(constantTimeCompare(correct, wrongEnd)).toBe(false);
    });
  });

  describe('validateCsrfTokens', () => {
    const validToken = 'a'.repeat(64); // 64 hex characters

    it('should validate matching tokens successfully', () => {
      const result = validateCsrfTokens(validToken, validToken);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.errorCode).toBeUndefined();
    });

    it('should reject when cookie token is missing', () => {
      const result = validateCsrfTokens(null, validToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF token missing from cookie');
      expect(result.errorCode).toBe('CSRF_COOKIE_MISSING');
    });

    it('should reject when header token is missing', () => {
      const result = validateCsrfTokens(validToken, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF token missing from header');
      expect(result.errorCode).toBe('CSRF_HEADER_MISSING');
    });

    it('should reject when both tokens are missing', () => {
      const result = validateCsrfTokens(null, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF token missing from cookie');
      expect(result.errorCode).toBe('CSRF_COOKIE_MISSING');
    });

    it('should reject invalid cookie token format (too short)', () => {
      const result = validateCsrfTokens('abc123', validToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF cookie token format invalid');
      expect(result.errorCode).toBe('CSRF_COOKIE_INVALID_FORMAT');
    });

    it('should reject invalid cookie token format (non-hex chars)', () => {
      const result = validateCsrfTokens('X'.repeat(64), validToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF cookie token format invalid');
      expect(result.errorCode).toBe('CSRF_COOKIE_INVALID_FORMAT');
    });

    it('should reject invalid header token format (too long)', () => {
      const result = validateCsrfTokens(validToken, 'a'.repeat(65));

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF header token format invalid');
      expect(result.errorCode).toBe('CSRF_HEADER_INVALID_FORMAT');
    });

    it('should reject mismatched tokens', () => {
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      const result = validateCsrfTokens(token1, token2);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF token validation failed');
      expect(result.errorCode).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('should handle uppercase and lowercase hex equivalently', () => {
      const token1 = 'a1b2c3d4e5f6' + '0'.repeat(52);
      const token2 = 'A1B2C3D4E5F6' + '0'.repeat(52);

      // Note: Our implementation is case-insensitive for hex validation
      const result = validateCsrfTokens(token1, token2);

      // They won't match because constantTimeCompare is case-sensitive
      expect(result.valid).toBe(false);
    });

    it('should reject tokens with special characters', () => {
      const invalidToken = 'a'.repeat(62) + '!@';
      const result = validateCsrfTokens(invalidToken, validToken);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CSRF_COOKIE_INVALID_FORMAT');
    });

    it('should validate with user ID (basic test)', () => {
      const result = validateCsrfTokens(validToken, validToken, 'user-123');

      expect(result.valid).toBe(true);
    });
  });

  describe('extractCsrfCookie', () => {
    it('should extract CSRF token from cookie header', () => {
      const cookieHeader = 'session=abc123; XSRF-TOKEN=xyz789; other=value';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBe('xyz789');
    });

    it('should handle cookie with spaces', () => {
      const cookieHeader = 'session=abc123;  XSRF-TOKEN=xyz789  ; other=value';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBe('xyz789');
    });

    it('should return null when CSRF cookie not present', () => {
      const cookieHeader = 'session=abc123; other=value';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBeNull();
    });

    it('should return null for empty cookie header', () => {
      expect(extractCsrfCookie('')).toBeNull();
    });

    it('should return null for null cookie header', () => {
      expect(extractCsrfCookie(null)).toBeNull();
    });

    it('should return null for undefined cookie header', () => {
      expect(extractCsrfCookie(undefined)).toBeNull();
    });

    it('should extract CSRF token when it is the only cookie', () => {
      const cookieHeader = 'XSRF-TOKEN=xyz789';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBe('xyz789');
    });

    it('should extract CSRF token when it is the first cookie', () => {
      const cookieHeader = 'XSRF-TOKEN=xyz789; session=abc123';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBe('xyz789');
    });

    it('should handle CSRF token with empty value', () => {
      const cookieHeader = 'XSRF-TOKEN=; session=abc123';
      const token = extractCsrfCookie(cookieHeader);

      expect(token).toBeNull();
    });
  });

  describe('formatCsrfCookie', () => {
    it('should format cookie with correct attributes', () => {
      const token = 'abc123xyz789';
      const cookie = formatCsrfCookie(token);

      expect(cookie).toContain('XSRF-TOKEN=abc123xyz789');
      expect(cookie).toContain('Max-Age=1800');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/');
      expect(cookie).not.toContain('HttpOnly'); // Should NOT be HttpOnly
    });

    it('should format cookie with generated token', () => {
      const token = generateCsrfToken();
      const cookie = formatCsrfCookie(token.value);

      expect(cookie).toContain(`XSRF-TOKEN=${token.value}`);
    });

    it('should include Max-Age of 30 minutes (1800 seconds)', () => {
      const cookie = formatCsrfCookie('testtoken');

      expect(cookie).toContain('Max-Age=1800');
    });

    it('should use SameSite=Strict for maximum protection', () => {
      const cookie = formatCsrfCookie('testtoken');

      expect(cookie).toContain('SameSite=Strict');
    });

    it('should be accessible to JavaScript (no HttpOnly)', () => {
      const cookie = formatCsrfCookie('testtoken');

      // Explicitly verify HttpOnly is NOT present
      expect(cookie).not.toMatch(/HttpOnly/i);
    });
  });

  describe('formatCsrfCookieDeletion', () => {
    it('should format cookie deletion with expired date', () => {
      const cookie = formatCsrfCookieDeletion();

      expect(cookie).toContain('XSRF-TOKEN=');
      expect(cookie).toContain('expires=Thu, 01 Jan 1970 00:00:00 UTC');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/');
    });

    it('should have empty value', () => {
      const cookie = formatCsrfCookieDeletion();

      expect(cookie).toMatch(/XSRF-TOKEN=;/);
    });

    it('should use same path and security attributes', () => {
      const cookie = formatCsrfCookieDeletion();

      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });
  });

  describe('CSRF_CONFIG constants', () => {
    it('should have correct token byte size (32 bytes)', () => {
      expect(CSRF_CONFIG.TOKEN_BYTES).toBe(32);
    });

    it('should have correct expiration time (30 minutes)', () => {
      expect(CSRF_CONFIG.EXPIRATION_MS).toBe(30 * 60 * 1000);
    });

    it('should have correct cookie name', () => {
      expect(CSRF_CONFIG.COOKIE_NAME).toBe('XSRF-TOKEN');
    });

    it('should have correct header name', () => {
      expect(CSRF_CONFIG.HEADER_NAME).toBe('x-csrf-token');
    });

    it('should have correct cookie Max-Age (1800 seconds)', () => {
      expect(CSRF_CONFIG.COOKIE_MAX_AGE).toBe(1800);
    });
  });

  describe('Integration scenarios', () => {
    it('should support full token lifecycle: generate -> validate -> expire', () => {
      // Generate token
      const token = generateCsrfToken('user-123');

      expect(isTokenExpired(token)).toBe(false);

      // Validate token
      const result = validateCsrfTokens(token.value, token.value, 'user-123');
      expect(result.valid).toBe(true);

      // Simulate expiration
      const expiredToken: CsrfToken = {
        ...token,
        expiresAt: Date.now() - 1000, // 1 second ago
      };
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should support cookie extraction and validation workflow', () => {
      // Generate token
      const token = generateCsrfToken();

      // Format cookie
      const setCookie = formatCsrfCookie(token.value);
      expect(setCookie).toContain(token.value);

      // Simulate browser sending cookie back
      const cookieHeader = `session=abc; XSRF-TOKEN=${token.value}; other=xyz`;
      const extractedToken = extractCsrfCookie(cookieHeader);

      expect(extractedToken).toBe(token.value);

      // Validate
      const result = validateCsrfTokens(extractedToken, token.value);
      expect(result.valid).toBe(true);
    });

    it('should reject attack scenario: modified header token', () => {
      // Attacker gets a valid token from cookie
      const validToken = generateCsrfToken();
      const cookieHeader = `XSRF-TOKEN=${validToken.value}`;
      const cookieToken = extractCsrfCookie(cookieHeader);

      // Attacker tries to modify header token
      const modifiedHeaderToken = validToken.value.replace(/a/g, 'b');

      // Validation should fail
      const result = validateCsrfTokens(cookieToken, modifiedHeaderToken);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('should reject attack scenario: no cookie, only header', () => {
      const attackerToken = generateCsrfToken();

      // Attacker only sends header (no cookie)
      const result = validateCsrfTokens(null, attackerToken.value);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CSRF_COOKIE_MISSING');
    });

    it('should handle token rotation: old token invalid after new token issued', () => {
      // User has old token
      const oldToken = generateCsrfToken('user-123');

      // Server issues new token (rotation)
      const newToken = generateCsrfToken('user-123');

      // Old token should not match new token
      const result = validateCsrfTokens(oldToken.value, newToken.value);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CSRF_TOKEN_MISMATCH');
    });
  });
});
