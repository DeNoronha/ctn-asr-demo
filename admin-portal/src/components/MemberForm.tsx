import { Button, Select, TextInput } from '@mantine/core';
// MemberForm.tsx - Enhanced form with validation
import type React from 'react';
import { useEffect, useState } from 'react';

// Form label components - reusable helpers for progressive forms
// biome-ignore lint/a11y/noLabelWithoutControl: Generic label component used with controls throughout the form
const Label: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <label id={id} className="form-label">
    {children}
  </label>
);
const FormError: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <div
    id={id}
    className="form-error"
    style={{ color: '#f31700', fontSize: '0.875rem', marginTop: '0.25rem' }}
  >
    {children}
  </div>
);
const Hint: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <div
    id={id}
    className="form-hint"
    style={{ color: '#656565', fontSize: '0.875rem', marginTop: '0.25rem' }}
  >
    {children}
  </div>
);
import { helpContent } from '../config/helpContent';
import { useNotification } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { sanitizeFormData } from '../utils/sanitize';
import {
  type MemberFormData,
  formatDomain,
  formatKVK,
  formatLEI,
  formatOrgId,
  validateMemberForm,
} from '../utils/validation';
import { ProgressiveSection } from './forms/ProgressiveSection';
import { HelpTooltip } from './help/HelpTooltip';
import './MemberForm.css';
import '../styles/progressive-forms.css';

interface MemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: MemberFormData;
}

interface TierOption {
  tier: number;
  name: string;
  access: string;
  method: string;
}

const TIER_OPTIONS: TierOption[] = [
  {
    tier: 3,
    name: 'Tier 3 - Email + KvK Verification',
    access: 'Public data only',
    method: 'EmailVerification',
  },
  {
    tier: 2,
    name: 'Tier 2 - DNS Verification',
    access: 'Sensitive data read + webhooks',
    method: 'DNS',
  },
  {
    tier: 1,
    name: 'Tier 1 - eHerkenning',
    access: 'Full access (read, write, publish)',
    method: 'eHerkenning',
  },
];

const MemberForm: React.FC<MemberFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const notification = useNotification();
  const [formData, setFormData] = useState<MemberFormData>(
    initialData || {
      org_id: 'org:',
      legal_name: '',
      domain: '',
      lei: '',
      kvk: '',
      authentication_tier: 3, // Default to Tier 3
      authentication_method: 'EmailVerification',
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
      // SEC-006: Sanitize form data before submission to prevent XSS attacks
      await onSubmit(sanitizeFormData(formData as any) as MemberFormData);
      // Clear draft on successful submit
      localStorage.removeItem('memberFormDraft');
      setIsDirty(false);
    } catch (error) {
      // Error handling done by parent, but log for debugging (CR-004)
      logger.error('Failed to submit member form:', error);
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
          authentication_tier: 3,
          authentication_method: 'EmailVerification',
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
            <TextInput
              value={formData.org_id}
              onChange={(e) => handleFieldChange('org_id', e.target.value || '')}
              onBlur={() => handleBlur('org_id')}
              placeholder="org:company-name"
              required
              error={touched.org_id && errors.org_id}
              className={touched.org_id && errors.org_id ? 'invalid' : ''}
              aria-invalid={touched.org_id && Boolean(errors.org_id)}
              aria-describedby={`org-id-hint${touched.org_id && errors.org_id ? ' org-id-error' : ''}`}
            />
            {touched.org_id && errors.org_id && <FormError id="org-id-error">{errors.org_id}</FormError>}
            <Hint id="org-id-hint">
              Format: org:company-name (lowercase, letters, numbers, hyphens only)
            </Hint>
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
              error={touched.legal_name && errors.legal_name}
              className={touched.legal_name && errors.legal_name ? 'invalid' : ''}
              aria-invalid={touched.legal_name && Boolean(errors.legal_name)}
              aria-describedby={`legal-name-hint${touched.legal_name && errors.legal_name ? ' legal-name-error' : ''}`}
            />
            {touched.legal_name && errors.legal_name && (
              <FormError id="legal-name-error">{errors.legal_name}</FormError>
            )}
            <Hint id="legal-name-hint">Official registered business name</Hint>
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
              error={touched.domain && errors.domain}
              className={touched.domain && errors.domain ? 'invalid' : ''}
              aria-invalid={touched.domain && Boolean(errors.domain)}
              aria-describedby={`domain-hint${touched.domain && errors.domain ? ' domain-error' : ''}`}
            />
            {touched.domain && errors.domain && <FormError id="domain-error">{errors.domain}</FormError>}
            <Hint id="domain-hint">Primary domain name (e.g., company.com)</Hint>
          </div>

          <div className="form-field required">
            <Label>
              Authentication Tier
              <HelpTooltip content={helpContent.authenticationTier} dataTestId="tier-help" />
            </Label>
            <Select
              data={TIER_OPTIONS.map((t) => ({
                value: t.tier.toString(),
                label: t.name,
              }))}
              value={formData.authentication_tier?.toString() || '3'}
              onChange={(value) => {
                if (value) {
                  const selectedTier = TIER_OPTIONS.find((t) => t.tier === Number(value));
                  if (selectedTier) {
                    setFormData((prev) => ({
                      ...prev,
                      authentication_tier: selectedTier.tier,
                      authentication_method: selectedTier.method,
                    }));
                    setIsDirty(true);
                  }
                }
              }}
              renderOption={({ option }) => {
                const tierOption = TIER_OPTIONS.find((t) => t.tier === Number(option.value));
                return tierOption ? (
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ fontWeight: 600 }}>{tierOption.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ctn-text-light)' }}>
                      {tierOption.access}
                    </div>
                  </div>
                ) : null;
              }}
            />
            <Hint>
              {TIER_OPTIONS.find((t) => t.tier === formData.authentication_tier)?.access ||
                'Select tier to see access level'}
            </Hint>
          </div>
        </div>

        <ProgressiveSection
          title="Optional Identifiers"
          storageKey="member-form-identifiers"
          defaultExpanded={false}
        >
          <div className="form-field">
            <Label>
              LEI (Legal Entity Identifier)
              <HelpTooltip content={helpContent.lei} dataTestId="lei-help" />
            </Label>
            <TextInput
              value={formData.lei}
              onChange={(e) => handleFieldChange('lei', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('lei')}
              maxLength={20}
              placeholder="20 character LEI code"
              error={touched.lei && errors.lei ? errors.lei : undefined}
              className={touched.lei && errors.lei ? 'invalid' : ''}
              aria-invalid={touched.lei && Boolean(errors.lei)}
              aria-describedby={`lei-hint${touched.lei && errors.lei ? ' lei-error' : ''}`}
            />
            {touched.lei && errors.lei && <FormError id="lei-error">{errors.lei}</FormError>}
            <Hint id="lei-hint">20-character alphanumeric code (optional)</Hint>
          </div>

          <div className="form-field">
            <Label>
              KVK Number (Dutch Chamber of Commerce)
              <HelpTooltip content={helpContent.kvk} dataTestId="kvk-help" />
            </Label>
            <TextInput
              value={formData.kvk}
              onChange={(e) => handleFieldChange('kvk', e.target.value.replace(/\D/g, ''))}
              onBlur={() => handleBlur('kvk')}
              maxLength={8}
              placeholder="12345678"
              error={touched.kvk && errors.kvk ? errors.kvk : undefined}
              className={touched.kvk && errors.kvk ? 'invalid' : ''}
              aria-invalid={touched.kvk && Boolean(errors.kvk)}
              aria-describedby={`kvk-hint${touched.kvk && errors.kvk ? ' kvk-error' : ''}`}
            />
            {touched.kvk && errors.kvk && <FormError id="kvk-error">{errors.kvk}</FormError>}
            <Hint id="kvk-hint">8-digit number (optional)</Hint>
          </div>
        </ProgressiveSection>

        <div className="form-actions">
          <Button type="submit" color="blue" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : initialData ? 'Update Member' : 'Register Member'}
          </Button>
          <Button type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          {isDirty && !initialData && (
            <Button type="button" variant="subtle" onClick={handleReset} disabled={isSubmitting}>
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
