// useMemberForm.ts - Custom hook for member form state and logic
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { sanitizeFormData } from '../utils/sanitize';
import type { MemberFormData } from '../utils/validation';
import {
  formatDomain,
  formatKVK,
  formatLEI,
  formatLegalEntityId,
  validateMemberForm,
} from '../utils/validation';

interface UseMemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: MemberFormData;
}

interface UseMemberFormReturn {
  formData: MemberFormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  handleFieldChange: (field: keyof MemberFormData, value: string) => void;
  handleTierChange: (value: string | null) => void;
  handleBlur: (field: keyof MemberFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleReset: () => void;
  handleCancel: () => void;
}

const DEFAULT_FORM_DATA: MemberFormData = {
  legal_entity_id: 'org:',
  legal_name: '',
  domain: '',
  lei: '',
  kvk: '',
  authentication_tier: 3,
  authentication_method: 'EmailVerification',
};

export const useMemberForm = ({
  onSubmit,
  onCancel,
  initialData,
}: UseMemberFormProps): UseMemberFormReturn => {
  const notification = useNotification();
  const [formData, setFormData] = useState<MemberFormData>(initialData || DEFAULT_FORM_DATA);
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
      try {
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          const parsedDraft = JSON.parse(draft);
          setFormData(parsedDraft);
          notification.showInfo('Draft restored from previous session');
        }
      } catch (e) {
        logger.warn('Failed to load draft', { error: e });
        // Clear corrupted draft
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // localStorage unavailable (private browsing mode)
        }
      }
    }
  }, [initialData, notification]);

  const handleFieldChange = (field: keyof MemberFormData, value: string) => {
    let formattedValue = value;

    // Apply formatting based on field
    switch (field) {
      case 'legal_entity_id':
        formattedValue = formatLegalEntityId(value);
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

  const handleTierChange = (value: string | null) => {
    if (value) {
      const tierNumber = Number(value);
      let method = 'EmailVerification';

      if (tierNumber === 1) {
        method = 'eHerkenning';
      } else if (tierNumber === 2) {
        method = 'DNS';
      }

      setFormData((prev) => ({
        ...prev,
        authentication_tier: tierNumber,
        authentication_method: method,
      }));
      setIsDirty(true);
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
      const sanitizedData = sanitizeFormData(
        formData as unknown as Record<string, unknown>
      ) as unknown as MemberFormData;
      await onSubmit(sanitizedData);
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
        setFormData(DEFAULT_FORM_DATA);
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

  return {
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
  };
};
