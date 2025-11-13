/**
 * Validation Utilities
 *
 * Centralized validation functions to eliminate duplicate validation patterns.
 * All validators return boolean values.
 */

/**
 * UUID v4 validation regex
 * Matches: 8-4-4-4-12 hexadecimal format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Email validation regex (RFC 5322 simplified)
 * Matches most common email formats
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * URL validation regex
 * Matches http/https URLs
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

/**
 * KvK number validation (Dutch Chamber of Commerce)
 * 8 digits exactly
 */
const KVK_REGEX = /^\d{8}$/;

/**
 * LEI validation (Legal Entity Identifier)
 * 20 alphanumeric characters
 */
const LEI_REGEX = /^[A-Z0-9]{20}$/;

/**
 * EUID validation (European Unique Identifier)
 * Format: XX.XXXXXX.XXXXXXXXXX (country code + identifier)
 */
const EUID_REGEX = /^[A-Z]{2}\.[A-Z0-9]{6}\.[A-Z0-9]{10}$/;

/**
 * Validates if a string is a valid UUID v4
 * @param value - The string to validate
 * @returns true if valid UUID, false otherwise
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('invalid-uuid') // false
 */
export function isValidUUID(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Validates if a string is a valid email address
 * @param value - The string to validate
 * @returns true if valid email, false otherwise
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(value);
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * @param value - The string to validate
 * @returns true if valid URL, false otherwise
 * @example
 * isValidURL('https://example.com') // true
 * isValidURL('not-a-url') // false
 */
export function isValidURL(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return URL_REGEX.test(value);
}

/**
 * Validates if a string is a valid KvK number (Dutch Chamber of Commerce)
 * @param value - The string to validate
 * @returns true if valid KvK number, false otherwise
 * @example
 * isValidKvK('12345678') // true
 * isValidKvK('1234567') // false
 */
export function isValidKvK(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return KVK_REGEX.test(value);
}

/**
 * Validates if a string is a valid LEI (Legal Entity Identifier)
 * @param value - The string to validate
 * @returns true if valid LEI, false otherwise
 * @example
 * isValidLEI('529900HNOAA1KXQJUQ27') // true
 * isValidLEI('invalid') // false
 */
export function isValidLEI(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return LEI_REGEX.test(value);
}

/**
 * Validates if a string is a valid EUID (European Unique Identifier)
 * @param value - The string to validate
 * @returns true if valid EUID, false otherwise
 * @example
 * isValidEUID('NL.123456.1234567890') // true
 * isValidEUID('invalid') // false
 */
export function isValidEUID(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return EUID_REGEX.test(value.toUpperCase());
}

/**
 * Validates if a value is a non-empty string
 * @param value - The value to validate
 * @returns true if non-empty string, false otherwise
 */
export function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates if a value is a positive number
 * @param value - The value to validate
 * @returns true if positive number, false otherwise
 */
export function isPositiveNumber(value: any): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

/**
 * Validates if a string length is within bounds
 * @param value - The string to validate
 * @param min - Minimum length (inclusive)
 * @param max - Maximum length (inclusive)
 * @returns true if length is within bounds, false otherwise
 */
export function isValidLength(
  value: string | undefined | null,
  min: number,
  max: number
): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * Validation error builder for consistent error messages
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public value?: any
  ) {
    super(`Validation error on field '${field}': ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Validates multiple conditions and throws ValidationError on first failure
 * @param validations - Array of validation checks
 * @throws ValidationError if any validation fails
 * @example
 * validateAll([
 *   { condition: isValidUUID(id), field: 'id', message: 'Invalid UUID' },
 *   { condition: isValidEmail(email), field: 'email', message: 'Invalid email' }
 * ]);
 */
export function validateAll(
  validations: Array<{
    condition: boolean;
    field: string;
    message: string;
    value?: any;
  }>
): void {
  for (const validation of validations) {
    if (!validation.condition) {
      throw new ValidationError(validation.field, validation.message, validation.value);
    }
  }
}
