import axios from 'axios';
import { useCallback, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import type { LegalEntityIdentifier } from "../services/api";
import { getAccessToken } from '../utils/auth';
import { logger } from '../utils/logger';
import { sanitizeFormData } from '../utils/sanitize';
import { identifierSuccessMessages } from '../utils/successMessages';

// Validation rules and format examples for identifier types
export const IDENTIFIER_VALIDATION: Record<
  string,
  {
    pattern: RegExp;
    example: string;
    description: string;
  }
> = {
  KVK: {
    pattern: /^\d{8}$/,
    example: '12345678',
    description: '8 digits',
  },
  LEI: {
    pattern: /^[A-Z0-9]{20}$/,
    example: '724500VKKSH9QOLTFR81',
    description: '20 alphanumeric characters',
  },
  EORI: {
    pattern: /^[A-Z]{2}[A-Z0-9]{1,15}$/,
    example: 'NL123456789',
    description: 'Country code + up to 15 alphanumeric (e.g., NL123456789 for Netherlands, DE12345678912345 for Germany)',
  },
  VAT: {
    pattern: /^[A-Z]{2}[A-Z0-9]{2,13}$/,
    example: 'NL123456789B01',
    description: 'Country code + 2-13 alphanumeric',
  },
  DUNS: {
    pattern: /^\d{9}$/,
    example: '123456789',
    description: '9 digits',
  },
  EUID: {
    pattern: /^[A-Z]{2}\.[A-Z0-9.]{1,50}$/,
    example: 'NL.12345678.0001',
    description: 'Country code + identifier',
  },
  HRB: {
    pattern: /^HRB\s?\d{1,6}$/i,
    example: 'HRB 12345',
    description: 'HRB + 1-6 digits',
  },
  HRA: {
    pattern: /^HRA\s?\d{1,6}$/i,
    example: 'HRA 12345',
    description: 'HRA + 1-6 digits',
  },
  KBO: {
    pattern: /^\d{10}$/,
    example: '0123456789',
    description: '10 digits',
  },
  SIREN: {
    pattern: /^\d{9}$/,
    example: '123456789',
    description: '9 digits',
  },
  SIRET: {
    pattern: /^\d{14}$/,
    example: '12345678901234',
    description: '14 digits',
  },
  CRN: {
    pattern: /^[A-Z0-9]{8}$/,
    example: 'AB123456',
    description: '8 alphanumeric characters',
  },
  RSIN: {
    pattern: /^\d{9}$/,
    example: '001671248',
    description: '9 digits (Dutch legal entity ID with 11-proof check)',
  },
  VIES: {
    pattern: /^[A-Z]{2}[A-Z0-9]{2,13}$/,
    example: 'NL001671248B03',
    description: 'VIES-validated VAT number (country code + VAT)',
  },
  PEPPOL: {
    pattern: /^[a-z0-9-]+::[0-9]{4}:[A-Za-z0-9]+$/,
    example: 'iso6523-actorid-upis::0106:12345678',
    description: 'Peppol Participant ID (scheme::identifier)',
  },
};

// Mapping of country codes to applicable identifier types
// VIES is available for all EU member states
export const COUNTRY_IDENTIFIER_MAP: Record<string, string[]> = {
  NL: ['KVK', 'RSIN', 'EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  DE: ['HRB', 'HRA', 'EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  BE: ['KBO', 'EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  FR: ['SIREN', 'SIRET', 'EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  GB: ['CRN', 'EORI', 'VAT', 'LEI', 'DUNS', 'PEPPOL'], // UK no longer in EU, no VIES
  UK: ['CRN', 'EORI', 'VAT', 'LEI', 'DUNS', 'PEPPOL'], // UK no longer in EU, no VIES
  US: ['DUNS', 'LEI'],
  LU: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  AT: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  IT: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  ES: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  PT: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  DK: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  SE: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  NO: ['EORI', 'VAT', 'LEI', 'DUNS', 'PEPPOL'], // Norway not in EU
  CH: ['EORI', 'VAT', 'LEI', 'DUNS'], // Switzerland not in EU
  PL: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  CZ: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS'],
  IE: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  FI: ['EORI', 'VAT', 'VIES', 'EUID', 'LEI', 'DUNS', 'PEPPOL'],
  default: ['LEI', 'DUNS', 'EORI', 'VAT', 'OTHER'],
};

// Mapping of identifier types to registry information
export const REGISTRY_INFO: Record<string, { name: string; url: string }> = {
  LEI: {
    name: 'Global Legal Entity Identifier Foundation (GLEIF)',
    url: 'https://search.gleif.org/',
  },
  KVK: {
    name: 'Dutch Chamber of Commerce (Kamer van Koophandel)',
    url: 'https://www.kvk.nl/',
  },
  EORI: {
    name: 'European Commission - EORI System',
    url: 'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp',
  },
  VAT: {
    name: 'European Commission - VIES VAT Number Validation',
    url: 'https://ec.europa.eu/taxation_customs/vies/',
  },
  DUNS: {
    name: 'Dun & Bradstreet',
    url: 'https://www.dnb.com/',
  },
  EUID: {
    name: 'European Unique Identifier',
    url: 'https://e-justice.europa.eu/489/EN/business_registers',
  },
  HRB: {
    name: 'German Commercial Register (Handelsregister Teil B)',
    url: 'https://www.handelsregister.de/',
  },
  HRA: {
    name: 'German Commercial Register (Handelsregister Teil A)',
    url: 'https://www.handelsregister.de/',
  },
  KBO: {
    name: 'Belgian Crossroads Bank for Enterprises (KBO/BCE)',
    url: 'https://kbopub.economie.fgov.be/',
  },
  SIREN: {
    name: 'French Business Registry - SIREN',
    url: 'https://www.sirene.fr/',
  },
  SIRET: {
    name: 'French Business Registry - SIRET',
    url: 'https://www.sirene.fr/',
  },
  CRN: {
    name: 'UK Companies House - Company Registration Number',
    url: 'https://find-and-update.company-information.service.gov.uk/',
  },
  RSIN: {
    name: 'Dutch Chamber of Commerce - RSIN',
    url: 'https://www.kvk.nl/',
  },
  VIES: {
    name: 'EU VAT Information Exchange System (VIES)',
    url: 'https://ec.europa.eu/taxation_customs/vies/',
  },
  PEPPOL: {
    name: 'Peppol Directory',
    url: 'https://directory.peppol.eu/',
  },
};

// Create authenticated axios instance
async function getAuthenticatedAxios() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';
  const token = await getAccessToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/**
 * Hook for validating identifier values
 */
export function useIdentifierValidation() {
  const [validationError, setValidationError] = useState<string>('');
  const [isValidIdentifier, setIsValidIdentifier] = useState<boolean>(true);

  const validateIdentifierValue = useCallback(
    (type: string | undefined, value: string): boolean => {
      if (!type || !value) {
        setValidationError('');
        setIsValidIdentifier(true);
        return true;
      }

      const validation = IDENTIFIER_VALIDATION[type];
      if (!validation) {
        // No validation rule for this type (e.g., OTHER)
        setValidationError('');
        setIsValidIdentifier(true);
        return true;
      }

      const trimmedValue = value.trim().toUpperCase();
      const isValid = validation.pattern.test(trimmedValue);

      if (!isValid) {
        setValidationError(
          `Invalid format. Expected: ${validation.description}. Example: ${validation.example}`
        );
        setIsValidIdentifier(false);
      } else {
        setValidationError('');
        setIsValidIdentifier(true);
      }

      return isValid;
    },
    []
  );

  const resetValidation = useCallback(() => {
    setValidationError('');
    setIsValidIdentifier(true);
  }, []);

  return {
    validationError,
    isValidIdentifier,
    validateIdentifierValue,
    resetValidation,
  };
}

/**
 * Hook for managing identifier CRUD operations
 */
export function useIdentifierManagement(
  legalEntityId: string,
  onIdentifierCreate: (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ) => Promise<LegalEntityIdentifier>,
  onIdentifierUpdate: (
    identifierId: string,
    identifier: Partial<LegalEntityIdentifier>
  ) => Promise<LegalEntityIdentifier>,
  onIdentifierDelete: (identifierId: string) => Promise<void>
) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<LegalEntityIdentifier | null>(null);
  const [formData, setFormData] = useState<Partial<LegalEntityIdentifier>>({
    validation_status: 'PENDING',
  });
  const [availableIdentifierTypes, setAvailableIdentifierTypes] = useState<string[]>(
    COUNTRY_IDENTIFIER_MAP.default
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [identifierToDelete, setIdentifierToDelete] = useState<LegalEntityIdentifier | null>(null);

  const notification = useNotification();
  const { handleError } = useApiError();
  const { validateIdentifierValue, validationError, isValidIdentifier, resetValidation } =
    useIdentifierValidation();

  const handleAdd = useCallback(() => {
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    resetValidation();
    setIsDialogOpen(true);
  }, [resetValidation]);

  const handleEdit = useCallback(
    (identifier: LegalEntityIdentifier) => {
      setEditingIdentifier(identifier);
      setFormData(identifier);
      // Set available identifier types based on country code
      if (identifier.country_code) {
        const types =
          COUNTRY_IDENTIFIER_MAP[identifier.country_code.toUpperCase()] ||
          COUNTRY_IDENTIFIER_MAP.default;
        setAvailableIdentifierTypes(types);
      } else {
        setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
      }
      // Validate existing identifier
      validateIdentifierValue(identifier.identifier_type, identifier.identifier_value || '');
      setIsDialogOpen(true);
    },
    [validateIdentifierValue]
  );

  const handleCountryCodeChange = useCallback(
    (countryCode: string) => {
      const upperCode = countryCode.toUpperCase();
      const types = COUNTRY_IDENTIFIER_MAP[upperCode] || COUNTRY_IDENTIFIER_MAP.default;
      setAvailableIdentifierTypes(types);

      // Clear identifier type if it's not available for the new country
      if (formData.identifier_type && !types.includes(formData.identifier_type)) {
        setFormData({
          ...formData,
          country_code: countryCode,
          identifier_type: undefined,
          registry_name: undefined,
          registry_url: undefined,
        });
      } else {
        setFormData({
          ...formData,
          country_code: countryCode,
        });
      }
    },
    [formData]
  );

  const handleIdentifierTypeChange = useCallback(
    (type: string) => {
      const registryInfo = REGISTRY_INFO[type];
      setFormData({
        ...formData,
        identifier_type: type as LegalEntityIdentifier['identifier_type'],
        registry_name: registryInfo?.name || formData.registry_name,
        registry_url: registryInfo?.url || formData.registry_url,
      });
      // Re-validate with new type
      if (formData.identifier_value) {
        validateIdentifierValue(type, formData.identifier_value);
      }
    },
    [formData, validateIdentifierValue]
  );

  const handleIdentifierValueChange = useCallback(
    (value: string) => {
      setFormData({
        ...formData,
        identifier_value: value,
      });
      // Validate as user types
      if (formData.identifier_type) {
        validateIdentifierValue(formData.identifier_type, value);
      }
    },
    [formData, validateIdentifierValue]
  );

  const handleDeleteClick = useCallback((identifier: LegalEntityIdentifier) => {
    setIdentifierToDelete(identifier);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!identifierToDelete?.legal_entity_reference_id) return;
    await onIdentifierDelete(identifierToDelete.legal_entity_reference_id);
    const msg = identifierSuccessMessages.deleted(String(identifierToDelete.identifier_type));
    notification.showSuccess(msg.title);
  }, [identifierToDelete, onIdentifierDelete, notification]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form save logic requires validation checks and conditional API calls
  const handleSave = useCallback(async () => {
    if (!formData.identifier_type || !formData.identifier_value) {
      notification.showError('Please fill in all required fields');
      return;
    }

    // Check validation before saving
    if (!isValidIdentifier) {
      notification.showError('Please fix validation errors before saving');
      return;
    }

    try {
      // SEC-006: Sanitize form data before API submission to prevent XSS attacks
      const sanitizedFormData = sanitizeFormData(
        formData as Record<string, unknown>
      ) as Partial<LegalEntityIdentifier>;

      if (editingIdentifier) {
        // Update existing identifier
        const refId = editingIdentifier.legal_entity_reference_id;
        if (!refId) {
          notification.showError('Invalid identifier reference');
          return;
        }
        await onIdentifierUpdate(refId, sanitizedFormData);
        const msg = identifierSuccessMessages.updated(
          String(sanitizedFormData.identifier_type || 'Identifier')
        );
        notification.showSuccess(msg.title);
      } else {
        // Add new identifier
        if (!sanitizedFormData.identifier_value) {
          notification.showError('Identifier value is required');
          return;
        }
        await onIdentifierCreate({
          legal_entity_id: legalEntityId,
          identifier_type:
            sanitizedFormData.identifier_type as LegalEntityIdentifier['identifier_type'],
          identifier_value: sanitizedFormData.identifier_value,
          country_code: sanitizedFormData.country_code,
          registry_name: sanitizedFormData.registry_name,
          registry_url: sanitizedFormData.registry_url,
          validation_status:
            sanitizedFormData.validation_status as LegalEntityIdentifier['validation_status'],
          validation_date: sanitizedFormData.validation_date,
          verification_notes: sanitizedFormData.verification_notes,
        });
        const msg = identifierSuccessMessages.created(
          String(sanitizedFormData.identifier_type || 'Identifier'),
          String(sanitizedFormData.identifier_value || '')
        );
        notification.showSuccess(msg.title);
      }
      setIsDialogOpen(false);
    } catch (error: unknown) {
      handleError(error, 'saving identifier');
    }
  }, [
    formData,
    isValidIdentifier,
    editingIdentifier,
    legalEntityId,
    onIdentifierUpdate,
    onIdentifierCreate,
    notification,
    handleError,
  ]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    resetValidation();
  }, [resetValidation]);

  return {
    isDialogOpen,
    editingIdentifier,
    formData,
    setFormData,
    availableIdentifierTypes,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    identifierToDelete,
    validationError,
    isValidIdentifier,
    handleAdd,
    handleEdit,
    handleCountryCodeChange,
    handleIdentifierTypeChange,
    handleIdentifierValueChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleSave,
    handleCancel,
  };
}

/**
 * Hook for identifier verification and enrichment from external registries
 */
export function useIdentifierVerification(
  legalEntityId: string,
  identifiers: LegalEntityIdentifier[],
  onRefresh: () => Promise<void>
) {
  const [kvkVerificationFlags, setKvkVerificationFlags] = useState<string[]>([]);
  const [hasKvkDocument, setHasKvkDocument] = useState(false);
  const [fetchingLei, setFetchingLei] = useState(false);
  const [fetchingPeppol, setFetchingPeppol] = useState(false);
  const [fetchingVies, setFetchingVies] = useState(false);

  const notification = useNotification();
  const { handleError } = useApiError();

  const fetchKvkVerification = useCallback(async () => {
    try {
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.get<{
        kvk_document_url: string | null;
        kvk_mismatch_flags: string[] | null;
      }>(`/legal-entities/${legalEntityId}/kvk-verification`);
      if (response.data) {
        setKvkVerificationFlags(response.data.kvk_mismatch_flags || []);
        setHasKvkDocument(!!response.data.kvk_document_url);
      }
    } catch (_error) {
      // Silently fail if no document uploaded yet
      logger.debug('No KvK verification status available yet');
    }
  }, [legalEntityId]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: LEI fetch requires precondition validation and multiple API response scenarios
  const handleFetchLei = useCallback(async () => {
    const suitableIdentifier = identifiers.find((id) =>
      ['KVK', 'HRB', 'HRA', 'KBO', 'SIREN', 'CRN'].includes(id.identifier_type)
    );

    if (!suitableIdentifier || !suitableIdentifier.country_code) {
      notification.showError(
        'No suitable identifier found for LEI lookup. Add a KVK, HRB, or similar identifier first.'
      );
      return;
    }

    const leiExists = identifiers.some((id) => id.identifier_type === 'LEI');
    if (leiExists) {
      notification.showInfo('LEI already exists for this entity');
      return;
    }

    setFetchingLei(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.post<{
        lei: string | null;
        legal_name: string | null;
        status: 'found' | 'not_found' | 'already_exists' | 'error';
        was_saved: boolean;
        message?: string;
      }>(`${API_BASE_URL}/entities/${legalEntityId}/identifiers/fetch-lei`, {
        identifier_type: suitableIdentifier.identifier_type,
        identifier_value: suitableIdentifier.identifier_value,
        country_code: suitableIdentifier.country_code,
        save_to_database: true,
      });

      const result = response.data;
      if (result.status === 'found' && result.was_saved) {
        notification.showSuccess(`LEI ${result.lei} found and saved successfully!`);
        await onRefresh();
      } else if (result.status === 'found' && !result.was_saved) {
        notification.showWarning(`LEI ${result.lei} found but not saved to database`);
      } else if (result.status === 'not_found') {
        notification.showWarning(
          `No LEI found for ${suitableIdentifier.identifier_type} ${suitableIdentifier.identifier_value}`
        );
      } else if (result.status === 'already_exists') {
        notification.showInfo(`LEI already exists: ${result.lei}`);
      }
    } catch (error: unknown) {
      handleError(error, 'fetching LEI from GLEIF API');
    } finally {
      setFetchingLei(false);
    }
  }, [legalEntityId, identifiers, notification, handleError, onRefresh]);

  // Fetch Peppol participant from Peppol Directory
  const handleFetchPeppol = useCallback(async () => {
    // Find a suitable identifier for Peppol lookup (KVK, VAT, KBO, etc.)
    const suitableIdentifier = identifiers.find((id) =>
      ['KVK', 'VAT', 'KBO', 'SIREN', 'CRN'].includes(id.identifier_type)
    );

    if (!suitableIdentifier || !suitableIdentifier.country_code) {
      notification.showError(
        'No suitable identifier found for Peppol lookup. Add a KVK, VAT, or similar identifier first.'
      );
      return;
    }

    const peppolExists = identifiers.some((id) => id.identifier_type === 'PEPPOL');
    if (peppolExists) {
      notification.showInfo('Peppol participant ID already exists for this entity');
      return;
    }

    setFetchingPeppol(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.post<{
        participant_id: string | null;
        entity_name: string | null;
        status: 'found' | 'not_found' | 'error';
        was_saved: boolean;
        message?: string;
      }>(`${API_BASE_URL}/legal-entities/${legalEntityId}/peppol/fetch`, {
        identifier_type: suitableIdentifier.identifier_type,
        identifier_value: suitableIdentifier.identifier_value,
        country_code: suitableIdentifier.country_code,
        save_to_database: true,
      });

      const result = response.data;
      if (result.status === 'found' && result.was_saved) {
        notification.showSuccess(`Peppol participant ${result.participant_id} found and saved!`);
        await onRefresh();
      } else if (result.status === 'found' && !result.was_saved) {
        notification.showWarning(`Peppol participant ${result.participant_id} found but not saved`);
      } else if (result.status === 'not_found') {
        notification.showWarning(
          `No Peppol participant found for ${suitableIdentifier.identifier_type} ${suitableIdentifier.identifier_value}`
        );
      }
    } catch (error: unknown) {
      handleError(error, 'fetching Peppol participant from Peppol Directory');
    } finally {
      setFetchingPeppol(false);
    }
  }, [legalEntityId, identifiers, notification, handleError, onRefresh]);

  // Fetch VIES data for VAT validation
  const handleFetchVies = useCallback(async (): Promise<boolean> => {
    // Find a VAT identifier for VIES validation
    const vatIdentifier = identifiers.find((id) =>
      ['VAT'].includes(id.identifier_type)
    );

    if (!vatIdentifier || !vatIdentifier.country_code) {
      // No VAT identifier available - skip silently (not an error)
      return false;
    }

    const viesExists = identifiers.some((id) => id.identifier_type === 'VIES');
    if (viesExists) {
      return false; // Already exists, skip
    }

    setFetchingVies(true);
    try {
      const axiosInstance = await getAuthenticatedAxios();

      // Extract VAT number without country prefix if present
      let vatNumber = vatIdentifier.identifier_value;
      if (vatNumber.startsWith(vatIdentifier.country_code)) {
        vatNumber = vatNumber.substring(vatIdentifier.country_code.length);
      }

      const response = await axiosInstance.post<{
        status: 'valid' | 'invalid' | 'error';
        is_valid: boolean;
        trader_name?: string;
        trader_address?: string;
        was_saved: boolean;
        message: string;
      }>(`/legal-entities/${legalEntityId}/vies/fetch`, {
        country_code: vatIdentifier.country_code,
        vat_number: vatNumber,
        save_to_database: true,
      });

      const result = response.data;
      if (result.status === 'valid' && result.was_saved) {
        notification.showSuccess(`VIES validation successful - VAT number is valid`);
        return true;
      } else if (result.status === 'invalid') {
        notification.showWarning(`VIES: VAT number ${vatIdentifier.identifier_value} is not valid`);
      }
      return false;
    } catch (error: unknown) {
      // Don't show error for VIES - it's optional
      logger.debug('VIES validation failed:', error);
      return false;
    } finally {
      setFetchingVies(false);
    }
  }, [legalEntityId, identifiers, notification]);

  // Unified enrichment function that calls the comprehensive /enrich endpoint
  // This fetches: RSIN (from KVK), VAT (derived from RSIN + VIES validation), LEI (GLEIF), Peppol
  const handleEnrich = useCallback(async () => {
    setFetchingLei(true); // Use LEI loading state as general enrichment indicator
    setFetchingPeppol(true);
    setFetchingVies(true);

    try {
      const axiosInstance = await getAuthenticatedAxios();
      const response = await axiosInstance.post<{
        success: boolean;
        added_count: number;
        results: Array<{
          identifier: string;
          status: 'added' | 'exists' | 'error' | 'not_available';
          value?: string;
          message?: string;
        }>;
        summary: {
          added: string[];
          already_exists: string[];
          not_available: string[];
          errors: string[];
        };
      }>(`/legal-entities/${legalEntityId}/enrich`);

      const { summary, added_count } = response.data;

      if (added_count > 0) {
        notification.showSuccess(`Enrichment complete: Added ${summary.added.join(', ')}`);
        await onRefresh();
      } else if (summary.already_exists.length > 0) {
        const existingMsg = summary.already_exists.length > 0
          ? `Already have: ${summary.already_exists.join(', ')}`
          : '';
        const notAvailMsg = summary.not_available.length > 0
          ? `Not available: ${summary.not_available.map(s => s.split(' (')[0]).join(', ')}`
          : '';
        notification.showInfo(`${existingMsg}${existingMsg && notAvailMsg ? '. ' : ''}${notAvailMsg}`);
      } else {
        notification.showInfo('No identifiers could be enriched. Make sure a KVK number exists.');
      }
    } catch (error: unknown) {
      logger.error('Enrichment failed:', error);
      notification.showError('Enrichment failed. Please try again.');
    } finally {
      setFetchingLei(false);
      setFetchingPeppol(false);
      setFetchingVies(false);
    }
  }, [legalEntityId, notification, onRefresh]);

  return {
    kvkVerificationFlags,
    hasKvkDocument,
    fetchingLei: fetchingLei || fetchingPeppol || fetchingVies, // Combined loading state
    fetchingPeppol,
    fetchingVies,
    fetchKvkVerification,
    handleFetchLei,
    handleFetchPeppol,
    handleFetchVies,
    handleEnrich, // Unified enrichment function
  };
}
