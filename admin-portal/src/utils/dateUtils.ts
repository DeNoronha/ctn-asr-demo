/**
 * Date formatting utilities with automatic locale detection and timezone awareness
 */

import { logger } from './logger';

/**
 * Get the user's preferred locale from browser settings
 * Falls back to 'en-GB' for European context
 */
export const getUserLocale = (): string => {
  return navigator.language || 'en-GB';
};

/**
 * Get the user's timezone (e.g., 'Europe/Amsterdam')
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Format a date string or Date object to localized date string
 * @param date - Date string (ISO format with Z for UTC) or Date object
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in user's locale and timezone
 */
export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) {
    logger.error('Invalid date in formatDate', { input: typeof date === 'string' ? date : 'Date object' });
    return 'Invalid Date';
  }

  const locale = getUserLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: getUserTimezone(),
    ...options,
  };

  return dateObj.toLocaleDateString(locale, defaultOptions);
};

/**
 * Format a date with time included (shows timezone-aware time)
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date and time string in user's locale and timezone
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) {
    logger.error('Invalid date in formatDate', { input: typeof date === 'string' ? date : 'Date object' });
    return 'Invalid Date';
  }

  const locale = getUserLocale();
  const timezone = getUserTimezone();

  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
};

/**
 * Format only the time portion of a date
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted time string in user's locale and timezone
 */
export const formatTime = (date: string | Date): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) {
    logger.error('Invalid date in formatTime', { input: typeof date === 'string' ? date : 'Date object' });
    return 'Invalid Time';
  }

  const locale = getUserLocale();
  const timezone = getUserTimezone();

  return dateObj.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - Date string (ISO format) or Date object
 * @returns Relative time string in user's locale
 */
export const getRelativeTime = (date: string | Date): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) {
    logger.error('Invalid date in getRelativeTime', { input: typeof date === 'string' ? date : 'Date object' });
    return 'Invalid Date';
  }

  const locale = getUserLocale();
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Use Intl.RelativeTimeFormat for localized relative time
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day');
  }
  // For dates more than 30 days away, show absolute date
  return formatDate(dateObj);
};

/**
 * Format a number as currency in user's locale
 * @param amount - Numeric amount
 * @param currency - Currency code (default: EUR)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'EUR'): string => {
  const locale = getUserLocale();

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};
