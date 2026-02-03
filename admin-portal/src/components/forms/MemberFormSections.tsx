import { Select, TextInput } from '@mantine/core';
// MemberFormSections.tsx - Form section components for MemberForm
import type React from 'react';
import { helpContent } from '../../config/helpContent';
import type { MemberFormData } from '../../utils/validation';
import { HelpTooltip } from '../help/HelpTooltip';

// Form label components - reusable helpers for progressive forms
const Label: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: Generic label component used with form controls
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

interface FormSectionProps {
  formData: MemberFormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onFieldChange: (field: keyof MemberFormData, value: string) => void;
  onBlur: (field: keyof MemberFormData) => void;
}

export const LegalEntityIdSection: React.FC<FormSectionProps> = ({
  formData,
  errors,
  touched,
  onFieldChange,
  onBlur,
}) => (
  <div className="form-field required">
    <Label>
      Legal Entity ID
      <HelpTooltip content={helpContent.legalEntityId} dataTestId="legal-entity-id-help" />
    </Label>
    <TextInput
      value={formData.legal_entity_id}
      onChange={(e) => onFieldChange('legal_entity_id', e.target.value || '')}
      onBlur={() => onBlur('legal_entity_id')}
      placeholder="org:company-name"
      required
      error={touched.legal_entity_id && errors.legal_entity_id}
      className={touched.legal_entity_id && errors.legal_entity_id ? 'invalid' : ''}
      aria-invalid={touched.legal_entity_id && Boolean(errors.legal_entity_id)}
      aria-describedby={`legal-entity-id-hint${touched.legal_entity_id && errors.legal_entity_id ? ' legal-entity-id-error' : ''}`}
    />
    {touched.legal_entity_id && errors.legal_entity_id && (
      <FormError id="legal-entity-id-error">{errors.legal_entity_id}</FormError>
    )}
    <Hint id="legal-entity-id-hint">
      Format: org:company-name (lowercase, letters, numbers, hyphens only)
    </Hint>
  </div>
);

export const LegalNameSection: React.FC<FormSectionProps> = ({
  formData,
  errors,
  touched,
  onFieldChange,
  onBlur,
}) => (
  <div className="form-field required">
    <Label>
      Legal Name
      <HelpTooltip content={helpContent.legalName} dataTestId="legal-name-help" />
    </Label>
    <TextInput
      value={formData.legal_name}
      onChange={(e) => onFieldChange('legal_name', e.target.value || '')}
      onBlur={() => onBlur('legal_name')}
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
);

export const DomainSection: React.FC<FormSectionProps> = ({
  formData,
  errors,
  touched,
  onFieldChange,
  onBlur,
}) => (
  <div className="form-field required">
    <Label>
      Domain
      <HelpTooltip content={helpContent.domain} dataTestId="domain-help" />
    </Label>
    <TextInput
      value={formData.domain}
      onChange={(e) => onFieldChange('domain', e.target.value || '')}
      onBlur={() => onBlur('domain')}
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
);

interface AuthTierSectionProps extends FormSectionProps {
  onTierChange: (value: string | null) => void;
}

export const AuthenticationTierSection: React.FC<AuthTierSectionProps> = ({
  formData,
  onTierChange,
}) => (
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
      onChange={onTierChange}
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
);

export const LEISection: React.FC<FormSectionProps> = ({
  formData,
  errors,
  touched,
  onFieldChange,
  onBlur,
}) => (
  <div className="form-field">
    <Label>
      LEI (Legal Entity Identifier)
      <HelpTooltip content={helpContent.lei} dataTestId="lei-help" />
    </Label>
    <TextInput
      value={formData.lei}
      onChange={(e) => onFieldChange('lei', e.target.value.toUpperCase())}
      onBlur={() => onBlur('lei')}
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
);

export const KVKSection: React.FC<FormSectionProps> = ({
  formData,
  errors,
  touched,
  onFieldChange,
  onBlur,
}) => (
  <div className="form-field">
    <Label>
      KVK Number (Dutch Chamber of Commerce)
      <HelpTooltip content={helpContent.kvk} dataTestId="kvk-help" />
    </Label>
    <TextInput
      value={formData.kvk}
      onChange={(e) => onFieldChange('kvk', e.target.value.replace(/\D/g, ''))}
      onBlur={() => onBlur('kvk')}
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
);
