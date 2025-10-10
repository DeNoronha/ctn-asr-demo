// ContactForm.tsx - Form for creating/editing contacts
import React from 'react';
import { Form, Field, FormElement, FormRenderProps } from '@progress/kendo-react-form';
import { Input } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Checkbox } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { LegalEntityContact } from '../services/api';
import './ContactForm.css';

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
  const handleSubmit = async (dataItem: { [name: string]: any }) => {
    const contactData: LegalEntityContact = {
      legal_entity_contact_id: contact?.legal_entity_contact_id || crypto.randomUUID(),
      legal_entity_id: legalEntityId,
      dt_created: contact?.dt_created || new Date().toISOString(),
      dt_modified: new Date().toISOString(),
      contact_type: dataItem.contact_type,
      full_name: `${dataItem.first_name} ${dataItem.last_name}`,
      email: dataItem.email,
      phone: dataItem.phone,
      mobile: dataItem.mobile,
      job_title: dataItem.job_title,
      department: dataItem.department,
      is_primary: dataItem.is_primary || false,
    };

    await onSave(contactData);
  };

  const getInitialValues = () => {
    if (contact) {
      const [first_name, ...lastNames] = (contact.full_name || '').split(' ');
      return {
        ...contact,
        first_name: first_name || '',
        last_name: lastNames.join(' ') || ''
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
              label="Type"
              component={DropDownList}
              data={contactTypes}
            />

            <Field
              name="is_primary"
              label="Primary Contact"
              component={Checkbox}
            />
          </fieldset>

          <fieldset className="k-form-fieldset">
            <legend>Personal Information</legend>
            
            <div className="form-row-group">
              <Field
                name="first_name"
                label="First Name"
                component={Input}
                required
              />

              <Field
                name="last_name"
                label="Last Name"
                component={Input}
                required
              />
            </div>

            <Field
              name="email"
              label="Email"
              component={Input}
              type="email"
              validator={emailValidator}
              required
            />

            <div className="form-row-group">
              <Field
                name="phone"
                label="Phone"
                component={Input}
                placeholder="+31 20 123 4567"
              />

              <Field
                name="mobile"
                label="Mobile"
                component={Input}
                placeholder="+31 6 12 34 56 78"
              />
            </div>
          </fieldset>

          <fieldset className="k-form-fieldset">
            <legend>Professional Information</legend>
            
            <Field
              name="job_title"
              label="Job Title"
              component={Input}
              placeholder="e.g., IT Manager, Operations Director"
            />

            <Field
              name="department"
              label="Department"
              component={Input}
              placeholder="e.g., IT, Operations, Finance"
            />
          </fieldset>

          <div className="k-form-buttons">
            <Button 
              type="submit" 
              themeColor="primary"
              disabled={!formRenderProps.allowSubmit}
            >
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
