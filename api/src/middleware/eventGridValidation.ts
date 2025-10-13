// ========================================
// EventGrid Signature Validation Middleware
// ========================================
// Validates EventGrid webhook requests using signature validation
// Prevents unauthorized events from being processed

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import crypto from 'crypto';

/**
 * EventGrid authentication types
 */
export enum EventGridAuthType {
  ACCESS_KEY = 'access_key',
  SAS_TOKEN = 'sas_token',
}

/**
 * Validate EventGrid webhook request
 * Checks for aeg-sas-token or aeg-sas-key headers
 */
export async function validateEventGridSignature(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get EventGrid access key from environment
    const accessKey = process.env.EVENT_GRID_ACCESS_KEY;

    if (!accessKey) {
      context.warn('EVENT_GRID_ACCESS_KEY not configured - skipping validation');
      // In development, allow without validation if not configured
      if (process.env.NODE_ENV === 'development') {
        return { valid: true };
      }
      return { valid: false, error: 'EventGrid access key not configured' };
    }

    // Check for SAS key (shared access signature key)
    const sasKey = request.headers.get('aeg-sas-key');
    if (sasKey) {
      context.log('Validating EventGrid request with SAS key');

      // Compare provided key with configured key
      if (sasKey === accessKey) {
        context.log('EventGrid SAS key validation successful');
        return { valid: true };
      } else {
        context.warn('EventGrid SAS key validation failed');
        return { valid: false, error: 'Invalid SAS key' };
      }
    }

    // Check for SAS token
    const sasToken = request.headers.get('aeg-sas-token');
    if (sasToken) {
      context.log('Validating EventGrid request with SAS token');

      // Parse SAS token parameters
      const tokenValid = validateSasToken(sasToken, request.url, accessKey, context);

      if (tokenValid) {
        context.log('EventGrid SAS token validation successful');
        return { valid: true };
      } else {
        context.warn('EventGrid SAS token validation failed');
        return { valid: false, error: 'Invalid SAS token' };
      }
    }

    // Check for subscription validation (first-time webhook setup)
    const body = await request.text();
    const events = JSON.parse(body);

    if (events[0]?.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent') {
      context.log('Subscription validation event - allowing without signature');
      return { valid: true };
    }

    // No authentication header found
    context.warn('No EventGrid authentication header found');
    return { valid: false, error: 'Missing authentication header (aeg-sas-key or aeg-sas-token)' };
  } catch (error) {
    context.error('Error validating EventGrid signature:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate SAS token
 * SAS tokens have format: sig=<signature>&se=<expiry>
 */
function validateSasToken(
  token: string,
  url: string,
  accessKey: string,
  context: InvocationContext
): boolean {
  try {
    // Parse token parameters
    const params = new URLSearchParams(token);
    const signature = params.get('sig');
    const expiry = params.get('se');

    if (!signature || !expiry) {
      context.warn('SAS token missing required parameters');
      return false;
    }

    // Check expiry
    const expiryTime = parseInt(expiry, 10);
    const currentTime = Math.floor(Date.now() / 1000);

    if (expiryTime < currentTime) {
      context.warn('SAS token expired');
      return false;
    }

    // Validate signature
    const stringToSign = `${url}\n${expiry}`;
    const expectedSignature = crypto
      .createHmac('sha256', accessKey)
      .update(stringToSign)
      .digest('base64');

    // Compare signatures (constant-time comparison)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    context.error('Error parsing SAS token:', error);
    return false;
  }
}

/**
 * EventGrid validation middleware wrapper
 * Automatically validates EventGrid webhook requests
 */
export function withEventGridValidation<T extends (...args: any[]) => Promise<HttpResponseInit>>(
  handler: T
): T {
  return (async (request: HttpRequest, context: InvocationContext, ...args: any[]) => {
    // Validate EventGrid signature
    const validation = await validateEventGridSignature(request, context);

    if (!validation.valid) {
      context.error('EventGrid validation failed:', validation.error);
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'unauthorized',
          error_description: validation.error || 'EventGrid signature validation failed',
        }),
      };
    }

    // Call the actual handler
    return handler(request, context, ...args);
  }) as T;
}

/**
 * Generate SAS token for EventGrid webhook URL
 * Used for programmatic webhook registration
 */
export function generateEventGridSasToken(
  webhookUrl: string,
  accessKey: string,
  expiryHours: number = 24
): string {
  const expiry = Math.floor(Date.now() / 1000) + expiryHours * 3600;
  const stringToSign = `${webhookUrl}\n${expiry}`;

  const signature = crypto
    .createHmac('sha256', accessKey)
    .update(stringToSign)
    .digest('base64');

  return `sig=${encodeURIComponent(signature)}&se=${expiry}`;
}

/**
 * Validate EventGrid event schema
 * Ensures events have required fields
 */
export function validateEventGridSchema(event: any): { valid: boolean; error?: string } {
  if (!event.id) {
    return { valid: false, error: 'Missing event.id' };
  }

  if (!event.eventType) {
    return { valid: false, error: 'Missing event.eventType' };
  }

  if (!event.subject) {
    return { valid: false, error: 'Missing event.subject' };
  }

  if (!event.eventTime) {
    return { valid: false, error: 'Missing event.eventTime' };
  }

  if (!event.data) {
    return { valid: false, error: 'Missing event.data' };
  }

  if (!event.dataVersion && !event.metadataVersion) {
    return { valid: false, error: 'Missing event.dataVersion or event.metadataVersion' };
  }

  return { valid: true };
}
