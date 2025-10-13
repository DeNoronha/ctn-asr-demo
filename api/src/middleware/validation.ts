// ========================================
// Input Validation Middleware
// ========================================
// Zod-based validation for request body, query params, and path params

import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { AuthenticatedRequest } from './auth';
import { formatZodError } from '../validation/schemas';

/**
 * Validate request body against a Zod schema
 * @param request Authenticated request
 * @param schema Zod schema to validate against
 * @param context Invocation context for logging
 * @returns Validation result with typed data or error response
 */
export async function validateBody<T extends z.ZodType>(
  request: AuthenticatedRequest,
  schema: T,
  context: InvocationContext
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: any }
> {
  try {
    // Parse request body
    let body: any;

    if (request.json) {
      try {
        body = await request.json();
      } catch (error) {
        context.error('Failed to parse JSON body:', error);
        return {
          success: false,
          response: {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'invalid_request',
              error_description: 'Invalid JSON in request body',
            }),
          },
        };
      }
    } else {
      return {
        success: false,
        response: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'invalid_request',
            error_description: 'Request body is required',
          }),
        },
      };
    }

    // Validate against schema
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = formatZodError(result.error);
      context.warn('Validation failed:', errors);

      return {
        success: false,
        response: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'validation_error',
            error_description: 'Request body validation failed',
            validation_errors: errors,
          }),
        },
      };
    }

    context.log('Body validation passed');
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    context.error('Unexpected validation error:', error);
    return {
      success: false,
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'internal_server_error',
          error_description: 'Validation error',
        }),
      },
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 * @param request Authenticated request
 * @param schema Zod schema to validate against
 * @param context Invocation context for logging
 * @returns Validation result with typed data or error response
 */
export function validateQuery<T extends z.ZodType>(
  request: AuthenticatedRequest,
  schema: T,
  context: InvocationContext
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: any } {
  try {
    // Convert URLSearchParams to object
    const queryObj: Record<string, any> = {};
    request.query.forEach((value, key) => {
      // Handle array parameters (e.g., ?tags=a&tags=b)
      if (queryObj[key]) {
        if (Array.isArray(queryObj[key])) {
          queryObj[key].push(value);
        } else {
          queryObj[key] = [queryObj[key], value];
        }
      } else {
        queryObj[key] = value;
      }
    });

    // Validate against schema
    const result = schema.safeParse(queryObj);

    if (!result.success) {
      const errors = formatZodError(result.error);
      context.warn('Query validation failed:', errors);

      return {
        success: false,
        response: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'validation_error',
            error_description: 'Query parameters validation failed',
            validation_errors: errors,
          }),
        },
      };
    }

    context.log('Query validation passed');
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    context.error('Unexpected query validation error:', error);
    return {
      success: false,
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'internal_server_error',
          error_description: 'Query validation error',
        }),
      },
    };
  }
}

/**
 * Validate path parameters against a Zod schema
 * @param request Authenticated request
 * @param schema Zod schema to validate against
 * @param context Invocation context for logging
 * @returns Validation result with typed data or error response
 */
export function validateParams<T extends z.ZodType>(
  request: AuthenticatedRequest,
  schema: T,
  context: InvocationContext
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: any } {
  try {
    // Validate against schema
    const result = schema.safeParse(request.params);

    if (!result.success) {
      const errors = formatZodError(result.error);
      context.warn('Path params validation failed:', errors);

      return {
        success: false,
        response: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'validation_error',
            error_description: 'Path parameters validation failed',
            validation_errors: errors,
          }),
        },
      };
    }

    context.log('Path params validation passed');
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    context.error('Unexpected params validation error:', error);
    return {
      success: false,
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'internal_server_error',
          error_description: 'Path params validation error',
        }),
      },
    };
  }
}

/**
 * Validate file upload
 * @param file File object with filename, mimetype, size
 * @param schema Zod schema to validate against
 * @param context Invocation context for logging
 * @returns Validation result
 */
export function validateFile<T extends z.ZodType>(
  file: any,
  schema: T,
  context: InvocationContext
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: any } {
  try {
    const result = schema.safeParse(file);

    if (!result.success) {
      const errors = formatZodError(result.error);
      context.warn('File validation failed:', errors);

      return {
        success: false,
        response: {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'validation_error',
            error_description: 'File validation failed',
            validation_errors: errors,
          }),
        },
      };
    }

    context.log('File validation passed');
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    context.error('Unexpected file validation error:', error);
    return {
      success: false,
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'internal_server_error',
          error_description: 'File validation error',
        }),
      },
    };
  }
}
