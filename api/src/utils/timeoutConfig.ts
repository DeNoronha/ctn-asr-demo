/**
 * Centralized timeout configuration for external API calls
 */

export const TIMEOUT_CONFIG = {
  /**
   * Azure Blob Storage operations (upload, download, delete)
   * Default: 60 seconds
   */
  BLOB_STORAGE_MS: parseInt(process.env.BLOB_STORAGE_TIMEOUT_MS || '60000'),

  /**
   * Azure Document Intelligence analysis
   * Default: 5 minutes (document processing can be slow)
   */
  DOCUMENT_INTELLIGENCE_MS: parseInt(process.env.DOCUMENT_INTELLIGENCE_TIMEOUT_MS || '300000'),

  /**
   * Azure Communication Services (email sending)
   * Default: 30 seconds
   */
  COMMUNICATION_SERVICES_MS: parseInt(process.env.COMMUNICATION_SERVICES_TIMEOUT_MS || '30000'),

  /**
   * Event Grid publish operations
   * Default: 10 seconds
   */
  EVENT_GRID_MS: parseInt(process.env.EVENT_GRID_TIMEOUT_MS || '10000'),

  /**
   * General HTTP client timeout (for external APIs)
   * Default: 30 seconds
   */
  HTTP_CLIENT_MS: parseInt(process.env.HTTP_CLIENT_TIMEOUT_MS || '30000'),
} as const;

/**
 * Create AbortSignal with timeout
 * @param timeoutMs Timeout in milliseconds
 * @returns AbortSignal that will abort after timeout
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Wrap a promise with a timeout
 * @param promise Promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Error message if timeout occurs
 * @returns Promise that rejects after timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}
