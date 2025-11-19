// ========================================
// Pseudonymization Unit Tests
// ========================================

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  pseudonymizeEmail,
  pseudonymizeIP,
  isPseudonymizationEnabled,
  getPseudonymizationStatus
} from './pseudonymization';

describe('Pseudonymization Utility', () => {
  const originalSecret = process.env.AUDIT_LOG_SECRET;
  const testSecret = 'test-secret-key-minimum-32-chars';

  beforeAll(() => {
    // Set test secret
    process.env.AUDIT_LOG_SECRET = testSecret;
  });

  afterAll(() => {
    // Restore original secret
    if (originalSecret) {
      process.env.AUDIT_LOG_SECRET = originalSecret;
    } else {
      delete process.env.AUDIT_LOG_SECRET;
    }
  });

  describe('pseudonymizeEmail()', () => {
    test('should return null for null input', () => {
      expect(pseudonymizeEmail(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(pseudonymizeEmail(undefined)).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(pseudonymizeEmail('')).toBeNull();
    });

    test('should be deterministic (same input = same output)', () => {
      const email = 'john.doe@example.com';
      const pseudonym1 = pseudonymizeEmail(email);
      const pseudonym2 = pseudonymizeEmail(email);
      expect(pseudonym1).toBe(pseudonym2);
    });

    test('should return fixed length pseudonym', () => {
      const email = 'test@example.com';
      const pseudonym = pseudonymizeEmail(email);
      expect(pseudonym).toHaveLength(24); // "email_" + 16 hex chars
    });

    test('should match expected format', () => {
      const email = 'test@example.com';
      const pseudonym = pseudonymizeEmail(email);
      expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
    });

    test('should normalize email to lowercase', () => {
      const email1 = 'John.Doe@Example.COM';
      const email2 = 'john.doe@example.com';
      const pseudonym1 = pseudonymizeEmail(email1);
      const pseudonym2 = pseudonymizeEmail(email2);
      expect(pseudonym1).toBe(pseudonym2);
    });

    test('should produce different pseudonyms for different emails', () => {
      const email1 = 'alice@example.com';
      const email2 = 'bob@example.com';
      const pseudonym1 = pseudonymizeEmail(email1);
      const pseudonym2 = pseudonymizeEmail(email2);
      expect(pseudonym1).not.toBe(pseudonym2);
    });

    test('should handle special characters in email', () => {
      const email = 'user+tag@sub.domain.example.com';
      const pseudonym = pseudonymizeEmail(email);
      expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
    });

    test('should handle international domain names', () => {
      const email = 'user@münchen.de';
      const pseudonym = pseudonymizeEmail(email);
      expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
    });
  });

  describe('pseudonymizeIP()', () => {
    test('should return null for null input', () => {
      expect(pseudonymizeIP(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(pseudonymizeIP(undefined)).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(pseudonymizeIP('')).toBeNull();
    });

    test('should be deterministic for IPv4', () => {
      const ip = '192.168.1.1';
      const pseudonym1 = pseudonymizeIP(ip);
      const pseudonym2 = pseudonymizeIP(ip);
      expect(pseudonym1).toBe(pseudonym2);
    });

    test('should be deterministic for IPv6', () => {
      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const pseudonym1 = pseudonymizeIP(ip);
      const pseudonym2 = pseudonymizeIP(ip);
      expect(pseudonym1).toBe(pseudonym2);
    });

    test('should detect IPv4 and use ipv4 prefix', () => {
      const ip = '192.168.1.1';
      const pseudonym = pseudonymizeIP(ip);
      expect(pseudonym).toMatch(/^ipv4_[a-f0-9]{12}$/);
    });

    test('should detect IPv6 and use ipv6 prefix', () => {
      const ip = '2001:0db8::1';
      const pseudonym = pseudonymizeIP(ip);
      expect(pseudonym).toMatch(/^ipv6_[a-f0-9]{12}$/);
    });

    test('should produce different pseudonyms for different IPs', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '10.0.0.1';
      const pseudonym1 = pseudonymizeIP(ip1);
      const pseudonym2 = pseudonymizeIP(ip2);
      expect(pseudonym1).not.toBe(pseudonym2);
    });

    test('should handle compressed IPv6 addresses', () => {
      const ip = '2001:db8::1';
      const pseudonym = pseudonymizeIP(ip);
      expect(pseudonym).toMatch(/^ipv6_[a-f0-9]{12}$/);
    });

    test('should handle localhost IPv4', () => {
      const ip = '127.0.0.1';
      const pseudonym = pseudonymizeIP(ip);
      expect(pseudonym).toMatch(/^ipv4_[a-f0-9]{12}$/);
    });

    test('should handle localhost IPv6', () => {
      const ip = '::1';
      const pseudonym = pseudonymizeIP(ip);
      expect(pseudonym).toMatch(/^ipv6_[a-f0-9]{12}$/);
    });

    test('should handle private network IPs', () => {
      const ips = [
        '10.0.0.1',
        '172.16.0.1',
        '192.168.0.1',
      ];

      ips.forEach(ip => {
        const pseudonym = pseudonymizeIP(ip);
        expect(pseudonym).toMatch(/^ipv4_[a-f0-9]{12}$/);
      });
    });
  });

  describe('Configuration', () => {
    test('should indicate pseudonymization is enabled when secret is set', () => {
      expect(isPseudonymizationEnabled()).toBe(true);
    });

    test('should return null when secret is not configured', () => {
      delete process.env.AUDIT_LOG_SECRET;
      expect(pseudonymizeEmail('test@example.com')).toBeNull();
      expect(pseudonymizeIP('192.168.1.1')).toBeNull();
      // Restore secret for other tests
      process.env.AUDIT_LOG_SECRET = testSecret;
    });

    test('should return correct status', () => {
      const status = getPseudonymizationStatus();
      expect(status).toHaveProperty('pseudonymization_enabled');
      expect(status).toHaveProperty('pii_encryption_enabled');
      expect(status).toHaveProperty('compliance_status');
      expect(status.pseudonymization_enabled).toBe(true);
    });
  });

  describe('Security Properties', () => {
    test('pseudonyms should not reveal original values', () => {
      const email = 'secret@example.com';
      const pseudonym = pseudonymizeEmail(email);

      // Pseudonym should not contain any part of original email
      expect(pseudonym?.toLowerCase()).not.toContain('secret');
      expect(pseudonym?.toLowerCase()).not.toContain('example');
      expect(pseudonym).not.toContain('@');
    });

    test('pseudonyms should be one-way (cannot reverse without secret)', () => {
      const email = 'test@example.com';
      const pseudonym = pseudonymizeEmail(email);

      // There should be no way to derive original from pseudonym alone
      expect(pseudonym).not.toContain(email);
    });

    test('changing secret should produce different pseudonyms', () => {
      const email = 'test@example.com';

      // Pseudonym with first secret
      process.env.AUDIT_LOG_SECRET = 'secret1-minimum-32-characters-long';
      const pseudonym1 = pseudonymizeEmail(email);

      // Pseudonym with second secret
      process.env.AUDIT_LOG_SECRET = 'secret2-minimum-32-characters-long';
      const pseudonym2 = pseudonymizeEmail(email);

      expect(pseudonym1).not.toBe(pseudonym2);

      // Restore test secret
      process.env.AUDIT_LOG_SECRET = testSecret;
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(200) + '@example.com';
      const pseudonym = pseudonymizeEmail(longEmail);
      expect(pseudonym).toHaveLength(24); // Fixed length regardless of input
    });

    test('should handle email with whitespace', () => {
      const emailWithSpaces = '  test@example.com  ';
      const pseudonym = pseudonymizeEmail(emailWithSpaces);
      expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
    });

    test('should handle malformed emails gracefully', () => {
      const malformedEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test@@example.com',
      ];

      malformedEmails.forEach(email => {
        const pseudonym = pseudonymizeEmail(email);
        // Should still produce a pseudonym (we don't validate email format)
        expect(pseudonym).toMatch(/^email_[a-f0-9]{16}$/);
      });
    });

    test('should handle IPv4-mapped IPv6 addresses', () => {
      const ip = '::ffff:192.168.1.1';
      const pseudonym = pseudonymizeIP(ip);
      // Should be detected as IPv6 (contains colon)
      expect(pseudonym).toMatch(/^ipv6_[a-f0-9]{12}$/);
    });
  });
});
