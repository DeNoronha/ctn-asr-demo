import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import type React from 'react';
import { helpContent } from '../../config/helpContent';
import { COUNTRY_IDENTIFIER_MAP, IDENTIFIER_VALIDATION } from '../../hooks/useIdentifiers';
import type { LegalEntityIdentifier } from "../../services/api";
import { getDescribedById, getValidationProps } from '../../utils/aria';
import { TEXT_COLORS, getStatusColor } from '../../utils/colors';
import { ConfirmDialog } from '../ConfirmDialog';
import { ConditionalField } from '../forms/ConditionalField';
import { HelpTooltip } from '../help/HelpTooltip';
import { AlertTriangle } from '../icons';

const VALIDATION_STATUSES = ['PENDING', 'VALIDATED', 'FAILED', 'EXPIRED'];

// Western European countries for the country code dropdown
const WESTERN_EUROPEAN_COUNTRIES = [
  { value: 'NL', label: 'NL - Netherlands' },
  { value: 'DE', label: 'DE - Germany' },
  { value: 'BE', label: 'BE - Belgium' },
  { value: 'FR', label: 'FR - France' },
  { value: 'GB', label: 'GB - United Kingdom' },
  { value: 'LU', label: 'LU - Luxembourg' },
  { value: 'AT', label: 'AT - Austria' },
  { value: 'CH', label: 'CH - Switzerland' },
  { value: 'IE', label: 'IE - Ireland' },
  { value: 'DK', label: 'DK - Denmark' },
  { value: 'SE', label: 'SE - Sweden' },
  { value: 'NO', label: 'NO - Norway' },
  { value: 'FI', label: 'FI - Finland' },
  { value: 'ES', label: 'ES - Spain' },
  { value: 'PT', label: 'PT - Portugal' },
  { value: 'IT', label: 'IT - Italy' },
];

interface IdentifierDialogProps {
  isOpen: boolean;
  editingIdentifier: LegalEntityIdentifier | null;
  formData: Partial<LegalEntityIdentifier>;
  setFormData: (data: Partial<LegalEntityIdentifier>) => void;
  availableIdentifierTypes: string[];
  validationError: string;
  isValidIdentifier: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onCountryCodeChange: (code: string) => void;
  onIdentifierTypeChange: (type: string) => void;
  onIdentifierValueChange: (value: string) => void;
}

const CountryCodeHint: React.FC<{
  hasCountryCode: boolean;
  availableTypesCount: number;
  countryCode?: string;
  availableTypes: string[];
}> = ({ hasCountryCode, availableTypesCount, countryCode, availableTypes }) => {
  if (!hasCountryCode) {
    return (
      <span
        className="field-hint field-hint-warning"
        style={{ color: TEXT_COLORS.error, fontWeight: 500 }}
      >
        ⚠️ Please enter country code first to see applicable types
      </span>
    );
  }

  if (availableTypesCount === 0) {
    return (
      <span
        className="field-hint field-hint-warning"
        style={{ color: TEXT_COLORS.error, fontWeight: 500 }}
      >
        ⚠️ No identifier types available for country code "{countryCode}"
      </span>
    );
  }

  return (
    <span className="field-hint" style={{ color: getStatusColor('ACTIVE'), fontWeight: 500 }}>
      ✓ Available types for {countryCode?.toUpperCase()}: {availableTypes.join(', ')}
    </span>
  );
};

const ValidationFeedback: React.FC<{
  formData: Partial<LegalEntityIdentifier>;
  validationError: string;
  isValidIdentifier: boolean;
}> = ({ formData, validationError, isValidIdentifier }) => {
  const validation = formData.identifier_type
    ? IDENTIFIER_VALIDATION[formData.identifier_type]
    : null;

  return (
    <>
      {validation && (
        <span
          id={getDescribedById('identifier_value', 'hint')}
          className="field-hint validation-hint"
        >
          Format: {validation.description} (e.g., {validation.example})
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
    </>
  );
};

const RegistryFields: React.FC<{
  formData: Partial<LegalEntityIdentifier>;
  setFormData: (data: Partial<LegalEntityIdentifier>) => void;
}> = ({ formData, setFormData }) => (
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
);

const ValidationFields: React.FC<{
  formData: Partial<LegalEntityIdentifier>;
  setFormData: (data: Partial<LegalEntityIdentifier>) => void;
}> = ({ formData, setFormData }) => (
  <ConditionalField show={!!formData.identifier_value && !!formData.identifier_type}>
    <div className="form-field">
      <Select
        label="Validation Status"
        data={VALIDATION_STATUSES}
        value={formData.validation_status}
        onChange={(value) =>
          setFormData({
            ...formData,
            validation_status: value as LegalEntityIdentifier['validation_status'],
          })
        }
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
);

export const IdentifierDialog: React.FC<IdentifierDialogProps> = ({
  isOpen,
  editingIdentifier,
  formData,
  setFormData,
  availableIdentifierTypes,
  validationError,
  isValidIdentifier,
  onSave,
  onCancel,
  onCountryCodeChange,
  onIdentifierTypeChange,
  onIdentifierValueChange,
}) => {
  const isEditing = !!editingIdentifier;

  // Simplified edit mode - only show value and validation fields
  if (isEditing) {
    return (
      <Modal
        opened={isOpen}
        onClose={onCancel}
        title="Edit Identifier"
        size="md"
      >
        <Stack gap="md">
          {/* Show type and country as read-only info */}
          <div style={{ padding: '12px', backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--mantine-color-dimmed)' }}>Type</div>
            <div style={{ fontWeight: 500 }}>{formData.identifier_type} ({formData.country_code})</div>
          </div>

          <TextInput
            label="Identifier Value"
            value={formData.identifier_value || ''}
            onChange={(e) => onIdentifierValueChange(e.target.value)}
            placeholder="Enter identifier value"
            error={validationError}
          />

          <Select
            label="Validation Status"
            data={VALIDATION_STATUSES}
            value={formData.validation_status}
            onChange={(value) =>
              setFormData({
                ...formData,
                validation_status: value as LegalEntityIdentifier['validation_status'],
              })
            }
          />

          <TextInput
            label="Verification Notes"
            value={formData.verification_notes || ''}
            onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
            placeholder="Optional notes"
          />

          <Group mt="md" justify="flex-end">
            <Button onClick={onCancel} variant="default">
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={onSave}
              disabled={!isValidIdentifier || !formData.identifier_value}
            >
              Update
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  // Full create mode - show all fields
  return (
    <Modal
      opened={isOpen}
      onClose={onCancel}
      title="Add Identifier"
      size="lg"
    >
      <div className="identifier-form">
        <div className="form-field">
          <Select
            label={
              <>
                Country Code *
                <HelpTooltip
                  content={helpContent.identifierCountry}
                  dataTestId="country-code-help"
                />
              </>
            }
            data={WESTERN_EUROPEAN_COUNTRIES}
            value={formData.country_code || null}
            onChange={(value) => onCountryCodeChange(value || '')}
            placeholder="Select country..."
            searchable
            clearable
          />
          <span className="field-hint">
            Select country to see applicable identifier types
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
            onChange={(value) => onIdentifierTypeChange(value || '')}
            disabled={!formData.country_code || availableIdentifierTypes.length === 0}
            placeholder={formData.country_code ? 'Select type...' : 'Enter country code first'}
          />
          <CountryCodeHint
            hasCountryCode={!!formData.country_code}
            availableTypesCount={availableIdentifierTypes.length}
            countryCode={formData.country_code}
            availableTypes={availableIdentifierTypes}
          />
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
            onChange={(e) => onIdentifierValueChange(e.target.value)}
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
          <ValidationFeedback
            formData={formData}
            validationError={validationError}
            isValidIdentifier={isValidIdentifier}
          />
        </div>

        <RegistryFields formData={formData} setFormData={setFormData} />
        <ValidationFields formData={formData} setFormData={setFormData} />
      </div>

      <Group mt="xl" justify="flex-end">
        <Button onClick={onCancel} variant="default">
          Cancel
        </Button>
        <Button
          color="blue"
          onClick={onSave}
          disabled={!isValidIdentifier || !formData.identifier_type || !formData.identifier_value}
        >
          Add
        </Button>
      </Group>
    </Modal>
  );
};

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  identifier: LegalEntityIdentifier | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  identifier,
  onConfirm,
  onCancel,
}) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Delete Identifier"
      message={`Are you sure you want to delete the ${identifier?.identifier_type} identifier "${identifier?.identifier_value}"? This action cannot be undone.`}
      confirmLabel="Delete"
      confirmTheme="error"
      icon={<AlertTriangle size={24} />}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
