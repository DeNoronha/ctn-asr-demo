/**
 * Safe Array Utilities (CR-002)
 * Provides null-safe wrappers for array operations
 * Prevents "Cannot read property 'map' of undefined" errors
 */

/**
 * Safely map over an array, returning empty array if input is null/undefined
 */
export function safeMap<T, U>(
  array: T[] | null | undefined,
  callback: (item: T, index: number, array: T[]) => U
): U[] {
  return array?.map(callback) ?? [];
}

/**
 * Safely filter an array, returning empty array if input is null/undefined
 */
export function safeFilter<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number, array: T[]) => boolean
): T[] {
  return array?.filter(predicate) ?? [];
}

/**
 * Safely find in an array, returning undefined if input is null/undefined
 */
export function safeFind<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  return array?.find(predicate);
}

/**
 * Safely check array length, returning 0 if input is null/undefined
 */
export function safeLength<T>(array: T[] | null | undefined): number {
  return array?.length ?? 0;
}

/**
 * Safely check if array has elements
 */
export function hasElements<T>(array: T[] | null | undefined): boolean {
  return (array?.length ?? 0) > 0;
}

/**
 * Safely get array or return empty array
 */
export function safeArray<T>(array: T[] | null | undefined): T[] {
  return array ?? [];
}

/**
 * Safely reduce an array with initial value
 */
export function safeReduce<T, U>(
  array: T[] | null | undefined,
  callback: (accumulator: U, item: T, index: number, array: T[]) => U,
  initialValue: U
): U {
  return array?.reduce(callback, initialValue) ?? initialValue;
}

/**
 * Safely check if any element matches predicate
 */
export function safeSome<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number, array: T[]) => boolean
): boolean {
  return array?.some(predicate) ?? false;
}

/**
 * Safely check if all elements match predicate
 */
export function safeEvery<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number, array: T[]) => boolean
): boolean {
  return array?.every(predicate) ?? true; // Return true for empty arrays (vacuous truth)
}

/**
 * Safely format a date string, returning fallback for null/undefined/invalid dates
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  fallback = 'N/A'
): string {
  if (!dateString) return fallback;

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * Safely access nested property with optional chaining fallback
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined {
  return obj?.[key];
}

/**
 * Safely access nested property with default value
 */
export function safeGetWithDefault<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj?.[key] ?? defaultValue;
}
