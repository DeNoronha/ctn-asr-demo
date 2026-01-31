/**
 * EUID Service Tests
 * 
 * Tests for European Unique Identifier generation and validation.
 * 
 * EUID Format: {CountryCode}{RegisterCode}.{Number}
 * - Netherlands: NLNHR.{kvk} (e.g., NLNHR.51096072)
 * - Germany: DE{court}.{type}{nr} (e.g., DEK1101R.HRB116737) - NOT auto-generated
 * - Belgium: BEKBOBCE.{kbo} (e.g., BEKBOBCE.0656727414)
 * 
 * @see https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu_en
 * @see EU Verordening 2021/1042
 */

import {
  generateEuid,
  validateKvkNumber,
  supportsEuidGeneration
} from '../../../../api/src/services/euidService';

describe('EUID Service', () => {
  
  describe('validateKvkNumber', () => {
    it('should validate correct KvK numbers (8 digits)', () => {
      expect(validateKvkNumber('51096072')).toBe(true);
      expect(validateKvkNumber('12345678')).toBe(true);
      expect(validateKvkNumber('00000001')).toBe(true);
    });

    it('should reject invalid KvK numbers', () => {
      expect(validateKvkNumber('1234567')).toBe(false);   // Too short
      expect(validateKvkNumber('123456789')).toBe(false); // Too long
      expect(validateKvkNumber('1234567a')).toBe(false);  // Contains letter
      expect(validateKvkNumber('')).toBe(false);          // Empty
      expect(validateKvkNumber('  ')).toBe(false);        // Whitespace only
    });

    it('should handle whitespace in KvK numbers', () => {
      expect(validateKvkNumber(' 51096072 ')).toBe(true); // Trimmed
      expect(validateKvkNumber('5109 6072')).toBe(false); // Space in middle
    });
  });

  describe('generateEuid', () => {
    describe('Netherlands (KVK → NLNHR.{kvk})', () => {
      it('should generate correct EUID from KvK number', () => {
        expect(generateEuid('KVK', '51096072')).toBe('NLNHR.51096072');
        expect(generateEuid('KVK', '12345678')).toBe('NLNHR.12345678');
        expect(generateEuid('kvk', '87654321')).toBe('NLNHR.87654321'); // Case insensitive
      });

      it('should handle KvK with whitespace', () => {
        expect(generateEuid('KVK', ' 51096072 ')).toBe('NLNHR.51096072');
      });

      it('should reject invalid KvK numbers', () => {
        expect(() => generateEuid('KVK', '1234567')).toThrow('Invalid KvK number format');
        expect(() => generateEuid('KVK', '123456789')).toThrow('Invalid KvK number format');
        expect(() => generateEuid('KVK', 'abcdefgh')).toThrow('Invalid KvK number format');
      });
    });

    describe('Belgium (KBO → BEKBOBCE.{kbo})', () => {
      it('should generate correct EUID from KBO number', () => {
        expect(generateEuid('KBO', '0656727414')).toBe('BEKBOBCE.0656727414');
      });

      it('should remove dots from KBO number', () => {
        expect(generateEuid('KBO', '0656.727.414')).toBe('BEKBOBCE.0656727414');
      });
    });

    describe('Germany (HRB/HRA)', () => {
      it('should throw error for German registers (requires court code)', () => {
        expect(() => generateEuid('HRB', '116737')).toThrow('German EUID requires court code');
        expect(() => generateEuid('HRA', '12345')).toThrow('German EUID requires court code');
      });
    });

    describe('Unsupported identifier types', () => {
      it('should throw error for unsupported identifier types', () => {
        expect(() => generateEuid('UNKNOWN', '12345678')).toThrow('EUID generation not supported');
        expect(() => generateEuid('LEI', '529900HNOAA1KXQJUQ27')).toThrow('EUID generation not supported');
      });
    });
  });

  describe('supportsEuidGeneration', () => {
    it('should return true for supported types', () => {
      expect(supportsEuidGeneration('KVK')).toBe(true);
      expect(supportsEuidGeneration('kvk')).toBe(true); // Case insensitive
      expect(supportsEuidGeneration('KBO')).toBe(true);
      expect(supportsEuidGeneration('SIREN')).toBe(true);
      expect(supportsEuidGeneration('CRN')).toBe(true);
    });

    it('should return false for German registers (cannot auto-generate)', () => {
      expect(supportsEuidGeneration('HRB')).toBe(false);
      expect(supportsEuidGeneration('HRA')).toBe(false);
    });

    it('should return false for unsupported types', () => {
      expect(supportsEuidGeneration('LEI')).toBe(false);
      expect(supportsEuidGeneration('VAT')).toBe(false);
      expect(supportsEuidGeneration('UNKNOWN')).toBe(false);
    });
  });

  describe('EUID Format Verification', () => {
    it('should generate EUIDs matching official BRIS format', () => {
      // Netherlands: NLNHR.{kvk}
      const nlEuid = generateEuid('KVK', '51096072');
      expect(nlEuid).toMatch(/^NLNHR\.\d{8}$/);
      expect(nlEuid).toBe('NLNHR.51096072');

      // Belgium: BEKBOBCE.{kbo}
      const beEuid = generateEuid('KBO', '0656727414');
      expect(beEuid).toMatch(/^BEKBOBCE\.\d{10}$/);
      expect(beEuid).toBe('BEKBOBCE.0656727414');
    });

    it('should NOT generate old incorrect format (NL.KVK.xxx)', () => {
      const euid = generateEuid('KVK', '51096072');
      expect(euid).not.toContain('NL.KVK');
      expect(euid).not.toMatch(/^NL\.\w+\.\d+$/);
    });
  });
});
