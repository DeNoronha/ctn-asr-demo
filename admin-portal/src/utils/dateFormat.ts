/**
 * Date Formatting Utilities
 * Provides consistent date formatting across the application
 */

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateGB = (date: string | Date | null | undefined): string => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTimeGB = (date: string | Date | null | undefined): string => {
  if (!date) return '-';

  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
