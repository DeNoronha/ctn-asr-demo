import { Button, TextInput } from '@mantine/core';

import { MaskedTextBox } from '@progress/kendo-react-inputs';
import { Error, Hint, Label } from '@progress/kendo-react-labels';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepperForm } from '../components/forms/StepperForm';
import { HelpTooltip } from '../components/help/HelpTooltip';
import { helpContent } from '../config/helpContent';
import { useNotification } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import {
  type MemberFormData,
  formatDomain,
  formatKVK,
  formatLEI,
  formatOrgId,
  validateMemberForm,
} from '../utils/validation';
import '../styles/progressive-forms.css';
import './MemberRegistrationWizard.css';

export const MemberRegistrationWizard: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();

  const [formData, setFormData] = useState<MemberFormData>({
    org_id: 'org:',
    legal_name: '',
    domain: '',
    lei: '',
    kvk: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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

  const validateStep1 = () => {
    const requiredFields = ['org_id', 'legal_name', 'domain'];
    const validation = validateMemberForm(formData);

    const stepErrors: Record<string, string> = {};
    for (const field of requiredFields) {
      if (validation.errors[field]) {
        stepErrors[field] = validation.errors[field];
      }
    }

    setErrors(stepErrors);
    setTouched((prev) => ({
      ...prev,
      org_id: true,
      legal_name: true,
      domain: true,
    }));

    if (Object.keys(stepErrors).length > 0) {
      notification.showError('Please fix validation errors before proceeding');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    // Optional identifiers - validate format if provided
    const validation = validateMemberForm(formData);
    const stepErrors: Record<string, string> = {};

    if (formData.lei && validation.errors.lei) {
      stepErrors.lei = validation.errors.lei;
    }
    if (formData.kvk && validation.errors.kvk) {
      stepErrors.kvk = validation.errors.kvk;
    }

    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      notification.showError('Please fix validation errors before proceeding');
      return false;
    }

    return true;
  };

  const handleComplete = async (data: MemberFormData) => {
    try {
      // TODO: Replace with actual API call
      logger.log('Submitting member registration:', data);
      notification.showSuccess('Member registered successfully!');
      navigate('/members');
    } catch (error) {
      logger.error('Failed to register member:', error);
      notification.showError('Failed to register member');
    }
  };

  const steps = [
    {
      label: 'Organization Details',
      component: (
        <div className="wizard-step">
          <h2>Step 1: Organization Details</h2>
          <p className="step-description">
            Provide the basic information about the organization you want to register.
          </p>

          <div className="form-field required">
            <Label>
              Organization ID
              <HelpTooltip content={helpContent.orgId} dataTestId="org-id-help" />
            </Label>
            <TextInput
              value={formData.org_id}
              onChange={(e) => handleFieldChange('org_id', e.target.value || '')}
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
            <TextInput
              value={formData.legal_name}
              onChange={(e) => handleFieldChange('legal_name', e.target.value || '')}
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
            <TextInput
              value={formData.domain}
              onChange={(e) => handleFieldChange('domain', e.target.value || '')}
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
      ),
      isValid: validateStep1,
    },
    {
      label: 'Legal Identifiers',
      component: (
        <div className="wizard-step">
          <h2>Step 2: Legal Identifiers (Optional)</h2>
          <p className="step-description">
            Add legal identifiers to verify the organization's identity. These are optional but
            recommended.
          </p>

          <div className="form-field">
            <Label>
              LEI (Legal Entity Identifier)
              <HelpTooltip content={helpContent.lei} dataTestId="lei-help" />
            </Label>
            <MaskedTextBox
              value={formData.lei}
              onChange={(e) => handleFieldChange('lei', e.target.value || '')}
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
              onChange={(e) => handleFieldChange('kvk', e.target.value || '')}
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
      ),
      isValid: validateStep2,
    },
    {
      label: 'Review & Submit',
      component: (
        <div className="wizard-step">
          <h2>Step 3: Review Your Information</h2>
          <p className="step-description">
            Please review the information below before submitting your registration.
          </p>

          <div className="summary-section">
            <h3>Organization Details</h3>
            <dl className="summary-list">
              <dt>Organization ID:</dt>
              <dd>{formData.org_id}</dd>

              <dt>Legal Name:</dt>
              <dd>{formData.legal_name}</dd>

              <dt>Domain:</dt>
              <dd>{formData.domain}</dd>
            </dl>
          </div>

          {(formData.lei || formData.kvk) && (
            <div className="summary-section">
              <h3>Legal Identifiers</h3>
              <dl className="summary-list">
                {formData.lei && (
                  <>
                    <dt>LEI:</dt>
                    <dd>{formData.lei}</dd>
                  </>
                )}

                {formData.kvk && (
                  <>
                    <dt>KVK Number:</dt>
                    <dd>{formData.kvk}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          <div className="summary-actions">
            <p className="summary-note">
              By submitting this form, you confirm that the information provided is accurate and
              complete.
            </p>
          </div>
        </div>
      ),
      isValid: () => true,
    },
  ];

  return (
    <div className="member-registration-wizard">
      <div className="wizard-header">
        <h1>New Member Registration</h1>
        <p>Complete the steps below to register a new member organization</p>
      </div>

      <StepperForm steps={steps} onComplete={handleComplete} formData={formData} />

      <div className="wizard-footer">
        <Button onClick={() => navigate('/members')} variant="subtle">
          Cancel Registration
        </Button>
      </div>
    </div>
  );
};
