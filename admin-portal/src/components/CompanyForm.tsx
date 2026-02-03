import { Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

// CompanyForm.tsx - Edit company/legal entity information
import type React from 'react';
import type { LegalEntity } from '../services/api';
import { sanitizeFormData } from '../utils/sanitize';
import './CompanyForm.css';
import { helpContent } from '../config/helpContent';
import { FieldLabel } from './help/FieldLabel';

interface CompanyFormProps {
  data: LegalEntity;
  onSave: (data: LegalEntity) => Promise<void>;
  onCancel: () => void;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ data, onSave, onCancel }) => {
  const form = useForm({
    initialValues: {
      primary_legal_name: data.primary_legal_name || '',
      entity_legal_form: data.entity_legal_form || '',
      address_line1: data.address_line1 || '',
      address_line2: data.address_line2 || '',
      postal_code: data.postal_code || '',
      city: data.city || '',
      province: data.province || '',
      country_code: data.country_code || '',
    },
    validate: {
      primary_legal_name: (value) =>
        value && value.trim().length > 0 ? null : 'This field is required',
      country_code: (value) =>
        !value || /^[A-Za-z]{2}$/.test(value) ? null : 'Enter 2-letter country code',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    // SEC-006: Sanitize form data before submission to prevent XSS attacks
    const formData = {
      ...data,
      ...values,
    };
    await onSave(sanitizeFormData(formData) as unknown as LegalEntity);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} className="company-form">
      <fieldset className="form-fieldset">
        <legend>Company Information</legend>

        <TextInput
          {...form.getInputProps('primary_legal_name')}
          label={
            <FieldLabel
              text="Legal Name"
              helpText={helpContent.legalName}
              required
              dataTestId="company-legal-name-help"
            />
          }
          required
          mb="md"
        />

        <TextInput
          {...form.getInputProps('entity_legal_form')}
          label="Legal Form"
          placeholder="e.g., BV, NV, LLC"
          mb="md"
        />
      </fieldset>

      <fieldset className="form-fieldset">
        <legend>Address</legend>

        <TextInput
          {...form.getInputProps('address_line1')}
          label="Street Address"
          placeholder="Street name and number"
          mb="md"
        />

        <TextInput
          {...form.getInputProps('address_line2')}
          label="Address Line 2"
          placeholder="Building, suite, etc. (optional)"
          mb="md"
        />

        <div className="form-row-group">
          <TextInput
            {...form.getInputProps('postal_code')}
            label="Postal Code"
            placeholder="1234 AB"
          />

          <TextInput {...form.getInputProps('city')} label="City" />
        </div>

        <div className="form-row-group">
          <TextInput
            {...form.getInputProps('province')}
            label="Province/State"
            placeholder="Optional"
          />

          <TextInput
            {...form.getInputProps('country_code')}
            label={
              <FieldLabel
                text="Country Code"
                helpText={helpContent.identifierCountry}
                dataTestId="company-country-help"
              />
            }
            maxLength={2}
            placeholder="NL"
          />
        </div>
      </fieldset>

      <div className="form-buttons">
        <Button type="submit" color="blue">
          Save Changes
        </Button>
        <Button type="button" onClick={onCancel} variant="default">
          Cancel
        </Button>
      </div>
    </form>
  );
};
