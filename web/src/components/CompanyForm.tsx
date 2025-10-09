// CompanyForm.tsx - Edit company/legal entity information
import React from 'react';
import { Form, Field, FormElement, FormRenderProps } from '@progress/kendo-react-form';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { LegalEntity } from '../services/api';
import './CompanyForm.css';

interface CompanyFormProps {
  data: LegalEntity;
  onSave: (data: LegalEntity) => Promise<void>;
  onCancel: () => void;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ 
  data, 
  onSave, 
  onCancel 
}) => {
  const handleSubmit = async (dataItem: { [name: string]: any }) => {
    await onSave(dataItem as LegalEntity);
  };

  return (
    <Form
      initialValues={data}
      onSubmit={handleSubmit}
      render={(formRenderProps: FormRenderProps) => (
        <FormElement className="company-form">
          <fieldset className="k-form-fieldset">
            <legend>Company Information</legend>
            
            <Field
              name="primary_legal_name"
              label="Legal Name"
              component={Input}
              required
            />

            <Field
              name="entity_legal_form"
              label="Legal Form"
              component={Input}
              placeholder="e.g., BV, NV, LLC"
            />

            <Field
              name="registered_at"
              label="Registration Number"
              component={Input}
              placeholder="Chamber of Commerce number"
            />
          </fieldset>

          <fieldset className="k-form-fieldset">
            <legend>Address</legend>

            <Field
              name="address_line1"
              label="Street Address"
              component={Input}
              placeholder="Street name and number"
            />

            <Field
              name="address_line2"
              label="Address Line 2"
              component={Input}
              placeholder="Building, suite, etc. (optional)"
            />

            <div className="form-row-group">
              <Field
                name="postal_code"
                label="Postal Code"
                component={Input}
                placeholder="1234 AB"
              />

              <Field
                name="city"
                label="City"
                component={Input}
              />
            </div>

            <div className="form-row-group">
              <Field
                name="province"
                label="Province/State"
                component={Input}
                placeholder="Optional"
              />

              <Field
                name="country_code"
                label="Country Code"
                component={Input}
                maxLength={2}
                placeholder="NL"
              />
            </div>
          </fieldset>

          <div className="k-form-buttons">
            <Button type="submit" themeColor="primary">
              Save Changes
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
