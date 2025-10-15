import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Field, Form, FormElement, type FormRenderProps } from '@progress/kendo-react-form';
import { Input } from '@progress/kendo-react-inputs';
// CompanyForm.tsx - Edit company/legal entity information
import type React from 'react';
import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import type { LegalEntity } from '../services/api';
import { apiV2 } from '../services/api';
import type { LegalEntityIdentifier } from '../services/apiV2';
import './CompanyForm.css';

interface CompanyFormProps {
  data: LegalEntity;
  onSave: (data: LegalEntity) => Promise<void>;
  onCancel: () => void;
}

const IDENTIFIER_TYPES = [
  'KVK',
  'LEI',
  'EUID',
  'HRB',
  'HRA',
  'KBO',
  'SIREN',
  'SIRET',
  'CRN',
  'EORI',
  'VAT',
  'DUNS',
  'OTHER',
];

const COUNTRY_CODES = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'DE', name: 'Germany' },
  { code: 'BE', name: 'Belgium' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'EU', name: 'European Union' },
  { code: 'XX', name: 'Global/International' },
];

export const CompanyForm: React.FC<CompanyFormProps> = ({ data, onSave, onCancel }) => {
  const notification = useNotification();
  const [identifiers, setIdentifiers] = useState<LegalEntityIdentifier[]>(data.identifiers || []);
  const [newIdentifier, setNewIdentifier] = useState<Partial<LegalEntityIdentifier>>({
    identifier_type: 'KVK',
    identifier_value: '',
    country_code: 'NL',
    registry_name: '',
  });

  const handleSubmit = async (dataItem: { [name: string]: any }) => {
    await onSave(dataItem as LegalEntity);
  };

  const handleAddIdentifier = async () => {
    if (!newIdentifier.identifier_value || !data.legal_entity_id) {
      notification.showError('Please fill in the identifier value');
      return;
    }

    try {
      const created = await apiV2.addIdentifier({
        legal_entity_id: data.legal_entity_id,
        identifier_type: newIdentifier.identifier_type as any,
        identifier_value: newIdentifier.identifier_value,
        country_code: newIdentifier.country_code,
        registry_name: newIdentifier.registry_name,
      });

      setIdentifiers([...identifiers, created]);
      setNewIdentifier({
        identifier_type: 'KVK',
        identifier_value: '',
        country_code: 'NL',
        registry_name: '',
      });
      notification.showSuccess('Identifier added successfully');
    } catch (error) {
      console.error('Failed to add identifier:', error);
      notification.showError('Failed to add identifier');
    }
  };

  const handleRemoveIdentifier = async (identifierId: string) => {
    try {
      await apiV2.deleteIdentifier(identifierId);
      setIdentifiers(identifiers.filter((id) => id.legal_entity_reference_id !== identifierId));
      notification.showSuccess('Identifier removed successfully');
    } catch (error) {
      console.error('Failed to remove identifier:', error);
      notification.showError('Failed to remove identifier');
    }
  };

  return (
    <Form
      initialValues={data}
      onSubmit={handleSubmit}
      render={(_formRenderProps: FormRenderProps) => (
        <FormElement className="company-form">
          <fieldset className="k-form-fieldset">
            <legend>Company Information</legend>

            <Field name="primary_legal_name" label="Legal Name" component={Input} required />

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

              <Field name="city" label="City" component={Input} />
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

          <fieldset className="k-form-fieldset">
            <legend>Legal Identifiers</legend>

            {identifiers.length > 0 && (
              <div className="identifiers-section">
                {identifiers.map((identifier) => (
                  <div key={identifier.legal_entity_reference_id} className="identifier-item">
                    <div className="identifier-details">
                      <div className="identifier-type">
                        <strong>{identifier.identifier_type}</strong>
                        {identifier.country_code && (
                          <span className="country-code">({identifier.country_code})</span>
                        )}
                      </div>
                      <div className="identifier-value-display">{identifier.identifier_value}</div>
                      {identifier.registry_name && (
                        <div className="registry-name-display">{identifier.registry_name}</div>
                      )}
                    </div>
                    <Button
                      type="button"
                      fillMode="flat"
                      themeColor="error"
                      onClick={() => handleRemoveIdentifier(identifier.legal_entity_reference_id!)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-identifier-section">
              <h4>Add New Identifier</h4>
              <div className="identifier-form-grid">
                <div className="form-field">
                  <label>Type</label>
                  <DropDownList
                    data={IDENTIFIER_TYPES}
                    value={newIdentifier.identifier_type}
                    onChange={(e) =>
                      setNewIdentifier({ ...newIdentifier, identifier_type: e.value as any })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Identifier Value</label>
                  <Input
                    value={newIdentifier.identifier_value || ''}
                    onChange={(e) =>
                      setNewIdentifier({ ...newIdentifier, identifier_value: e.value })
                    }
                    placeholder="Enter identifier value"
                  />
                </div>

                <div className="form-field">
                  <label>Country</label>
                  <DropDownList
                    data={COUNTRY_CODES}
                    textField="name"
                    dataItemKey="code"
                    value={COUNTRY_CODES.find((c) => c.code === newIdentifier.country_code)}
                    onChange={(e) =>
                      setNewIdentifier({ ...newIdentifier, country_code: e.value.code })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Registry Name</label>
                  <Input
                    value={newIdentifier.registry_name || ''}
                    onChange={(e) => setNewIdentifier({ ...newIdentifier, registry_name: e.value })}
                    placeholder="e.g., Kamer van Koophandel"
                  />
                </div>
              </div>

              <Button
                type="button"
                themeColor="primary"
                fillMode="outline"
                onClick={handleAddIdentifier}
              >
                Add Identifier
              </Button>
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
