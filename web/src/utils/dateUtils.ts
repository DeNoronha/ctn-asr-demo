/**
 * Date formatting utilities with automatic locale detection
 */

/**
 * Get the user's preferred locale from browser settings
 * Falls back to 'en-US' if not available
 */
export const getUserLocale = (): string => {
  return navigator.language || 'en-US';
};

/**
 * Format a date string or Date object to localized date string
 * @param date - Date string (ISO format) or Date object
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in user's locale
 */
export const formatDate = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getUserLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return dateObj.toLocaleDateString(locale, defaultOptions);
};

/**
 * Format a date with time included
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date and time string in user's locale
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getUserLocale();

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number as currency in user's locale
 * @param amount - Numeric amount
 * @param currency - Currency code (default: EUR)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const locale = getUserLocale();

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};
