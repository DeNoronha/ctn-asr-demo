/**
 * M2M Client Validators
 *
 * Validation functions for M2M client operations.
 * Adheres to Single Responsibility Principle - each function validates one aspect.
 */

/**
 * Valid OAuth2 scopes for M2M clients
 */
export const VALID_M2M_SCOPES = [
  'ETA.Read',
  'Container.Read',
  'Booking.Read',
  'Booking.Write',
  'Orchestration.Read'
] as const;

export type M2MScope = typeof VALID_M2M_SCOPES[number];

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Validates UUID format (v4)
 *
 * @param value - Value to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validates client_id parameter (must be UUID)
 *
 * @param clientId - Client ID to validate
 * @returns Validation result
 */
export function validateClientId(clientId: string | undefined): ValidationResult {
  if (!clientId) {
    return {
      isValid: false,
      error: 'client_id parameter is required'
    };
  }

  if (!isValidUUID(clientId)) {
    return {
      isValid: false,
      error: 'Invalid UUID format for client_id'
    };
  }

  return { isValid: true };
}

/**
 * Validates legal_entity_id parameter (must be UUID)
 *
 * @param legalEntityId - Legal entity ID to validate
 * @returns Validation result
 */
export function validateLegalEntityId(legalEntityId: string | undefined): ValidationResult {
  if (!legalEntityId) {
    return {
      isValid: false,
      error: 'legal_entity_id parameter is required'
    };
  }

  if (!isValidUUID(legalEntityId)) {
    return {
      isValid: false,
      error: 'Invalid UUID format for legal_entity_id'
    };
  }

  return { isValid: true };
}

/**
 * Validates OAuth2 scopes array
 *
 * @param scopes - Array of scope strings to validate
 * @returns Validation result with details of invalid scopes if any
 */
export function validateScopes(scopes: unknown): ValidationResult {
  if (!scopes || !Array.isArray(scopes)) {
    return {
      isValid: false,
      error: 'assigned_scopes must be an array'
    };
  }

  if (scopes.length === 0) {
    return {
      isValid: false,
      error: 'assigned_scopes must contain at least one scope'
    };
  }

  const invalidScopes = scopes.filter(scope => !VALID_M2M_SCOPES.includes(scope));

  if (invalidScopes.length > 0) {
    return {
      isValid: false,
      error: 'Invalid scopes provided',
      details: {
        invalid_scopes: invalidScopes,
        valid_scopes: VALID_M2M_SCOPES
      }
    };
  }

  return { isValid: true };
}

/**
 * M2M Client creation data interface
 */
export interface CreateM2MClientData {
  client_name: string;
  description?: string;
  assigned_scopes: string[];
}

/**
 * Validates M2M client creation data
 *
 * @param data - Client creation data to validate
 * @returns Validation result
 */
export function validateCreateClientData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Request body must be a valid JSON object'
    };
  }

  const clientData = data as Record<string, unknown>;

  // Validate client_name
  if (!clientData.client_name || typeof clientData.client_name !== 'string') {
    return {
      isValid: false,
      error: 'client_name is required and must be a string'
    };
  }

  if (clientData.client_name.trim().length === 0) {
    return {
      isValid: false,
      error: 'client_name cannot be empty'
    };
  }

  if (clientData.client_name.length > 255) {
    return {
      isValid: false,
      error: 'client_name must not exceed 255 characters'
    };
  }

  // Validate description (optional)
  if (clientData.description !== undefined && clientData.description !== null) {
    if (typeof clientData.description !== 'string') {
      return {
        isValid: false,
        error: 'description must be a string'
      };
    }

    if (clientData.description.length > 1000) {
      return {
        isValid: false,
        error: 'description must not exceed 1000 characters'
      };
    }
  }

  // Validate assigned_scopes
  const scopesValidation = validateScopes(clientData.assigned_scopes);
  if (!scopesValidation.isValid) {
    return scopesValidation;
  }

  return { isValid: true };
}

/**
 * Validates secret generation request data
 *
 * @param data - Secret generation data to validate
 * @returns Validation result with sanitized expires_in_days
 */
export function validateGenerateSecretData(data: unknown): ValidationResult & { expires_in_days?: number } {
  if (!data || typeof data !== 'object') {
    // Default expiration: 365 days (1 year)
    return { isValid: true, expires_in_days: 365 };
  }

  const secretData = data as Record<string, unknown>;

  // Validate expires_in_days (optional, default 365)
  let expiresInDays = 365;

  if (secretData.expires_in_days !== undefined) {
    if (typeof secretData.expires_in_days !== 'number' || !Number.isInteger(secretData.expires_in_days)) {
      return {
        isValid: false,
        error: 'expires_in_days must be an integer'
      };
    }

    if (secretData.expires_in_days < 1) {
      return {
        isValid: false,
        error: 'expires_in_days must be at least 1'
      };
    }

    if (secretData.expires_in_days > 730) { // Max 2 years
      return {
        isValid: false,
        error: 'expires_in_days must not exceed 730 (2 years)'
      };
    }

    expiresInDays = secretData.expires_in_days;
  }

  return { isValid: true, expires_in_days: expiresInDays };
}

/**
 * Validates scope update request data
 *
 * @param data - Scope update data to validate
 * @returns Validation result
 */
export function validateUpdateScopesData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Request body must be a valid JSON object'
    };
  }

  const updateData = data as Record<string, unknown>;

  // Validate assigned_scopes is present and valid
  const scopesValidation = validateScopes(updateData.assigned_scopes);
  if (!scopesValidation.isValid) {
    return scopesValidation;
  }

  return { isValid: true };
}

/**
 * Validates deactivation request data
 *
 * @param data - Deactivation data to validate
 * @returns Validation result with sanitized reason
 */
export function validateDeactivateClientData(data: unknown): ValidationResult & { reason?: string } {
  let reason = 'Client deactivated by user'; // Default reason

  if (data && typeof data === 'object') {
    const deactivationData = data as Record<string, unknown>;

    if (deactivationData.reason !== undefined) {
      if (typeof deactivationData.reason !== 'string') {
        return {
          isValid: false,
          error: 'reason must be a string'
        };
      }

      if (deactivationData.reason.trim().length === 0) {
        return {
          isValid: false,
          error: 'reason cannot be empty'
        };
      }

      if (deactivationData.reason.length > 500) {
        return {
          isValid: false,
          error: 'reason must not exceed 500 characters'
        };
      }

      reason = deactivationData.reason;
    }
  }

  return { isValid: true, reason };
}
