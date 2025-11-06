// ========================================
// Zod Validation Schemas
// ========================================
// Comprehensive input validation for all API endpoints

import { z } from 'zod';

// ========================================
// Common/Primitive Types
// ========================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL format');

export const dateSchema = z.string().datetime('Invalid date format (ISO 8601 required)');

export const kvkNumberSchema = z
  .string()
  .regex(/^\d{8}$/, 'KvK number must be exactly 8 digits')
  .length(8);

export const leiSchema = z
  .string()
  .regex(/^[A-Z0-9]{20}$/, 'LEI must be exactly 20 alphanumeric characters')
  .length(20);

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)');

export const postalCodeSchema = z.string().regex(/^\d{4}\s?[A-Z]{2}$/, 'Invalid Dutch postal code');

// ========================================
// Legal Entity Validation
// ========================================

export const createLegalEntitySchema = z.object({
  legal_name: z.string().min(1, 'Legal name is required').max(255),
  org_id: z.string().min(1, 'Organization ID is required').max(100),
  lei: leiSchema.optional(),
  kvk: kvkNumberSchema.optional(),
  domain: z.string().min(3, 'Domain is required').max(255),
  membership_level: z.enum(['BASIC', 'FULL', 'PREMIUM']).optional(),
  primary_legal_name: z.string().optional(),
  entity_legal_form: z.string().optional(),
});

export const updateLegalEntitySchema = createLegalEntitySchema.partial();

// ========================================
// Contact Validation
// ========================================

export const createContactSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: emailSchema,
  job_title: z.string().max(100).optional(),
  phone_number: phoneSchema.optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const updateContactSchema = createContactSchema.partial();

// ========================================
// Endpoint Validation
// ========================================

export const createEndpointSchema = z.object({
  endpoint_name: z.string().min(1, 'Endpoint name is required').max(255),
  endpoint_url: urlSchema,
  endpoint_description: z.string().max(500).optional(),
  data_category: z
    .enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST'])
    .default('PRODUCTION'),
  endpoint_type: z.enum(['REST_API', 'SOAP', 'GRAPHQL', 'WEBHOOK']).default('REST_API'),
  is_active: z.boolean().default(true),
});

export const updateEndpointSchema = createEndpointSchema.partial();

// ========================================
// Token Validation
// ========================================

export const issueTokenSchema = z.object({
  token_name: z.string().min(1, 'Token name is required').max(255),
  expires_at: dateSchema.optional(),
  scopes: z.array(z.string()).optional(),
});


// ========================================
// Task Validation
// ========================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  task_type: z.enum(['KVK_REVIEW', 'MEMBER_APPROVAL', 'SUPPORT_TICKET', 'GENERAL']).default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  assigned_to: emailSchema.optional(),
  due_date: dateSchema.optional(),
  related_entity_id: uuidSchema.optional(),
  related_entity_type: z.enum(['MEMBER', 'KVK_VERIFICATION']).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ========================================
// KvK Verification Validation
// ========================================

export const reviewKvkVerificationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']),
  reviewer_notes: z.string().max(1000).optional(),
  flagged_reason: z.string().max(255).optional(),
});

// ========================================
// Query Parameter Validation
// ========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export const filterSchema = z.object({
  status: z.string().optional(),
  membership_level: z.string().optional(),
  search: z.string().optional(),
  created_after: dateSchema.optional(),
  created_before: dateSchema.optional(),
});

// ========================================
// File Upload Validation
// ========================================

export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.enum(['application/pdf'], {
    errorMap: () => ({ message: 'Only PDF files are allowed' }),
  }),
  size: z.number().positive().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
});

// ========================================
// Member Profile Update Validation
// ========================================

export const updateMemberProfileSchema = z.object({
  domain: z.string().min(3).max(255).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  postal_code: postalCodeSchema.optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  country_code: z.string().length(2, 'Country code must be 2 letters (ISO 3166-1 alpha-2)').optional(),
});

// ========================================
// Validation Error Response
// ========================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}
