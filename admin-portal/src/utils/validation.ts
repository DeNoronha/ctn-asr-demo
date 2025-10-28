// validation.ts - Form validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface MemberFormData {
  org_id: string;
  legal_name: string;
  domain: string;
  lei?: string;
  kvk?: string;
  authentication_tier?: number;
  authentication_method?: string;
}

export const validateMemberForm = (data: MemberFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  // Organization ID validation
  if (!data.org_id.trim()) {
    errors.org_id = 'Organization ID is required';
  } else if (!data.org_id.startsWith('org:')) {
    errors.org_id = 'Organization ID must start with "org:"';
  } else if (data.org_id.length < 5) {
    errors.org_id = 'Organization ID is too short';
  } else if (!/^org:[a-z0-9-]+$/.test(data.org_id)) {
    errors.org_id = 'Organization ID can only contain lowercase letters, numbers, and hyphens';
  }

  // Legal name validation
  if (!data.legal_name.trim()) {
    errors.legal_name = 'Legal name is required';
  } else if (data.legal_name.length < 2) {
    errors.legal_name = 'Legal name must be at least 2 characters';
  } else if (data.legal_name.length > 200) {
    errors.legal_name = 'Legal name is too long (max 200 characters)';
  }

  // Domain validation
  if (!data.domain.trim()) {
    errors.domain = 'Domain is required';
  } else if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(data.domain)) {
    errors.domain = 'Please enter a valid domain (e.g., company.com)';
  }

  // LEI validation (optional but must be valid if provided)
  if (data.lei?.trim()) {
    if (!/^[A-Z0-9]{20}$/.test(data.lei)) {
      errors.lei = 'LEI must be exactly 20 alphanumeric characters';
    }
  }

  // KVK validation (optional but must be valid if provided)
  if (data.kvk?.trim()) {
    if (!/^\d{8}$/.test(data.kvk)) {
      errors.kvk = 'KVK number must be exactly 8 digits';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const formatOrgId = (value: string): string => {
  let formatted = value.toLowerCase().trim();
  if (!formatted.startsWith('org:')) {
    formatted = `org:${formatted}`;
  }
  // Remove invalid characters
  formatted = formatted.replace(/[^a-z0-9:-]/g, '');
  return formatted;
};

export const formatDomain = (value: string): string => {
  return value.toLowerCase().trim();
};

export const formatLEI = (value: string): string => {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '');
};

export const formatKVK = (value: string): string => {
  return value.trim().replace(/[^0-9]/g, '');
};
