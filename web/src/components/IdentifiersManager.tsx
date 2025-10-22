import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Input } from '@progress/kendo-react-inputs';
import axios from 'axios';
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
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntityIdentifier, apiV2 } from '../services/apiV2';
import { formatDate } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { HelpTooltip } from './help/HelpTooltip';
import { helpContent } from '../config/helpContent';
import { ConditionalField } from './forms/ConditionalField';
import './IdentifiersManager.css';
import '../styles/progressive-forms.css';

interface IdentifiersManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onUpdate: (identifiers: LegalEntityIdentifier[]) => void;
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

export const IdentifiersManager: React.FC<IdentifiersManagerProps> = ({
  legalEntityId,
  identifiers,
  onUpdate,
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
  const notification = useNotification();

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
      console.error('Failed to acquire token:', error);
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
        console.debug('No KvK verification status available yet');
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

  const handleAdd = () => {
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    setValidationError('');
    setIsValidIdentifier(true);
    setIsDialogOpen(true);
  };

  const handleEdit = (identifier: LegalEntityIdentifier) => {
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
  };

  // Handle country code change - filter identifier types
  const handleCountryCodeChange = (countryCode: string) => {
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
  };

  // Handle identifier type change - auto-populate registry info
  const handleIdentifierTypeChange = (type: string) => {
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
  };

  // Handle identifier value change with validation
  const handleIdentifierValueChange = (value: string) => {
    setFormData({
      ...formData,
      identifier_value: value,
    });
    // Validate as user types
    if (formData.identifier_type) {
      validateIdentifierValue(formData.identifier_type, value);
    }
  };

  const handleDeleteClick = (identifier: LegalEntityIdentifier) => {
    setIdentifierToDelete(identifier);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!identifierToDelete) return;

    try {
      if (identifierToDelete.legal_entity_reference_id) {
        await apiV2.deleteIdentifier(identifierToDelete.legal_entity_reference_id);
      }
      const updated = identifiers.filter(
        (i) => i.legal_entity_reference_id !== identifierToDelete.legal_entity_reference_id
      );
      onUpdate(updated);
      notification.showSuccess('Identifier deleted successfully');
    } catch (error) {
      console.error('Failed to delete identifier:', error);
      notification.showError('Failed to delete identifier');
    }
  };

  const handleSave = async () => {
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
      const now = new Date().toISOString();

      if (editingIdentifier) {
        // Update existing identifier
        const updated = await apiV2.updateIdentifier(editingIdentifier.legal_entity_reference_id!, {
          ...formData,
          dt_modified: now,
        });
        const updatedList = identifiers.map((i) =>
          i.legal_entity_reference_id === editingIdentifier.legal_entity_reference_id ? updated : i
        );
        onUpdate(updatedList);
        notification.showSuccess('Identifier updated successfully');
      } else {
        // Add new identifier
        const newIdentifier = await apiV2.addIdentifier({
          legal_entity_id: legalEntityId,
          identifier_type: formData.identifier_type as LegalEntityIdentifier['identifier_type'],
          identifier_value: formData.identifier_value!,
          country_code: formData.country_code,
          registry_name: formData.registry_name,
          registry_url: formData.registry_url,
          validation_status:
            formData.validation_status as LegalEntityIdentifier['validation_status'],
          validation_date: formData.validation_date,
          verification_notes: formData.verification_notes,
        });
        onUpdate([...identifiers, newIdentifier]);
        notification.showSuccess('Identifier added successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save identifier:', error);
      notification.showError('Failed to save identifier');
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingIdentifier(null);
    setFormData({
      validation_status: 'PENDING',
    });
    setAvailableIdentifierTypes(COUNTRY_IDENTIFIER_MAP.default);
    setValidationError('');
    setIsValidIdentifier(true);
  };

  const getValidationBadge = (status?: string) => {
    if (!status) return null;

    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      VALIDATED: { color: '#059669', icon: <CheckCircle size={14} /> }, // WCAG AA compliant (4.52:1)
      PENDING: { color: '#b45309', icon: <AlertCircle size={14} /> }, // WCAG AA compliant (4.54:1)
      FAILED: { color: '#dc2626', icon: <XCircle size={14} /> }, // WCAG AA compliant (4.52:1)
      EXPIRED: { color: '#6b7280', icon: <XCircle size={14} /> }, // Already compliant (4.83:1)
    };

    const { color, icon } = config[status] || { color: '#6b7280', icon: null };
    return (
      <span
        className="validation-badge"
        style={{ backgroundColor: color }}
        role="status"
        aria-label={`Validation status: ${status}`}
      >
        <span aria-hidden="true">{icon}</span>
        {status}
      </span>
    );
  };

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

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    // Handle Enter and Space keys for keyboard accessibility (WCAG 2.1 Level AA)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on Space
      action();
    }
  };

  const ActionsCell = (props: any) => {
    return (
      <td className="actions-cell">
        <Button
          fillMode="flat"
          size="small"
          title="Edit identifier"
          aria-label={`Edit ${props.dataItem.identifier_type} identifier`}
          onClick={() => handleEdit(props.dataItem)}
          onKeyDown={(e) => handleKeyDown(e, () => handleEdit(props.dataItem))}
          tabIndex={0}
        >
          <Pencil size={16} />
        </Button>
        <Button
          fillMode="flat"
          size="small"
          title="Delete identifier"
          aria-label={`Delete ${props.dataItem.identifier_type} identifier`}
          onClick={() => handleDeleteClick(props.dataItem)}
          onKeyDown={(e) => handleKeyDown(e, () => handleDeleteClick(props.dataItem))}
          tabIndex={0}
        >
          <Trash2 size={16} />
        </Button>
      </td>
    );
  };

  const ValidationCell = (props: any) => {
    return <td>{getValidationBadge(props.dataItem.validation_status)}</td>;
  };

  const DocumentVerificationCell = (props: any) => {
    return <td>{getDocumentVerificationBadge(props.dataItem.identifier_type)}</td>;
  };

  const DateCell = (props: any) => {
    const { field, dataItem } = props;
    const value = dataItem[field];
    return <td>{value ? formatDate(value) : '-'}</td>;
  };

  return (
    <div className="identifiers-manager">
      <div className="section-header">
        <h3>Legal Identifiers</h3>
        <Button themeColor="primary" onClick={handleAdd}>
          <Plus size={16} />
          Add Identifier
        </Button>
      </div>

      {identifiers.length > 0 ? (
        <Grid data={identifiers} style={{ height: '450px' }}>
          <GridColumn field="identifier_type" title="Type" width="100px" />
          <GridColumn
            field="identifier_value"
            title="Identifier Value"
            width="180px"
            minResizableWidth={120}
          />
          <GridColumn field="country_code" title="Country" width="100px" />
          <GridColumn
            field="registry_name"
            title="Registry"
            width="220px"
            minResizableWidth={150}
          />
          <GridColumn
            field="validation_status"
            title="Status"
            width="140px"
            cell={ValidationCell}
          />
          <GridColumn title="Doc Verification" width="160px" cell={DocumentVerificationCell} />
          <GridColumn field="validation_date" title="Last Verified" width="140px" cell={DateCell} />
          <GridColumn field="dt_modified" title="Last Edited" width="140px" cell={DateCell} />
          <GridColumn
            title="Actions"
            width="120px"
            cell={ActionsCell}
            headerClassName="center-header"
          />
        </Grid>
      ) : (
        <EmptyState
          icon={<FileCheck size={48} />}
          message="No identifiers registered yet"
          hint="Add legal identifiers like KVK, LEI, or EORI numbers to verify this member's identity"
        />
      )}

      {isDialogOpen && (
        <Dialog
          title={editingIdentifier ? 'Edit Identifier' : 'Add Identifier'}
          onClose={handleCancel}
          width={600}
        >
          <div className="identifier-form">
            <div className="form-field">
              <label>
                Country Code *
                <HelpTooltip content={helpContent.identifierCountry} dataTestId="country-code-help" />
              </label>
              <Input
                value={formData.country_code || ''}
                onChange={(e) => handleCountryCodeChange(e.value)}
                placeholder="e.g., NL, DE, BE, FR, GB"
                maxLength={2}
              />
              <span className="field-hint">
                Enter country code first to see applicable identifier types
              </span>
            </div>

            <div className="form-field">
              <label>
                Identifier Type *
                <HelpTooltip content={helpContent.identifierType} dataTestId="identifier-type-help" />
              </label>
              <DropDownList
                data={availableIdentifierTypes}
                value={formData.identifier_type}
                onChange={(e) => handleIdentifierTypeChange(e.value)}
                disabled={!formData.country_code || availableIdentifierTypes.length === 0}
                defaultItem={formData.country_code ? 'Select type...' : 'Enter country code first'}
              />
              {!formData.country_code ? (
                <span
                  className="field-hint field-hint-warning"
                  style={{ color: '#dc2626', fontWeight: 500 }}
                >
                  ⚠️ Please enter country code first to see applicable types
                </span>
              ) : availableIdentifierTypes.length === 0 ? (
                <span
                  className="field-hint field-hint-warning"
                  style={{ color: '#dc2626', fontWeight: 500 }}
                >
                  ⚠️ No identifier types available for country code "{formData.country_code}"
                </span>
              ) : (
                <span className="field-hint" style={{ color: '#059669', fontWeight: 500 }}>
                  ✓ Available types for {formData.country_code.toUpperCase()}:{' '}
                  {availableIdentifierTypes.join(', ')}
                </span>
              )}
            </div>

            <div className="form-field">
              <label>
                Identifier Value *
                <HelpTooltip content={helpContent.identifierValue} dataTestId="identifier-value-help" />
              </label>
              <Input
                value={formData.identifier_value || ''}
                onChange={(e) => handleIdentifierValueChange(e.value)}
                placeholder="Enter identifier value"
                className={
                  validationError
                    ? 'input-error'
                    : isValidIdentifier && formData.identifier_value
                      ? 'input-success'
                      : ''
                }
              />
              {formData.identifier_type && IDENTIFIER_VALIDATION[formData.identifier_type] && (
                <span className="field-hint validation-hint">
                  Format: {IDENTIFIER_VALIDATION[formData.identifier_type].description} (e.g.,{' '}
                  {IDENTIFIER_VALIDATION[formData.identifier_type].example})
                </span>
              )}
              {validationError && <span className="field-error">{validationError}</span>}
              {isValidIdentifier && formData.identifier_value && formData.identifier_type && (
                <span className="field-success">✓ Valid format</span>
              )}
            </div>

            <ConditionalField show={!!formData.identifier_type}>
              <div className="form-field">
                <label>Registry Name</label>
                <Input
                  value={formData.registry_name || ''}
                  onChange={(e) => setFormData({ ...formData, registry_name: e.value })}
                  placeholder="Auto-populated based on identifier type"
                />
                <span className="field-hint">Auto-populated when identifier type is selected</span>
              </div>

              <div className="form-field">
                <label>Registry URL</label>
                <Input
                  value={formData.registry_url || ''}
                  onChange={(e) => setFormData({ ...formData, registry_url: e.value })}
                  placeholder="Auto-populated based on identifier type"
                />
                <span className="field-hint">Auto-populated when identifier type is selected</span>
              </div>
            </ConditionalField>

            <ConditionalField show={!!formData.identifier_value && !!formData.identifier_type}>
              <div className="form-field">
                <label>Validation Status</label>
                <DropDownList
                  data={VALIDATION_STATUSES}
                  value={formData.validation_status}
                  onChange={(e) => setFormData({ ...formData, validation_status: e.value })}
                />
              </div>

              <div className="form-field">
                <label>Verification Notes</label>
                <Input
                  value={formData.verification_notes || ''}
                  onChange={(e) => setFormData({ ...formData, verification_notes: e.value })}
                  placeholder="Any notes about verification"
                />
              </div>
            </ConditionalField>
          </div>

          <DialogActionsBar>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              themeColor="primary"
              onClick={handleSave}
              disabled={
                !isValidIdentifier || !formData.identifier_type || !formData.identifier_value
              }
            >
              {editingIdentifier ? 'Update' : 'Add'}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

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
