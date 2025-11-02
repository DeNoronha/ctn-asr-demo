import { Button, TextInput, Select, Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';

// ContactForm.tsx - Form for creating/editing contacts
import type React from 'react';
import type { LegalEntityContact } from '../services/api';
import { sanitizeFormData } from '../utils/sanitize';
import { FieldLabel } from './help/FieldLabel';
import { helpContent } from '../config/helpContent';
import { ProgressiveSection } from './forms/ProgressiveSection';
import './ContactForm.css';
import '../styles/progressive-forms.css';

interface ContactFormProps {
  contact: LegalEntityContact | null;
  legalEntityId: string;
  onSave: (contact: LegalEntityContact) => Promise<void>;
  onCancel: () => void;
}

const contactTypes = ['Primary', 'Technical', 'Billing', 'Support'];

/**
 * Form validation functions with inline feedback (DA-007)
 * Mantine format: return null for valid, error message for invalid
 */
const emailValidator = (value: string) => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : 'Please enter a valid email address (e.g., name@company.com)';
};

const nameValidator = (value: string, fieldName: string) => {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  if (value.trim().length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  return null;
};

const phoneValidator = (value: string) => {
  if (!value) return null; // Optional field
  const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
  return phoneRegex.test(value) ? null : 'Please enter a valid phone number (e.g., +31 20 123 4567)';
};

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  legalEntityId,
  onSave,
  onCancel,
}) => {
  const getInitialValues = () => {
    if (contact) {
      const [first_name, ...lastNames] = (contact.full_name || '').split(' ');
      const contactType = contact.contact_type
        ? contact.contact_type.charAt(0) + contact.contact_type.slice(1).toLowerCase()
        : 'Primary';

      return {
        contact_type: contactType,
        first_name: first_name || '',
        last_name: lastNames.join(' ') || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        is_primary: contact.is_primary || false,
      };
    }
    return {
      contact_type: 'Primary',
      is_primary: false,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      department: '',
    };
  };

  const form = useForm({
    initialValues: getInitialValues(),
    validate: {
      first_name: (value) => nameValidator(value, 'First name'),
      last_name: (value) => nameValidator(value, 'Last name'),
      email: emailValidator,
      phone: phoneValidator,
      mobile: phoneValidator,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const sanitizedData = sanitizeFormData(values);

    const contactData: LegalEntityContact = {
      legal_entity_contact_id: contact?.legal_entity_contact_id || crypto.randomUUID(),
      legal_entity_id: legalEntityId,
      dt_created: contact?.dt_created || new Date().toISOString(),
      dt_modified: new Date().toISOString(),
      contact_type: (sanitizedData.contact_type as string).toUpperCase() as
        | 'PRIMARY'
        | 'TECHNICAL'
        | 'BILLING'
        | 'SUPPORT'
        | 'COMPLIANCE'
        | 'ADMIN',
      full_name: `${sanitizedData.first_name} ${sanitizedData.last_name}`,
      email: sanitizedData.email as string,
      phone: sanitizedData.phone as string,
      mobile: sanitizedData.mobile as string,
      job_title: sanitizedData.job_title as string,
      department: sanitizedData.department as string,
      is_primary: (sanitizedData.is_primary as boolean) || false,
    };

    await onSave(contactData);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} className="contact-form">
      <fieldset className="k-form-fieldset">
        <legend>Contact Type</legend>

        <Select
          {...form.getInputProps('contact_type')}
          label={
            <FieldLabel
              text="Contact Type"
              helpText={helpContent.contactType}
              dataTestId="contact-type-help"
            />
          }
          data={contactTypes}
          mb="md"
        />

        <Checkbox
          {...form.getInputProps('is_primary', { type: 'checkbox' })}
          label={
            <FieldLabel
              text="Primary Contact"
              helpText={helpContent.isPrimaryContact}
              dataTestId="is-primary-help"
            />
          }
          mb="md"
        />
      </fieldset>

      <fieldset className="k-form-fieldset">
        <legend>Personal Information</legend>

        <div className="form-row-group">
          <TextInput
            {...form.getInputProps('first_name')}
            label="First Name"
            required
            placeholder="e.g., Jane"
            autoComplete="given-name"
          />

          <TextInput
            {...form.getInputProps('last_name')}
            label="Last Name"
            required
            placeholder="e.g., Doe"
            autoComplete="family-name"
          />
        </div>

        <TextInput
          {...form.getInputProps('email')}
          label={
            <FieldLabel
              text="Email"
              helpText={helpContent.emailFormat}
              required
              dataTestId="email-help"
            />
          }
          type="email"
          required
          placeholder="name@company.com"
          autoComplete="email"
          mb="md"
        />
      </fieldset>

      <ProgressiveSection
        title="Additional Contact Details (Optional)"
        storageKey="contact-form-details"
        defaultExpanded={false}
      >
        <div className="form-row-group">
          <TextInput
            {...form.getInputProps('phone')}
            label={
              <FieldLabel
                text="Phone"
                helpText={helpContent.contactPhone}
                dataTestId="phone-help"
              />
            }
            placeholder="+31 20 123 4567"
          />

          <TextInput
            {...form.getInputProps('mobile')}
            label={
              <FieldLabel
                text="Mobile"
                helpText={helpContent.contactMobile}
                dataTestId="mobile-help"
              />
            }
            placeholder="+31 6 12 34 56 78"
          />
        </div>

        <TextInput
          {...form.getInputProps('job_title')}
          label={
            <FieldLabel
              text="Job Title"
              helpText={helpContent.jobTitle}
              dataTestId="job-title-help"
            />
          }
          placeholder="e.g., IT Manager, Operations Director"
          mb="md"
        />

        <TextInput
          {...form.getInputProps('department')}
          label={
            <FieldLabel
              text="Department"
              helpText={helpContent.department}
              dataTestId="department-help"
            />
          }
          placeholder="e.g., IT, Operations, Finance"
          mb="md"
        />
      </ProgressiveSection>

      <div className="k-form-buttons">
        <Button type="submit" color="blue">
          {contact ? 'Update Contact' : 'Add Contact'}
        </Button>
        <Button type="button" onClick={onCancel} variant="default">
          Cancel
        </Button>
      </div>
    </form>
  );
};
