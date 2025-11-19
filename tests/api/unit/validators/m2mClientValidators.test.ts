/**
 * M2M Client Validators Unit Tests
 *
 * Comprehensive test coverage for all validation functions.
 */

import { describe, it, expect } from '@jest/globals';
import {
  isValidUUID,
  validateClientId,
  validateLegalEntityId,
  validateScopes,
  validateCreateClientData,
  validateGenerateSecretData,
  validateUpdateScopesData,
  validateDeactivateClientData,
  VALID_M2M_SCOPES
} from '../m2mClientValidators';

describe('M2M Client Validators', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('validateClientId', () => {
    it('should return valid for correct UUID', () => {
      const result = validateClientId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for missing client_id', () => {
      const result = validateClientId(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('client_id parameter is required');
    });

    it('should return error for invalid UUID format', () => {
      const result = validateClientId('invalid-uuid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid UUID format for client_id');
    });
  });

  describe('validateLegalEntityId', () => {
    it('should return valid for correct UUID', () => {
      const result = validateLegalEntityId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for missing legal_entity_id', () => {
      const result = validateLegalEntityId(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('legal_entity_id parameter is required');
    });

    it('should return error for invalid UUID format', () => {
      const result = validateLegalEntityId('not-a-valid-uuid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid UUID format for legal_entity_id');
    });
  });

  describe('validateScopes', () => {
    it('should return valid for correct scopes array', () => {
      const result = validateScopes(['ETA.Read', 'Container.Read']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for all valid scopes', () => {
      const result = validateScopes([...VALID_M2M_SCOPES]);
      expect(result.isValid).toBe(true);
    });

    it('should return error for non-array input', () => {
      const result = validateScopes('not-an-array');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('assigned_scopes must be an array');
    });

    it('should return error for null/undefined', () => {
      expect(validateScopes(null).isValid).toBe(false);
      expect(validateScopes(undefined).isValid).toBe(false);
    });

    it('should return error for empty array', () => {
      const result = validateScopes([]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('assigned_scopes must contain at least one scope');
    });

    it('should return error for invalid scopes', () => {
      const result = validateScopes(['ETA.Read', 'Invalid.Scope']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid scopes provided');
      expect(result.details?.invalid_scopes).toEqual(['Invalid.Scope']);
      expect(result.details?.valid_scopes).toEqual([...VALID_M2M_SCOPES]);
    });

    it('should return error for all invalid scopes', () => {
      const result = validateScopes(['Bad.Scope1', 'Bad.Scope2']);
      expect(result.isValid).toBe(false);
      expect(result.details?.invalid_scopes).toEqual(['Bad.Scope1', 'Bad.Scope2']);
    });
  });

  describe('validateCreateClientData', () => {
    const validData = {
      client_name: 'Test Client',
      description: 'Test description',
      assigned_scopes: ['ETA.Read', 'Container.Read']
    };

    it('should return valid for correct data', () => {
      const result = validateCreateClientData(validData);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid without optional description', () => {
      const data = {
        client_name: 'Test Client',
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error for non-object input', () => {
      const result = validateCreateClientData('not-an-object');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Request body must be a valid JSON object');
    });

    it('should return error for null/undefined', () => {
      expect(validateCreateClientData(null).isValid).toBe(false);
      expect(validateCreateClientData(undefined).isValid).toBe(false);
    });

    it('should return error for missing client_name', () => {
      const data = {
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('client_name is required and must be a string');
    });

    it('should return error for empty client_name', () => {
      const data = {
        client_name: '   ',
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('client_name cannot be empty');
    });

    it('should return error for client_name exceeding 255 chars', () => {
      const data = {
        client_name: 'a'.repeat(256),
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('client_name must not exceed 255 characters');
    });

    it('should return error for non-string client_name', () => {
      const data = {
        client_name: 123,
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('client_name is required and must be a string');
    });

    it('should return error for non-string description', () => {
      const data = {
        client_name: 'Test Client',
        description: 123,
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('description must be a string');
    });

    it('should return error for description exceeding 1000 chars', () => {
      const data = {
        client_name: 'Test Client',
        description: 'a'.repeat(1001),
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('description must not exceed 1000 characters');
    });

    it('should accept null description', () => {
      const data = {
        client_name: 'Test Client',
        description: null,
        assigned_scopes: ['ETA.Read']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(true);
    });

    it('should propagate scope validation errors', () => {
      const data = {
        client_name: 'Test Client',
        assigned_scopes: ['Invalid.Scope']
      };
      const result = validateCreateClientData(data);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid scopes provided');
    });
  });

  describe('validateGenerateSecretData', () => {
    it('should return valid with default expiration for empty body', () => {
      const result = validateGenerateSecretData({});
      expect(result.isValid).toBe(true);
      expect(result.expires_in_days).toBe(365);
    });

    it('should return valid with default expiration for null', () => {
      const result = validateGenerateSecretData(null);
      expect(result.isValid).toBe(true);
      expect(result.expires_in_days).toBe(365);
    });

    it('should return valid with custom expiration', () => {
      const result = validateGenerateSecretData({ expires_in_days: 180 });
      expect(result.isValid).toBe(true);
      expect(result.expires_in_days).toBe(180);
    });

    it('should return error for non-integer expiration', () => {
      const result = validateGenerateSecretData({ expires_in_days: 180.5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('expires_in_days must be an integer');
    });

    it('should return error for non-number expiration', () => {
      const result = validateGenerateSecretData({ expires_in_days: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('expires_in_days must be an integer');
    });

    it('should return error for expiration less than 1', () => {
      const result = validateGenerateSecretData({ expires_in_days: 0 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('expires_in_days must be at least 1');
    });

    it('should return error for expiration exceeding 730', () => {
      const result = validateGenerateSecretData({ expires_in_days: 731 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('expires_in_days must not exceed 730 (2 years)');
    });

    it('should accept boundary values', () => {
      expect(validateGenerateSecretData({ expires_in_days: 1 }).isValid).toBe(true);
      expect(validateGenerateSecretData({ expires_in_days: 730 }).isValid).toBe(true);
    });
  });

  describe('validateUpdateScopesData', () => {
    it('should return valid for correct data', () => {
      const result = validateUpdateScopesData({
        assigned_scopes: ['ETA.Read', 'Booking.Write']
      });
      expect(result.isValid).toBe(true);
    });

    it('should return error for non-object input', () => {
      const result = validateUpdateScopesData('not-an-object');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Request body must be a valid JSON object');
    });

    it('should return error for null/undefined', () => {
      expect(validateUpdateScopesData(null).isValid).toBe(false);
      expect(validateUpdateScopesData(undefined).isValid).toBe(false);
    });

    it('should propagate scope validation errors', () => {
      const result = validateUpdateScopesData({
        assigned_scopes: ['Invalid.Scope']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid scopes provided');
    });

    it('should return error for missing assigned_scopes', () => {
      const result = validateUpdateScopesData({});
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDeactivateClientData', () => {
    it('should return valid with default reason for empty body', () => {
      const result = validateDeactivateClientData({});
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Client deactivated by user');
    });

    it('should return valid with default reason for null', () => {
      const result = validateDeactivateClientData(null);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Client deactivated by user');
    });

    it('should return valid with custom reason', () => {
      const result = validateDeactivateClientData({
        reason: 'Security breach detected'
      });
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Security breach detected');
    });

    it('should return error for non-string reason', () => {
      const result = validateDeactivateClientData({ reason: 123 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('reason must be a string');
    });

    it('should return error for empty reason', () => {
      const result = validateDeactivateClientData({ reason: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('reason cannot be empty');
    });

    it('should return error for reason exceeding 500 chars', () => {
      const result = validateDeactivateClientData({ reason: 'a'.repeat(501) });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('reason must not exceed 500 characters');
    });

    it('should accept boundary values', () => {
      const result = validateDeactivateClientData({ reason: 'a'.repeat(500) });
      expect(result.isValid).toBe(true);
      expect(result.reason?.length).toBe(500);
    });
  });
});
