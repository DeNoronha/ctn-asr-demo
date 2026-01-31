/**
 * Validator Utilities Tests
 */

import {
  isValidUUID,
  isValidEmail,
  isValidURL,
  isValidKvK,
  isValidLEI,
  isValidEUID,
  isNonEmptyString,
  isPositiveNumber,
  isValidLength,
  ValidationError,
  validateAll
} from '../../../../api/src/utils/validators';

describe('isValidUUID', () => {
  it('should validate correct UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('invalid-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false); // No dashes
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@company.co.uk')).toBe(true);
    expect(isValidEmail('name+tag@domain.org')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('isValidURL', () => {
  it('should validate correct URLs', () => {
    expect(isValidURL('https://example.com')).toBe(true);
    expect(isValidURL('http://www.example.com/path')).toBe(true);
    expect(isValidURL('https://api.example.com:8080/endpoint')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidURL('not-a-url')).toBe(false);
    expect(isValidURL('ftp://example.com')).toBe(false);
    expect(isValidURL('example.com')).toBe(false);
    expect(isValidURL('')).toBe(false);
    expect(isValidURL(null)).toBe(false);
    expect(isValidURL(undefined)).toBe(false);
  });
});

describe('isValidKvK', () => {
  it('should validate correct KvK numbers', () => {
    expect(isValidKvK('12345678')).toBe(true);
    expect(isValidKvK('87654321')).toBe(true);
  });

  it('should reject invalid KvK numbers', () => {
    expect(isValidKvK('1234567')).toBe(false); // Too short
    expect(isValidKvK('123456789')).toBe(false); // Too long
    expect(isValidKvK('1234567a')).toBe(false); // Contains letter
    expect(isValidKvK('')).toBe(false);
    expect(isValidKvK(null)).toBe(false);
    expect(isValidKvK(undefined)).toBe(false);
  });
});

describe('isValidLEI', () => {
  it('should validate correct LEI codes', () => {
    expect(isValidLEI('529900HNOAA1KXQJUQ27')).toBe(true);
    expect(isValidLEI('ABCDEFGHIJ1234567890')).toBe(true);
  });

  it('should reject invalid LEI codes', () => {
    expect(isValidLEI('529900HNOAA1KXQJUQ2')).toBe(false); // Too short
    expect(isValidLEI('529900HNOAA1KXQJUQ277')).toBe(false); // Too long
    expect(isValidLEI('529900hnoaa1kxqjuq27')).toBe(false); // Lowercase
    expect(isValidLEI('')).toBe(false);
    expect(isValidLEI(null)).toBe(false);
    expect(isValidLEI(undefined)).toBe(false);
  });
});

describe('isValidEUID', () => {
  it('should validate correct EUID codes', () => {
    // Netherlands - NLNHR.{kvk}
    expect(isValidEUID('NLNHR.51096072')).toBe(true);
    expect(isValidEUID('NLNHR.12345678')).toBe(true);
    expect(isValidEUID('nlnhr.51096072')).toBe(true); // Case insensitive
    
    // Germany - DE{court}.{type}{nr}
    expect(isValidEUID('DEK1101R.HRB116737')).toBe(true);
    expect(isValidEUID('DEHRE.HRA12345')).toBe(true);
    
    // Belgium - BEKBOBCE.{kbo}
    expect(isValidEUID('BEKBOBCE.0656727414')).toBe(true);
    expect(isValidEUID('BEKBOBCE.0656.727.414')).toBe(true); // With dots in KBO
  });

  it('should reject invalid EUID codes', () => {
    // Old incorrect format (NL.KVK.xxx)
    expect(isValidEUID('NL.KVK.12345678')).toBe(false);
    expect(isValidEUID('NL.123456.1234567890')).toBe(false);
    
    // Too short country code
    expect(isValidEUID('N.NHR.12345678')).toBe(false);
    
    // Missing dot separator
    expect(isValidEUID('NLNHR51096072')).toBe(false);
    
    // Empty/null/undefined
    expect(isValidEUID('')).toBe(false);
    expect(isValidEUID(null)).toBe(false);
    expect(isValidEUID(undefined)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('should validate non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('  test  ')).toBe(true);
  });

  it('should reject empty or non-string values', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false); // Only whitespace
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  it('should validate positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(100.5)).toBe(true);
    expect(isPositiveNumber(0.001)).toBe(true);
  });

  it('should reject non-positive or non-number values', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(Number.NaN)).toBe(false);
    expect(isPositiveNumber('10')).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
    expect(isPositiveNumber(undefined)).toBe(false);
  });
});

describe('isValidLength', () => {
  it('should validate string length within bounds', () => {
    expect(isValidLength('hello', 1, 10)).toBe(true);
    expect(isValidLength('test', 4, 4)).toBe(true); // Exact match
    expect(isValidLength('a', 1, 100)).toBe(true);
  });

  it('should reject strings outside length bounds', () => {
    expect(isValidLength('hello', 10, 20)).toBe(false); // Too short
    expect(isValidLength('hello', 1, 3)).toBe(false); // Too long
    expect(isValidLength('', 1, 10)).toBe(false); // Empty string
    expect(isValidLength(null, 1, 10)).toBe(false);
    expect(isValidLength(undefined, 1, 10)).toBe(false);
  });
});

describe('ValidationError', () => {
  it('should create validation error with field and message', () => {
    const error = new ValidationError('email', 'Invalid email format');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.field).toBe('email');
    expect(error.message).toContain('Invalid email format');
    expect(error.message).toContain('email');
    expect(error.name).toBe('ValidationError');
  });

  it('should include value in error when provided', () => {
    const error = new ValidationError('id', 'Invalid UUID', 'invalid-value');

    expect(error.value).toBe('invalid-value');
    expect(error.field).toBe('id');
  });
});

describe('validateAll', () => {
  it('should pass when all validations succeed', () => {
    expect(() => {
      validateAll([
        { condition: isValidUUID('550e8400-e29b-41d4-a716-446655440000'), field: 'id', message: 'Invalid ID' },
        { condition: isValidEmail('test@example.com'), field: 'email', message: 'Invalid email' },
        { condition: true, field: 'other', message: 'Should not fail' }
      ]);
    }).not.toThrow();
  });

  it('should throw ValidationError on first failure', () => {
    expect(() => {
      validateAll([
        { condition: true, field: 'field1', message: 'Success' },
        { condition: false, field: 'field2', message: 'This fails' },
        { condition: false, field: 'field3', message: 'Never checked' }
      ]);
    }).toThrow(ValidationError);

    try {
      validateAll([
        { condition: false, field: 'email', message: 'Invalid email format', value: 'bad-email' }
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('email');
      expect((error as ValidationError).message).toContain('Invalid email format');
      expect((error as ValidationError).value).toBe('bad-email');
    }
  });
});
