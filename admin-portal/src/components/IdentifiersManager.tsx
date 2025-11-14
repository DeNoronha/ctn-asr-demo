import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import axios from 'axios';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { helpContent } from '../config/helpContent';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { type LegalEntityIdentifier, apiV2 } from '../services/apiV2';
import { formatDate } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { sanitizeFormData, sanitizeGridCell } from '../utils/sanitize';
import { identifierSuccessMessages } from '../utils/successMessages';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { ConditionalField } from './forms/ConditionalField';
import { HelpTooltip } from './help/HelpTooltip';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from './icons';
import './IdentifiersManager.css';
import { getEmptyState } from '../utils/emptyStates';
import '../styles/progressive-forms.css';
import { getDescribedById, getGridActionLabel, getValidationProps } from '../utils/aria';
import { TEXT_COLORS, getMembershipColor, getStatusColor } from '../utils/colors';
import { ErrorBoundary } from './ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';

interface IdentifiersManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onIdentifierCreate: (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierUpdate: (
    identifierId: string,
    identifier: Partial<LegalEntityIdentifier>
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierDelete: (identifierId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface KvkVerificationStatus {
  kvk_document_url: string | null;
  kvk_mismatch_flags: string[] | null;
}

const VALIDATION_STATUSES = ['PENDING', 'VALIDATED', 'FAILED', 'EXPIRED'];

// Validation rules and format examples for identifier types
const IDENTIFIER_VALIDATION: Record<
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
    example: 'NL123456789012',
    description: 'Country code + up to 15 alphanumeric',
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
};

// Mapping of country codes to applicable identifier types
const COUNTRY_IDENTIFIER_MAP: Record<string, string[]> = {
  NL: ['KVK', 'EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  DE: ['HRB', 'HRA', 'EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  BE: ['KBO', 'EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  FR: ['SIREN', 'SIRET', 'EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  GB: ['CRN', 'EORI', 'VAT', 'LEI', 'DUNS'],
  UK: ['CRN', 'EORI', 'VAT', 'LEI', 'DUNS'],
  US: ['DUNS', 'LEI'],
  LU: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  AT: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  IT: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  ES: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  PT: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  DK: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  SE: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  NO: ['EORI', 'VAT', 'LEI', 'DUNS'],
  CH: ['EORI', 'VAT', 'LEI', 'DUNS'],
  PL: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  CZ: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  IE: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  FI: ['EORI', 'VAT', 'EUID', 'LEI', 'DUNS'],
  default: ['LEI', 'DUNS', 'EORI', 'VAT', 'OTHER'],
};

// Mapping of identifier types to registry information
const REGISTRY_INFO: Record<string, { name: string; url: string }> = {
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
};

const IdentifiersManagerComponent: React.FC<IdentifiersManagerProps> = ({
  legalEntityId,
  identifiers,
  onIdentifierCreate,
  onIdentifierUpdate,
  onIdentifierDelete,
  onRefresh,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<LegalEntityIdentifier | null>(null);
  const [formData, setFormData] = useState<Partial<LegalEntityIdentifier>>({
    validation_status: 'PENDING',
  });
  const [availableIdentifierTypes, setAvailableIdentifierTypes] = useState<string[]>(
    COUNTRY_IDENTIFIER_MAP.default
  );
  const [validationError, setValidationError] = useState<string>('');
  const [isValidIdentifier, setIsValidIdentifier] = useState<boolean>(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [identifierToDelete, setIdentifierToDelete] = useState<LegalEntityIdentifier | null>(null);
  const [kvkVerificationFlags, setKvkVerificationFlags] = useState<string[]>([]);
  const [hasKvkDocument, setHasKvkDocument] = useState(false);
  const [fetchingLei, setFetchingLei] = useState(false);
  const notification = useNotification();
  const { handleError } = useApiError();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  // Helper function to get access token
  async function getAccessToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
        const response = await msalInstance.acquireTokenSilent({
          scopes: [`api://${clientId}/access_as_user`],
          account: accounts[0],
        });
        return response.accessToken;
      }
    } catch (error) {
      logger.error('Failed to acquire token:', error);
    }
    return null;
  }

  // Create authenticated axios instance
  async function getAuthenticatedAxios() {
    const token = await getAccessToken();
    return axios.create({
      baseURL: API_BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  // Fetch KvK verification status for document verification badges
  useEffect(() => {
    const fetchKvkVerification = async () => {
      try {
        const axiosInstance = await getAuthenticatedAxios();
        const response = await axiosInstance.get<KvkVerificationStatus>(
          `/legal-entities/${legalEntityId}/kvk-verification`
        );
        if (response.data) {
          setKvkVerificationFlags(response.data.kvk_mismatch_flags || []);
          setHasKvkDocument(!!response.data.kvk_document_url);
        }
      } catch (_error) {
        // Silently fail if no document uploaded yet
        logger.debug('No KvK verification status available yet');
      }
    };

    if (legalEntityId) {
      fetchKvkVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalEntityId, identifiers]); // Re-fetch when identifiers change

  // Validate identifier value based on type
  const validateIdentifierValue = (type: string | undefined, value: string): boolean => {
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
  };

  const handleAdd = useCallback(() => {
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    setValidationError('');
    setIsValidIdentifier(true);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((identifier: LegalEntityIdentifier) => {
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
  }, []);

  // Handle country code change - filter identifier types
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

  // Handle identifier type change - auto-populate registry info
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
    [formData]
  );

  // Handle identifier value change with validation
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
    [formData]
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form validation and save logic requires multiple conditional checks
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

  const handleFetchLei = useCallback(async () => {
    // Find a suitable identifier to use for LEI lookup (KVK, HRB, etc.)
    const suitableIdentifier = identifiers.find((id) =>
      ['KVK', 'HRB', 'HRA', 'KBO', 'SIREN', 'CRN'].includes(id.identifier_type)
    );

    if (!suitableIdentifier || !suitableIdentifier.country_code) {
      notification.showError(
        'No suitable identifier found for LEI lookup. Add a KVK, HRB, or similar identifier first.'
      );
      return;
    }

    // Check if LEI already exists
    const leiExists = identifiers.some((id) => id.identifier_type === 'LEI');
    if (leiExists) {
      notification.showInfo('LEI already exists for this entity');
      return;
    }

    setFetchingLei(true);
    try {
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
        // Refetch identifiers to show the new LEI
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
  }, [identifiers, legalEntityId, notification, onRefresh, handleError]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    setValidationError('');
    setIsValidIdentifier(true);
  }, []);

  const getValidationBadge = (status?: string) => {
    if (!status) return null;

    const config: Record<string, { color: string; icon: React.ReactNode; tooltip: string }> = {
      VALIDATED: {
        color: '#059669',
        icon: <CheckCircle size={14} />,
        tooltip: 'This identifier has been verified against the official registry',
      },
      PENDING: {
        color: '#b45309',
        icon: <AlertCircle size={14} />,
        tooltip: 'Validation pending - awaiting verification against registry',
      },
      FAILED: {
        color: '#dc2626',
        icon: <XCircle size={14} />,
        tooltip: 'Validation failed - identifier could not be verified in registry',
      },
      EXPIRED: {
        color: '#6b7280',
        icon: <XCircle size={14} />,
        tooltip: 'Validation expired - re-verification required',
      },
    };

    const { color, icon, tooltip } = config[status] || {
      color: '#6b7280',
      icon: null,
      tooltip: 'Unknown validation status',
    };
    return (
      <span
        className="validation-badge"
        style={{ backgroundColor: color }}
        // biome-ignore lint/a11y/useSemanticElements: Inline badge with styling - semantic equivalent not available
        role="status"
        aria-label={`Validation status: ${status}`}
        title={tooltip}
      >
        <span aria-hidden="true">{icon}</span>
        {status}
      </span>
    );
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Document verification badge requires complex conditional logic for multiple mismatch scenarios
  const getDocumentVerificationBadge = (identifierType: string) => {
    // Only show for KvK identifiers with uploaded document
    if (identifierType !== 'KVK' || !hasKvkDocument) {
      return <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>—</span>;
    }

    const hasNameMismatch = kvkVerificationFlags.includes('entered_name_mismatch');
    const hasNumberMismatch = kvkVerificationFlags.includes('entered_kvk_mismatch');

    let color: string;
    let icon: React.ReactNode;
    let label: string;

    if (!hasNameMismatch && !hasNumberMismatch) {
      // Green: Both match
      color = '#059669'; // WCAG AA compliant
      icon = <CheckCircle size={14} />;
      label = 'MATCH';
    } else if (hasNameMismatch && hasNumberMismatch) {
      // Red: Neither match
      color = '#dc2626'; // WCAG AA compliant
      icon = <XCircle size={14} />;
      label = 'NO MATCH';
    } else {
      // Orange: Partial match
      color = '#b45309'; // WCAG AA compliant
      icon = <AlertTriangle size={14} />;
      label = 'PARTIAL';
    }

    return (
      <span
        className="validation-badge"
        style={{ backgroundColor: color }}
        // biome-ignore lint/a11y/useSemanticElements: Inline badge with styling - semantic equivalent not available
        role="status"
        aria-label={`Document verification: ${label}`}
        title={
          hasNameMismatch && hasNumberMismatch
            ? 'Company name and KvK number do not match uploaded document'
            : hasNameMismatch
              ? 'Company name does not match uploaded document'
              : hasNumberMismatch
                ? 'KvK number does not match uploaded document'
                : 'Company name and KvK number match uploaded document'
        }
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
    );
  };

  const _handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    // Handle Enter and Space keys for keyboard accessibility (WCAG 2.1 Level AA)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on Space
      action();
    }
  }, []);

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<LegalEntityIdentifier>({
    key: 'identifiers-grid',
    columns: [
      {
        accessor: 'identifier_type',
        title: 'Type',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'identifier_value',
        title: 'Identifier Value',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        // SEC-007: Sanitize user-generated text fields in grid
        render: (record) => <div>{sanitizeGridCell(record.identifier_value || '')}</div>,
      },
      {
        accessor: 'country_code',
        title: 'Country',
        width: 100,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'registry_name',
        title: 'Registry',
        width: 220,
        toggleable: true,
        resizable: true,
        sortable: true,
        // SEC-007: Sanitize user-generated text fields in grid
        render: (record) => <div>{sanitizeGridCell(record.registry_name || '')}</div>,
      },
      {
        accessor: 'validation_status',
        title: 'Status',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{getValidationBadge(record.validation_status)}</div>,
      },
      {
        accessor: 'document_verification' as unknown as string,
        title: 'Doc Verification',
        width: 160,
        toggleable: true,
        resizable: true,
        render: (record) => <div>{getDocumentVerificationBadge(record.identifier_type)}</div>,
      },
      {
        accessor: 'validation_date',
        title: 'Last Verified',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>{record.validation_date ? formatDate(record.validation_date) : '-'}</div>
        ),
      },
      {
        accessor: 'dt_modified',
        title: 'Last Edited',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{record.dt_modified ? formatDate(record.dt_modified) : '-'}</div>,
      },
      {
        accessor: 'actions' as unknown as string,
        title: 'Actions',
        width: '0%',
        toggleable: false,
        render: (record) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={`Edit ${record.identifier_type} identifier`}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEdit(record);
                }}
                aria-label={`Edit ${record.identifier_type} identifier`}
              >
                <Pencil size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={`Delete ${record.identifier_type} identifier`}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDeleteClick(record);
                }}
                aria-label={`Delete ${record.identifier_type} identifier`}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  return (
    <div className="identifiers-manager">
      <div className="section-header">
        <h3>Legal Identifiers</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            color="cyan"
            onClick={handleFetchLei}
            disabled={fetchingLei || identifiers.length === 0}
            title="Fetch LEI from GLEIF API"
            aria-label={fetchingLei ? 'Fetching LEI from GLEIF API' : 'Fetch LEI from GLEIF API'}
          >
            {fetchingLei ? 'Fetching...' : 'Fetch LEI'}
          </Button>
          <Button color="blue" onClick={handleAdd} aria-label="Add new identifier">
            <Plus size={16} />
            Add Identifier
          </Button>
        </div>
      </div>

      {identifiers.length > 0 ? (
        <ErrorBoundary>
          <DataTable
            records={identifiers}
            columns={effectiveColumns}
            storeColumnsKey="identifiers-grid"
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
          />
        </ErrorBoundary>
      ) : (
        (() => {
          const es = getEmptyState('identifier', 'noIdentifiers');
          return (
            <EmptyState
              icon={<FileCheck size={48} />}
              message={es.message}
              hint={es.hint}
              action={es.action ? { label: es.action.label, onClick: handleAdd } : undefined}
            />
          );
        })()
      )}

      <Modal
        opened={isDialogOpen}
        onClose={handleCancel}
        title={editingIdentifier ? 'Edit Identifier' : 'Add Identifier'}
        size="lg"
      >
        <div className="identifier-form">
          <div className="form-field">
            <TextInput
              label={
                <>
                  Country Code *
                  <HelpTooltip
                    content={helpContent.identifierCountry}
                    dataTestId="country-code-help"
                  />
                </>
              }
              value={formData.country_code || ''}
              onChange={(e) => handleCountryCodeChange(e.target.value)}
              placeholder="e.g., NL, DE, BE, FR, GB"
              maxLength={2}
            />
            <span className="field-hint">
              Enter country code first to see applicable identifier types
            </span>
          </div>

          <div className="form-field">
            <Select
              label={
                <>
                  Identifier Type *
                  <HelpTooltip
                    content={helpContent.identifierType}
                    dataTestId="identifier-type-help"
                  />
                </>
              }
              data={availableIdentifierTypes}
              value={formData.identifier_type}
              onChange={(value) => handleIdentifierTypeChange(value || '')}
              disabled={!formData.country_code || availableIdentifierTypes.length === 0}
              placeholder={formData.country_code ? 'Select type...' : 'Enter country code first'}
            />
            {!formData.country_code ? (
              <span
                className="field-hint field-hint-warning"
                style={{ color: TEXT_COLORS.error, fontWeight: 500 }}
              >
                ⚠️ Please enter country code first to see applicable types
              </span>
            ) : availableIdentifierTypes.length === 0 ? (
              <span
                className="field-hint field-hint-warning"
                style={{ color: TEXT_COLORS.error, fontWeight: 500 }}
              >
                ⚠️ No identifier types available for country code "{formData.country_code}"
              </span>
            ) : (
              <span
                className="field-hint"
                style={{ color: getStatusColor('ACTIVE'), fontWeight: 500 }}
              >
                ✓ Available types for {formData.country_code.toUpperCase()}:{' '}
                {availableIdentifierTypes.join(', ')}
              </span>
            )}
          </div>

          <div className="form-field">
            <TextInput
              label={
                <>
                  Identifier Value *
                  <HelpTooltip
                    content={helpContent.identifierValue}
                    dataTestId="identifier-value-help"
                  />
                </>
              }
              id="identifier_value"
              value={formData.identifier_value || ''}
              onChange={(e) => handleIdentifierValueChange(e.target.value)}
              placeholder="Enter identifier value"
              className={
                validationError
                  ? 'input-error'
                  : isValidIdentifier && formData.identifier_value
                    ? 'input-success'
                    : ''
              }
              {...getValidationProps('identifier_value', validationError || undefined)}
            />
            {formData.identifier_type && IDENTIFIER_VALIDATION[formData.identifier_type] && (
              <span
                id={getDescribedById('identifier_value', 'hint')}
                className="field-hint validation-hint"
              >
                Format: {IDENTIFIER_VALIDATION[formData.identifier_type].description} (e.g.,{' '}
                {IDENTIFIER_VALIDATION[formData.identifier_type].example})
              </span>
            )}
            {validationError && (
              <span id={getDescribedById('identifier_value', 'error')} className="field-error">
                {validationError}
              </span>
            )}
            {isValidIdentifier && formData.identifier_value && formData.identifier_type && (
              <span className="field-success">✓ Valid format</span>
            )}
          </div>

          <ConditionalField show={!!formData.identifier_type}>
            <div className="form-field">
              <TextInput
                label="Registry Name"
                value={formData.registry_name || ''}
                onChange={(e) => setFormData({ ...formData, registry_name: e.target.value })}
                placeholder="Auto-populated based on identifier type"
              />
              <span className="field-hint">Auto-populated when identifier type is selected</span>
            </div>

            <div className="form-field">
              <TextInput
                label="Registry URL"
                value={formData.registry_url || ''}
                onChange={(e) => setFormData({ ...formData, registry_url: e.target.value })}
                placeholder="Auto-populated based on identifier type"
              />
              <span className="field-hint">Auto-populated when identifier type is selected</span>
            </div>
          </ConditionalField>

          <ConditionalField show={!!formData.identifier_value && !!formData.identifier_type}>
            <div className="form-field">
              <Select
                label="Validation Status"
                data={VALIDATION_STATUSES}
                value={formData.validation_status}
                onChange={(value) => setFormData({ ...formData, validation_status: value as any })}
              />
            </div>

            <div className="form-field">
              <TextInput
                label="Verification Notes"
                value={formData.verification_notes || ''}
                onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
                placeholder="Any notes about verification"
              />
            </div>
          </ConditionalField>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button onClick={handleCancel} variant="default">
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleSave}
            disabled={!isValidIdentifier || !formData.identifier_type || !formData.identifier_value}
          >
            {editingIdentifier ? 'Update' : 'Add'}
          </Button>
        </Group>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Identifier"
        message={`Are you sure you want to delete the ${identifierToDelete?.identifier_type} identifier "${identifierToDelete?.identifier_value}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmTheme="error"
        icon={<AlertTriangle size={24} />}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export const IdentifiersManager = React.memo(IdentifiersManagerComponent);
