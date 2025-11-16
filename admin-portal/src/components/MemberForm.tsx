// MemberForm.tsx - Simplified orchestrator component
import { Button } from '@mantine/core';
import type React from 'react';
import { useMemberForm } from '../hooks/useMemberForm';
import type { MemberFormData } from '../utils/validation';
import {
  AuthenticationTierSection,
  DomainSection,
  KVKSection,
  LEISection,
  LegalNameSection,
  OrgIdSection,
} from './forms/MemberFormSections';
import { ProgressiveSection } from './forms/ProgressiveSection';
import './MemberForm.css';
import '../styles/progressive-forms.css';

interface MemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: MemberFormData;
}

const MemberForm: React.FC<MemberFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleFieldChange,
    handleTierChange,
    handleBlur,
    handleSubmit,
    handleReset,
    handleCancel,
  } = useMemberForm({ onSubmit, onCancel, initialData });

  return (
    <div className="member-form-container">
      <form onSubmit={handleSubmit} className="member-form">
        <div className="form-section">
          <h3>Organization Details</h3>

          <OrgIdSection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
          />

          <LegalNameSection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
          />

          <DomainSection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
          />

          <AuthenticationTierSection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
            onTierChange={handleTierChange}
          />
        </div>

        <ProgressiveSection
          title="Optional Identifiers"
          storageKey="member-form-identifiers"
          defaultExpanded={false}
        >
          <LEISection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
          />

          <KVKSection
            formData={formData}
            errors={errors}
            touched={touched}
            onFieldChange={handleFieldChange}
            onBlur={handleBlur}
          />
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
