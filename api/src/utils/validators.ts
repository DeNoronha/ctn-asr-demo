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
 * RSIN validation (Rechtspersonen en Samenwerkingsverbanden Informatie Nummer)
 * Dutch legal entity identification number
 * Format: 9 digits with check digit validation
 * Source: https://business.gov.nl/running-your-business/administration/an-rsin-number-for-your-business/
 *
 * Check digit algorithm (11-proof):
 * ((N1*9) + (N2*8) + (N3*7) + (N4*6) + (N5*5) + (N6*4) + (N7*3) + (N8*2)) mod 11 = N9
 * If remainder = 10, the RSIN is invalid
 */
const RSIN_REGEX = /^\d{9}$/;

/**
 * EORI validation (Economic Operators Registration and Identification)
 * EU customs identification number
 * Format varies by country, Dutch EORI: NL + 9 digits (RSIN padded to 9 digits)
 * Source: https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp
 */
const EORI_NL_REGEX = /^NL\d{9}$/;

/**
 * EU VAT Number Format Definitions
 * Source: https://www.avalara.com/vatlive/en/eu-vat-rules/eu-vat-number-registration/eu-vat-number-formats.html
 *
 * Each country has specific format requirements:
 * - Country code (2 letters) + country-specific pattern
 * - Total character count varies by country (8-15 characters including country code)
 */
export const EU_VAT_FORMATS: Record<
  string,
  {
    pattern: RegExp;
    length: number | number[];
    description: string;
    example: string;
  }
> = {
  AT: {
    pattern: /^ATU\d{8}$/,
    length: 11,
    description: 'U + 8 digits',
    example: 'ATU12345678',
  },
  BE: {
    pattern: /^BE[01]\d{9}$/,
    length: 12,
    description: '10 digits (prefix with 0 if 9 digits)',
    example: 'BE0123456789',
  },
  BG: {
    pattern: /^BG\d{9,10}$/,
    length: [11, 12],
    description: '9 or 10 digits',
    example: 'BG123456789',
  },
  HR: {
    pattern: /^HR\d{11}$/,
    length: 13,
    description: '11 digits',
    example: 'HR12345678901',
  },
  CY: {
    pattern: /^CY\d{8}[A-Z]$/,
    length: 11,
    description: '8 digits + 1 letter',
    example: 'CY12345678X',
  },
  CZ: {
    pattern: /^CZ\d{8,10}$/,
    length: [10, 11, 12],
    description: '8, 9, or 10 digits',
    example: 'CZ12345678',
  },
  DK: {
    pattern: /^DK\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'DK12345678',
  },
  EE: {
    pattern: /^EE\d{9}$/,
    length: 11,
    description: '9 digits',
    example: 'EE123456789',
  },
  FI: {
    pattern: /^FI\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'FI12345678',
  },
  FR: {
    pattern: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/,
    length: 13,
    description: '2 characters (not O or I) + 9 digits',
    example: 'FR12345678901',
  },
  DE: {
    pattern: /^DE\d{9}$/,
    length: 11,
    description: '9 digits',
    example: 'DE123456789',
  },
  EL: {
    pattern: /^EL\d{9}$/,
    length: 11,
    description: '9 digits (Greece uses EL, not GR)',
    example: 'EL123456789',
  },
  GR: {
    // Alternative code for Greece
    pattern: /^GR\d{9}$/,
    length: 11,
    description: '9 digits (alternative to EL)',
    example: 'GR123456789',
  },
  HU: {
    pattern: /^HU\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'HU12345678',
  },
  IE: {
    pattern: /^IE(\d{7}[A-W]|\d[A-Z+*]\d{5}[A-W]|\d{7}[A-W]{2})$/,
    length: [10, 11],
    description: 'Various formats with letters',
    example: 'IE1234567WA',
  },
  IT: {
    pattern: /^IT\d{11}$/,
    length: 13,
    description: '11 digits',
    example: 'IT12345678901',
  },
  LV: {
    pattern: /^LV\d{11}$/,
    length: 13,
    description: '11 digits',
    example: 'LV12345678901',
  },
  LT: {
    pattern: /^LT(\d{9}|\d{12})$/,
    length: [11, 14],
    description: '9 or 12 digits',
    example: 'LT123456789',
  },
  LU: {
    pattern: /^LU\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'LU12345678',
  },
  MT: {
    pattern: /^MT\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'MT12345678',
  },
  NL: {
    pattern: /^NL\d{9}B\d{2}$/,
    length: 14,
    description: '9 digits + B + 2 digits (10th char always B)',
    example: 'NL123456789B01',
  },
  PL: {
    pattern: /^PL\d{10}$/,
    length: 12,
    description: '10 digits',
    example: 'PL1234567890',
  },
  PT: {
    pattern: /^PT\d{9}$/,
    length: 11,
    description: '9 digits',
    example: 'PT123456789',
  },
  RO: {
    pattern: /^RO\d{2,10}$/,
    length: [4, 12],
    description: '2 to 10 digits',
    example: 'RO1234567890',
  },
  SK: {
    pattern: /^SK\d{10}$/,
    length: 12,
    description: '10 digits',
    example: 'SK1234567890',
  },
  SI: {
    pattern: /^SI\d{8}$/,
    length: 10,
    description: '8 digits',
    example: 'SI12345678',
  },
  ES: {
    pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    length: 11,
    description: 'Letter/digit + 7 digits + letter/digit',
    example: 'ESX1234567X',
  },
  SE: {
    pattern: /^SE\d{12}$/,
    length: 14,
    description: '12 digits',
    example: 'SE123456789012',
  },
  // Non-EU but commonly used
  GB: {
    pattern: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
    length: [11, 14, 7],
    description: '9 or 12 digits, or GD/HA + 3 digits',
    example: 'GB123456789',
  },
  NO: {
    pattern: /^NO\d{9}MVA$/,
    length: 14,
    description: '9 digits + MVA',
    example: 'NO123456789MVA',
  },
  CH: {
    pattern: /^CHE\d{9}(MWST|TVA|IVA)$/,
    length: [15, 16],
    description: 'CHE + 9 digits + MWST/TVA/IVA',
    example: 'CHE123456789MWST',
  },
};

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

// =====================================================
// RSIN (Dutch Legal Entity Number) Validation
// =====================================================

/**
 * Calculates the RSIN check digit using the 11-proof algorithm
 * @param digits - First 8 digits of the RSIN
 * @returns The calculated check digit (0-9), or -1 if invalid (remainder = 10)
 */
function calculateRSINCheckDigit(digits: string): number {
  if (digits.length !== 8 || !/^\d{8}$/.test(digits)) {
    return -1;
  }

  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }

  const remainder = sum % 11;

  // If remainder is 10, the number is invalid
  if (remainder === 10) {
    return -1;
  }

  return remainder;
}

/**
 * Validates if a string is a valid RSIN (Rechtspersonen en Samenwerkingsverbanden Informatie Nummer)
 * Dutch legal entity identification number with check digit validation
 *
 * @param value - The string to validate (9 digits)
 * @param validateCheckDigit - Whether to validate the check digit (default: true)
 * @returns Object with validation result and details
 *
 * @example
 * isValidRSIN('123456782') // { valid: true, ... } if check digit is correct
 * isValidRSIN('123456789') // { valid: false, error: 'Invalid check digit' }
 *
 * @see https://business.gov.nl/running-your-business/administration/an-rsin-number-for-your-business/
 */
export function isValidRSIN(
  value: string | undefined | null,
  validateCheckDigit = true
): {
  valid: boolean;
  normalizedValue?: string;
  error?: string;
} {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'RSIN is required' };
  }

  // Remove spaces and normalize
  const normalized = value.replace(/[\s.-]/g, '');

  // Check basic format (9 digits)
  if (!RSIN_REGEX.test(normalized)) {
    return {
      valid: false,
      normalizedValue: normalized,
      error: 'RSIN must be exactly 9 digits',
    };
  }

  // Validate check digit if requested
  if (validateCheckDigit) {
    const first8 = normalized.substring(0, 8);
    const providedCheckDigit = parseInt(normalized[8], 10);
    const calculatedCheckDigit = calculateRSINCheckDigit(first8);

    if (calculatedCheckDigit === -1) {
      return {
        valid: false,
        normalizedValue: normalized,
        error: 'Invalid RSIN: check digit calculation resulted in 10 (invalid)',
      };
    }

    if (providedCheckDigit !== calculatedCheckDigit) {
      return {
        valid: false,
        normalizedValue: normalized,
        error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}`,
      };
    }
  }

  return {
    valid: true,
    normalizedValue: normalized,
  };
}

/**
 * Formats an RSIN number to the standard 9-digit format
 * Pads with leading zeros if necessary
 *
 * @param value - The RSIN value (can be less than 9 digits)
 * @returns Formatted 9-digit RSIN or null if invalid
 *
 * @example
 * formatRSIN('1671248') // '001671248' (padded to 9 digits)
 * formatRSIN('001671248') // '001671248'
 */
export function formatRSIN(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove non-digits
  const digitsOnly = value.replace(/\D/g, '');

  // Must have at least 1 digit and at most 9
  if (digitsOnly.length === 0 || digitsOnly.length > 9) {
    return null;
  }

  // Pad with leading zeros to 9 digits
  return digitsOnly.padStart(9, '0');
}

// =====================================================
// EORI (Economic Operators Registration and Identification)
// =====================================================

/**
 * Generates a Dutch EORI number from an RSIN
 * Dutch EORI format: NL + RSIN (9 digits, padded with zeros if needed)
 *
 * @param rsin - The RSIN number
 * @returns Formatted Dutch EORI number or null if RSIN is invalid
 *
 * @example
 * generateEORIFromRSIN('001671248') // 'NL001671248'
 * generateEORIFromRSIN('1671248')   // 'NL001671248' (auto-pads)
 *
 * @see https://intercompanysolutions.com/eori-number/
 */
export function generateEORIFromRSIN(rsin: string | undefined | null): string | null {
  const formattedRSIN = formatRSIN(rsin);
  if (!formattedRSIN) {
    return null;
  }
  return `NL${formattedRSIN}`;
}

/**
 * Validates if a string is a valid Dutch EORI number
 *
 * @param value - The EORI number to validate
 * @returns Object with validation result and details
 *
 * @example
 * isValidEORI('NL001671248') // { valid: true, ... }
 * isValidEORI('NL12345')     // { valid: false, error: '...' }
 */
export function isValidEORI(
  value: string | undefined | null
): {
  valid: boolean;
  countryCode?: string;
  normalizedValue?: string;
  rsin?: string;
  error?: string;
} {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'EORI number is required' };
  }

  // Normalize: remove spaces and convert to uppercase
  const normalized = value.replace(/[\s.-]/g, '').toUpperCase();

  // Currently only supporting Dutch EORI (NL)
  if (!normalized.startsWith('NL')) {
    return {
      valid: false,
      normalizedValue: normalized,
      error: 'Only Dutch EORI (NL) is currently supported',
    };
  }

  // Validate Dutch EORI format
  if (!EORI_NL_REGEX.test(normalized)) {
    return {
      valid: false,
      countryCode: 'NL',
      normalizedValue: normalized,
      error: 'Dutch EORI must be NL + 9 digits (e.g., NL001671248)',
    };
  }

  // Extract and return the RSIN portion
  const rsin = normalized.substring(2);

  return {
    valid: true,
    countryCode: 'NL',
    normalizedValue: normalized,
    rsin,
  };
}

/**
 * Formats an EORI number to the correct format
 * @param value - The raw EORI number
 * @returns Properly formatted EORI or null if invalid
 */
export function formatEORI(value: string | undefined | null): string | null {
  const result = isValidEORI(value);
  return result.valid ? result.normalizedValue || null : null;
}

/**
 * Extracts the RSIN from a Dutch EORI number
 * @param eori - The EORI number
 * @returns The RSIN portion or null
 */
export function extractRSINFromEORI(eori: string | undefined | null): string | null {
  const result = isValidEORI(eori);
  return result.valid ? result.rsin || null : null;
}

/**
 * Validates if a string is a valid EU VAT number
 * @param value - The VAT number to validate (with or without country code)
 * @param countryCode - Optional country code if not included in value
 * @returns Object with validation result and details
 * @example
 * isValidVAT('NL001671248B03') // { valid: true, countryCode: 'NL', ... }
 * isValidVAT('001671248B03', 'NL') // { valid: true, countryCode: 'NL', ... }
 * isValidVAT('invalid') // { valid: false, error: '...' }
 */
export function isValidVAT(
  value: string | undefined | null,
  countryCode?: string
): {
  valid: boolean;
  countryCode?: string;
  normalizedValue?: string;
  format?: typeof EU_VAT_FORMATS[string];
  error?: string;
} {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'VAT number is required' };
  }

  // Normalize: remove spaces, dots, dashes and convert to uppercase
  let normalized = value.replace(/[\s.-]/g, '').toUpperCase();

  // If country code provided separately, prepend it
  if (countryCode) {
    const cc = countryCode.toUpperCase();
    if (!normalized.startsWith(cc)) {
      normalized = cc + normalized;
    }
  }

  // Extract country code from normalized value
  const detectedCountry = normalized.substring(0, 2);

  // Check if we have a format definition for this country
  const format = EU_VAT_FORMATS[detectedCountry];
  if (!format) {
    return {
      valid: false,
      countryCode: detectedCountry,
      normalizedValue: normalized,
      error: `Unknown country code: ${detectedCountry}. Supported: ${Object.keys(EU_VAT_FORMATS).join(', ')}`,
    };
  }

  // Validate against the country-specific pattern
  if (!format.pattern.test(normalized)) {
    return {
      valid: false,
      countryCode: detectedCountry,
      normalizedValue: normalized,
      format,
      error: `Invalid ${detectedCountry} VAT format. Expected: ${format.description}. Example: ${format.example}`,
    };
  }

  return {
    valid: true,
    countryCode: detectedCountry,
    normalizedValue: normalized,
    format,
  };
}

/**
 * Formats a VAT number to the correct format for a given country
 * @param value - The raw VAT number (digits/letters only or with country code)
 * @param countryCode - The country code (required if not in value)
 * @returns Properly formatted VAT number or null if invalid
 * @example
 * formatVAT('001671248b03', 'NL') // 'NL001671248B03'
 * formatVAT('nl001671248b03') // 'NL001671248B03'
 */
export function formatVAT(
  value: string | undefined | null,
  countryCode?: string
): string | null {
  const result = isValidVAT(value, countryCode);
  return result.valid ? result.normalizedValue || null : null;
}

/**
 * Extracts country code from a VAT number
 * @param value - The VAT number
 * @returns Country code or null
 */
export function extractVATCountry(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const normalized = value.replace(/[\s.-]/g, '').toUpperCase();
  const country = normalized.substring(0, 2);
  return EU_VAT_FORMATS[country] ? country : null;
}

/**
 * Gets VAT format information for a country
 * @param countryCode - The 2-letter country code
 * @returns Format info or undefined
 */
export function getVATFormat(countryCode: string): typeof EU_VAT_FORMATS[string] | undefined {
  return EU_VAT_FORMATS[countryCode.toUpperCase()];
}

/**
 * Lists all supported VAT country codes
 * @returns Array of supported country codes
 */
export function getSupportedVATCountries(): string[] {
  return Object.keys(EU_VAT_FORMATS);
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
