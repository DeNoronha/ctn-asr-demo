import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Field, Form, FormElement, type FormRenderProps } from '@progress/kendo-react-form';
import { Input } from '@progress/kendo-react-inputs';
import { Checkbox } from '@progress/kendo-react-inputs';
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

const emailValidator = (value: string) => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? '' : 'Please enter a valid email address';
};

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  legalEntityId,
  onSave,
  onCancel,
}) => {
  const handleSubmit = async (dataItem: Record<string, unknown>) => {
    // SEC-006: Sanitize form data before processing to prevent XSS attacks
    const sanitizedData = sanitizeFormData(dataItem);

    const contactData: LegalEntityContact = {
      legal_entity_contact_id: contact?.legal_entity_contact_id || crypto.randomUUID(),
      legal_entity_id: legalEntityId,
      dt_created: contact?.dt_created || new Date().toISOString(),
      dt_modified: new Date().toISOString(),
      contact_type: sanitizedData.contact_type as
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

  const getInitialValues = () => {
    if (contact) {
      const [first_name, ...lastNames] = (contact.full_name || '').split(' ');
      // Convert backend uppercase contact_type (e.g., 'PRIMARY') to title case (e.g., 'Primary')
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
    return { contact_type: 'Primary', is_primary: false, first_name: '', last_name: '' };
  };

  return (
    <Form
      initialValues={getInitialValues()}
      onSubmit={handleSubmit}
      render={(formRenderProps: FormRenderProps) => (
        <FormElement className="contact-form">
          <fieldset className="k-form-fieldset">
            <legend>Contact Type</legend>

            <Field
              name="contact_type"
              label={() => (
                <FieldLabel
                  text="Type"
                  helpText={helpContent.contactType}
                  dataTestId="contact-type-help"
                />
              )}
              component={DropDownList}
              data={contactTypes}
            />

            <Field
              name="is_primary"
              label={() => (
                <FieldLabel
                  text="Primary Contact"
                  helpText={helpContent.isPrimaryContact}
                  dataTestId="is-primary-help"
                />
              )}
              component={Checkbox}
            />
          </fieldset>

          <fieldset className="k-form-fieldset">
            <legend>Personal Information</legend>

            <div className="form-row-group">
              <Field name="first_name" label="First Name" component={Input} required />

              <Field name="last_name" label="Last Name" component={Input} required />
            </div>

            <Field
              name="email"
              label={() => (
                <FieldLabel
                  text="Email"
                  helpText={helpContent.emailFormat}
                  required
                  dataTestId="email-help"
                />
              )}
              component={Input}
              type="email"
              validator={emailValidator}
              required
            />
          </fieldset>

          <ProgressiveSection
            title="Additional Contact Details (Optional)"
            storageKey="contact-form-details"
            defaultExpanded={false}
          >
            <div className="form-row-group">
              <Field
                name="phone"
                label={() => (
                  <FieldLabel
                    text="Phone"
                    helpText={helpContent.contactPhone}
                    dataTestId="phone-help"
                  />
                )}
                component={Input}
                placeholder="+31 20 123 4567"
              />

              <Field
                name="mobile"
                label={() => (
                  <FieldLabel
                    text="Mobile"
                    helpText={helpContent.contactMobile}
                    dataTestId="mobile-help"
                  />
                )}
                component={Input}
                placeholder="+31 6 12 34 56 78"
              />
            </div>

            <Field
              name="job_title"
              label={() => (
                <FieldLabel
                  text="Job Title"
                  helpText={helpContent.jobTitle}
                  dataTestId="job-title-help"
                />
              )}
              component={Input}
              placeholder="e.g., IT Manager, Operations Director"
            />

            <Field
              name="department"
              label={() => (
                <FieldLabel
                  text="Department"
                  helpText={helpContent.department}
                  dataTestId="department-help"
                />
              )}
              component={Input}
              placeholder="e.g., IT, Operations, Finance"
            />
          </ProgressiveSection>

          <div className="k-form-buttons">
            <Button type="submit" themeColor="primary" disabled={!formRenderProps.allowSubmit}>
              Save Contact
            </Button>
            <Button type="button" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </FormElement>
      )}
    />
  );
};
