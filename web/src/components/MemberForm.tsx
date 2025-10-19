import { Button } from '@progress/kendo-react-buttons';
import { Input, MaskedTextBox } from '@progress/kendo-react-inputs';
import { Error, Hint, Label } from '@progress/kendo-react-labels';
// MemberForm.tsx - Enhanced form with validation
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import {
  type MemberFormData,
  formatDomain,
  formatKVK,
  formatLEI,
  formatOrgId,
  validateMemberForm,
} from '../utils/validation';
import { HelpTooltip } from './help/HelpTooltip';
import { helpContent } from '../config/helpContent';
import './MemberForm.css';

interface MemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: MemberFormData;
}

const MemberForm: React.FC<MemberFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const notification = useNotification();
  const [formData, setFormData] = useState<MemberFormData>(
    initialData || {
      org_id: 'org:',
      legal_name: '',
      domain: '',
      lei: '',
      kvk: '',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isDirty && !initialData) {
      const draftKey = 'memberFormDraft';
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, isDirty, initialData]);

  // Load draft on mount
  useEffect(() => {
    if (!initialData) {
      const draftKey = 'memberFormDraft';
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setFormData(parsedDraft);
          notification.showInfo('Draft restored from previous session');
        } catch (e) {
          console.error('Failed to load draft', e);
        }
      }
    }
  }, [initialData, notification]);

  const handleFieldChange = (field: keyof MemberFormData, value: string) => {
    let formattedValue = value;

    // Apply formatting based on field
    switch (field) {
      case 'org_id':
        formattedValue = formatOrgId(value);
        break;
      case 'domain':
        formattedValue = formatDomain(value);
        break;
      case 'lei':
        formattedValue = formatLEI(value);
        break;
      case 'kvk':
        formattedValue = formatKVK(value);
        break;
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    setIsDirty(true);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof MemberFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate single field
    const validation = validateMemberForm(formData);
    if (validation.errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validation.errors[field] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setTouched(allTouched);

    // Validate
    const validation = validateMemberForm(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      notification.showError('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      // Clear draft on successful submit
      localStorage.removeItem('memberFormDraft');
      setIsDirty(false);
    } catch (_error) {
      // Error handling done by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (isDirty) {
      if (
        window.confirm('Are you sure you want to reset the form? Unsaved changes will be lost.')
      ) {
        setFormData({
          org_id: 'org:',
          legal_name: '',
          domain: '',
          lei: '',
          kvk: '',
        });
        setErrors({});
        setTouched({});
        setIsDirty(false);
        localStorage.removeItem('memberFormDraft');
        notification.showInfo('Form reset');
      }
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="member-form-container">
      <form onSubmit={handleSubmit} className="member-form">
        <div className="form-section">
          <h3>Organization Details</h3>

          <div className="form-field required">
            <Label>
              Organization ID
              <HelpTooltip content={helpContent.orgId} dataTestId="org-id-help" />
            </Label>
            <Input
              value={formData.org_id}
              onChange={(e) => handleFieldChange('org_id', e.value || '')}
              onBlur={() => handleBlur('org_id')}
              placeholder="org:company-name"
              required
              valid={!errors.org_id}
              className={touched.org_id && errors.org_id ? 'k-invalid' : ''}
            />
            {touched.org_id && errors.org_id && <Error>{errors.org_id}</Error>}
            <Hint>Format: org:company-name (lowercase, letters, numbers, hyphens only)</Hint>
          </div>

          <div className="form-field required">
            <Label>
              Legal Name
              <HelpTooltip content={helpContent.legalName} dataTestId="legal-name-help" />
            </Label>
            <Input
              value={formData.legal_name}
              onChange={(e) => handleFieldChange('legal_name', e.value || '')}
              onBlur={() => handleBlur('legal_name')}
              placeholder="Company Legal Name BV"
              required
              valid={!errors.legal_name}
              className={touched.legal_name && errors.legal_name ? 'k-invalid' : ''}
            />
            {touched.legal_name && errors.legal_name && <Error>{errors.legal_name}</Error>}
            <Hint>Official registered business name</Hint>
          </div>

          <div className="form-field required">
            <Label>
              Domain
              <HelpTooltip content={helpContent.domain} dataTestId="domain-help" />
            </Label>
            <Input
              value={formData.domain}
              onChange={(e) => handleFieldChange('domain', e.value || '')}
              onBlur={() => handleBlur('domain')}
              placeholder="company.com"
              required
              valid={!errors.domain}
              className={touched.domain && errors.domain ? 'k-invalid' : ''}
            />
            {touched.domain && errors.domain && <Error>{errors.domain}</Error>}
            <Hint>Primary domain name (e.g., company.com)</Hint>
          </div>
        </div>

        <div className="form-section">
          <h3>Optional Identifiers</h3>

          <div className="form-field">
            <Label>
              LEI (Legal Entity Identifier)
              <HelpTooltip content={helpContent.lei} dataTestId="lei-help" />
            </Label>
            <MaskedTextBox
              value={formData.lei}
              onChange={(e) => handleFieldChange('lei', e.value || '')}
              onBlur={() => handleBlur('lei')}
              mask="AAAAAAAAAAAAAAAAAAAA"
              placeholder="20 character LEI code"
              valid={!errors.lei}
              className={touched.lei && errors.lei ? 'k-invalid' : ''}
            />
            {touched.lei && errors.lei && <Error>{errors.lei}</Error>}
            <Hint>20-character alphanumeric code (optional)</Hint>
          </div>

          <div className="form-field">
            <Label>
              KVK Number (Dutch Chamber of Commerce)
              <HelpTooltip content={helpContent.kvk} dataTestId="kvk-help" />
            </Label>
            <MaskedTextBox
              value={formData.kvk}
              onChange={(e) => handleFieldChange('kvk', e.value || '')}
              onBlur={() => handleBlur('kvk')}
              mask="00000000"
              placeholder="12345678"
              valid={!errors.kvk}
              className={touched.kvk && errors.kvk ? 'k-invalid' : ''}
            />
            {touched.kvk && errors.kvk && <Error>{errors.kvk}</Error>}
            <Hint>8-digit number (optional)</Hint>
          </div>
        </div>

        <div className="form-actions">
          <Button type="submit" themeColor="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : initialData ? 'Update Member' : 'Register Member'}
          </Button>
          <Button type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          {isDirty && !initialData && (
            <Button type="button" fillMode="flat" onClick={handleReset} disabled={isSubmitting}>
              Reset Form
            </Button>
          )}
        </div>

        {isDirty && (
          <div className="form-status">
            <small>💾 Draft auto-saved</small>
          </div>
        )}
      </form>
    </div>
  );
};

export default MemberForm;
