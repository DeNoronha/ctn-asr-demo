/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user inputs and HTML content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe rendering
 * Removes potentially dangerous HTML/JavaScript while preserving safe formatting
 */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span'],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize plain text input (removes all HTML tags)
 * Use for form inputs that should never contain HTML
 */
export const sanitizeText = (input: string | null | undefined): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize grid cell content for safe display
 * More permissive than sanitizeText but still safe
 */
export const sanitizeGridCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return sanitizeHtml(str);
};

/**
 * Sanitize an entire form object
 * Recursively sanitizes all string values in an object
 */
export const sanitizeFormData = <T extends Record<string, unknown>>(data: T): T => {
  const sanitized = { ...data };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as T[Extract<keyof T, string>];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeFormData(value as Record<string, unknown>) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) :
        (item && typeof item === 'object' ? sanitizeFormData(item as Record<string, unknown>) : item)
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
};
