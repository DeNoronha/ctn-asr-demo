import { escapeSqlWildcards } from './database';

/**
 * Unit tests for SQL wildcard escaping utility
 *
 * Security: CVSS 4.3 (MEDIUM) - CWE-89: SQL Injection (Wildcard Injection)
 * Tests verify that wildcard characters are properly escaped to prevent
 * data enumeration attacks via LIKE/ILIKE queries.
 */

describe('escapeSqlWildcards', () => {
  test('should escape percent wildcard', () => {
    expect(escapeSqlWildcards('test%')).toBe('test\\%');
    expect(escapeSqlWildcards('%')).toBe('\\%');
    expect(escapeSqlWildcards('%%')).toBe('\\%\\%');
  });

  test('should escape underscore wildcard', () => {
    expect(escapeSqlWildcards('test_')).toBe('test\\_');
    expect(escapeSqlWildcards('_')).toBe('\\_');
    expect(escapeSqlWildcards('__')).toBe('\\_\\_');
  });

  test('should escape backslash', () => {
    expect(escapeSqlWildcards('test\\')).toBe('test\\\\');
    expect(escapeSqlWildcards('\\')).toBe('\\\\');
    expect(escapeSqlWildcards('\\\\')).toBe('\\\\\\\\');
  });

  test('should escape multiple special characters in correct order', () => {
    // Backslash must be escaped first, then % and _
    expect(escapeSqlWildcards('\\%_')).toBe('\\\\\\%\\_');
    expect(escapeSqlWildcards('test\\%test_')).toBe('test\\\\\\%test\\_');
  });

  test('should handle malicious enumeration attempts', () => {
    // Attacker tries to list all records
    expect(escapeSqlWildcards('%')).toBe('\\%');

    // Attacker tries pattern matching
    expect(escapeSqlWildcards('admin_%')).toBe('admin\\_\\%');

    // Attacker tries complex wildcards
    expect(escapeSqlWildcards('%_test_%')).toBe('\\%\\_test\\_\\%');
  });

  test('should preserve normal text', () => {
    expect(escapeSqlWildcards('john@example.com')).toBe('john@example.com');
    expect(escapeSqlWildcards('test-user')).toBe('test-user');
    expect(escapeSqlWildcards('Test User 123')).toBe('Test User 123');
  });

  test('should handle empty and null inputs', () => {
    expect(escapeSqlWildcards('')).toBe('');
    expect(escapeSqlWildcards(null as any)).toBe(null);
    expect(escapeSqlWildcards(undefined as any)).toBe(undefined);
  });

  test('should handle edge cases', () => {
    // Only special characters
    expect(escapeSqlWildcards('%_\\')).toBe('\\%\\_\\\\');

    // Special characters at different positions
    expect(escapeSqlWildcards('%start')).toBe('\\%start');
    expect(escapeSqlWildcards('end%')).toBe('end\\%');
    expect(escapeSqlWildcards('mid%dle')).toBe('mid\\%dle');
  });
});

/**
 * Integration test example showing secure usage in ILIKE queries
 */
describe('escapeSqlWildcards integration', () => {
  test('should demonstrate secure ILIKE query pattern', () => {
    // Malicious user input attempting to enumerate all emails
    const maliciousInput = '%';

    // Without escaping (VULNERABLE):
    // const unsafeParam = `%${maliciousInput}%`; // Results in "%%%" - matches everything!

    // With escaping (SECURE):
    const safeParam = `%${escapeSqlWildcards(maliciousInput)}%`; // Results in "%\%%"

    // The safe parameter now searches for literal "%" character, not wildcard
    expect(safeParam).toBe('%\\%');

    // Verify the query would be: SELECT * FROM audit_log WHERE user_email ILIKE '%\%%'
    // This searches for emails containing literal "%" character, not all emails
  });

  test('should demonstrate realistic search scenarios', () => {
    // User searches for "john_doe@example.com" (with legitimate underscore)
    const userSearch = 'john_doe';
    const escaped = escapeSqlWildcards(userSearch);

    // Without escaping: "john_doe" matches "johnXdoe" (X = any char)
    // With escaping: "john\_doe" only matches literal "john_doe"
    expect(escaped).toBe('john\\_doe');

    const queryParam = `%${escaped}%`;
    expect(queryParam).toBe('%john\\_doe%');
  });
});
